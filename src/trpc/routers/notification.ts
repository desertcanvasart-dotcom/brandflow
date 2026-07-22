import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import type { Database, Json } from '@/types/database'
import { testSlackWebhook } from '@/lib/notifications/slack'
import { executeNotificationAction } from '@/lib/notifications/actions'
import type { NotificationActionType } from '@/types/enums'
import crypto from 'crypto'
import { logActivity } from '@/lib/activity/log'

type NotificationRow = Database['public']['Tables']['notifications']['Row']
type PrefRow = Database['public']['Tables']['notification_preferences']['Row']
type QuietHoursRow = Database['public']['Tables']['notification_quiet_hours']['Row']
type IntegrationRow = Database['public']['Tables']['organization_integrations']['Row']

export const notificationRouter = createTRPCRouter({
  // ── List notifications (with optional grouping) ─────────────
  list: orgProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(20),
      unreadOnly: z.boolean().optional().default(false),
      isArchived: z.boolean().optional().default(false),
      grouped: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      let query = ctx.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .eq('is_archived', input?.isArchived ?? false)
        .order('created_at', { ascending: false })
        .limit(limit + 1)

      if (input?.unreadOnly) {
        query = query.eq('is_read', false)
      }

      if (input?.cursor) {
        query = query.lt('created_at', input.cursor)
      }

      const { data } = await query.returns<NotificationRow[]>()
      const items = data ?? []
      const hasMore = items.length > limit
      const trimmed = hasMore ? items.slice(0, limit) : items

      // Group by group_key if requested
      if (input?.grouped) {
        const grouped = groupNotifications(trimmed)
        return {
          items: grouped,
          nextCursor: hasMore ? trimmed[trimmed.length - 1]?.created_at : undefined,
        }
      }

      return {
        items: trimmed.map((n) => ({ ...n, groupCount: 1 })),
        nextCursor: hasMore ? trimmed[trimmed.length - 1]?.created_at : undefined,
      }
    }),

  // ── Search notifications ────────────────────────────────────
  search: orgProcedure
    .input(z.object({
      query: z.string().optional(),
      types: z.array(z.string()).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      isRead: z.boolean().optional(),
      isArchived: z.boolean().optional().default(false),
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 20
      let query = ctx.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .eq('is_archived', input.isArchived ?? false)
        .order('created_at', { ascending: false })
        .limit(limit + 1)

      if (input.query) {
        // Use ilike for basic search (textSearch requires exact GIN setup)
        query = query.or(`title.ilike.%${input.query}%,body.ilike.%${input.query}%`)
      }

      if (input.types?.length) {
        query = query.in('type', input.types)
      }

      if (input.dateFrom) {
        query = query.gte('created_at', input.dateFrom)
      }

      if (input.dateTo) {
        query = query.lte('created_at', input.dateTo)
      }

      if (input.isRead !== undefined) {
        query = query.eq('is_read', input.isRead)
      }

      if (input.cursor) {
        query = query.lt('created_at', input.cursor)
      }

      const { data } = await query.returns<NotificationRow[]>()
      const items = data ?? []
      const hasMore = items.length > limit
      const trimmed = hasMore ? items.slice(0, limit) : items

      return {
        items: trimmed.map((n) => ({ ...n, groupCount: 1 })),
        nextCursor: hasMore ? trimmed[trimmed.length - 1]?.created_at : undefined,
      }
    }),

  // ── Unread count ────────────────────────────────────────────
  unreadCount: orgProcedure
    .query(async ({ ctx }) => {
      const { count } = await ctx.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .eq('is_read', false)
        .eq('is_archived', false)

      return count ?? 0
    }),

  // ── Mark as read ────────────────────────────────────────────
  markAsRead: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      return { success: true }
    }),

  // ── Mark all as read ────────────────────────────────────────
  markAllAsRead: orgProcedure
    .mutation(async ({ ctx }) => {
      await ctx.supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .eq('is_read', false)

      return { success: true }
    }),

  // ── Delete notification ─────────────────────────────────────
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('notifications')
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      return { success: true }
    }),

  // ── Archive / Unarchive ─────────────────────────────────────
  archive: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('notifications')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      return { success: true }
    }),

  unarchive: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('notifications')
        .update({ is_archived: false, archived_at: null })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)

      return { success: true }
    }),

  // ── Execute in-notification action ──────────────────────────
  executeAction: orgProcedure
    .input(z.object({
      notificationId: z.string().uuid(),
      actionType: z.enum(['approve_task', 'reject_task', 'mark_complete', 'acknowledge']),
    }))
    .mutation(async ({ ctx, input }) => {
      return executeNotificationAction(
        input.notificationId,
        ctx.user.id,
        input.actionType as NotificationActionType
      )
    }),

  // ── Preferences ─────────────────────────────────────────────
  getPreferences: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .returns<PrefRow[]>()

      return data ?? []
    }),

  updatePreference: orgProcedure
    .input(z.object({
      eventType: z.string(),
      inApp: z.boolean(),
      email: z.boolean(),
      push: z.boolean(),
      slack: z.boolean(),
      webhook: z.boolean(),
      digestFrequency: z.enum(['none', 'daily', 'weekly']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('notification_preferences')
        .upsert(
          {
            organization_id: ctx.orgId,
            user_id: ctx.user.id,
            event_type: input.eventType,
            in_app: input.inApp,
            email: input.email,
            push: input.push,
            slack: input.slack,
            webhook: input.webhook,
            digest_frequency: input.digestFrequency ?? 'none',
          },
          { onConflict: 'organization_id,user_id,event_type' }
        )
        .select()
        .single<PrefRow>()

      if (error) {
        console.error('[notification] Failed to upsert preference:', error)
      }
      return data
    }),

  // ── Push subscription management ────────────────────────────
  subscribePush: orgProcedure
    .input(z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('push_subscriptions')
        .upsert(
          {
            organization_id: ctx.orgId,
            user_id: ctx.user.id,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            user_agent: input.userAgent ?? null,
          },
          { onConflict: 'user_id,endpoint' }
        )

      if (error) {
        console.error('[push] Failed to subscribe:', error)
        throw new Error('Failed to save push subscription')
      }

      return { success: true }
    }),

  unsubscribePush: orgProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', ctx.user.id)
        .eq('endpoint', input.endpoint)

      return { success: true }
    }),

  // ── Quiet hours ─────────────────────────────────────────────
  getQuietHours: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('notification_quiet_hours')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .maybeSingle()
        .returns<QuietHoursRow | null>()

      return data ?? {
        is_enabled: false,
        start_time: '22:00',
        end_time: '08:00',
        timezone: 'UTC',
        active_days: ['mon', 'tue', 'wed', 'thu', 'fri'] as string[],
      }
    }),

  updateQuietHours: orgProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string(),
      activeDays: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('notification_quiet_hours')
        .upsert(
          {
            organization_id: ctx.orgId,
            user_id: ctx.user.id,
            is_enabled: input.isEnabled,
            start_time: input.startTime,
            end_time: input.endTime,
            timezone: input.timezone,
            active_days: input.activeDays ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
          },
          { onConflict: 'organization_id,user_id' }
        )
        .select()
        .single<QuietHoursRow>()

      if (error) {
        console.error('[quiet-hours] Failed to update:', error)
      }
      return data
    }),

  // ── Organization integrations (Slack, Webhooks) ─────────────
  getIntegrations: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('organization_integrations')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .returns<IntegrationRow[]>()

      return data ?? []
    }),

  upsertIntegration: adminProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      type: z.enum(['slack', 'webhook']),
      name: z.string().min(1),
      config: z.record(z.string(), z.unknown()),
      isActive: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        // Update existing
        const { data, error } = await ctx.supabase
          .from('organization_integrations')
          .update({
            name: input.name,
            config: input.config as Json,
            is_active: input.isActive,
          })
          .eq('id', input.id)
          .eq('organization_id', ctx.orgId)
          .select()
          .single<IntegrationRow>()

        if (error) throw new Error('Failed to update integration')
        return data
      }

      // Insert new
      const { data, error } = await ctx.supabase
        .from('organization_integrations')
        .insert({
          organization_id: ctx.orgId,
          type: input.type,
          name: input.name,
          config: input.config as Json,
          is_active: input.isActive,
          created_by: ctx.user.id,
        })
        .select()
        .single<IntegrationRow>()

      if (error) throw new Error('Failed to create integration')

      // Audit log
      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'integration_connected',
        entityType: 'integration',
        entityId: data.id,
        metadata: { type: input.type, name: input.name },
      })

      return data
    }),

  deleteIntegration: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from('organization_integrations')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      // Audit log
      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'integration_disconnected',
        entityType: 'integration',
        entityId: input.id,
      })

      return { success: true }
    }),

  testSlack: adminProcedure
    .input(z.object({ webhookUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const ok = await testSlackWebhook(input.webhookUrl)
      return { success: ok }
    }),

  generateWebhookSecret: adminProcedure
    .mutation(async () => {
      const secret = crypto.randomBytes(32).toString('hex')
      return { secret }
    }),

  // ── Analytics (admin only) ──────────────────────────────────
  analytics: adminProcedure
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Get notification events within date range for org's notifications
      const { data: events } = await ctx.supabase
        .from('notification_events')
        .select(`
          channel,
          event,
          created_at
        `)
        .gte('created_at', input.dateFrom)
        .lte('created_at', input.dateTo)
        .order('created_at', { ascending: true })

      if (!events?.length) {
        return {
          totalSent: 0,
          byChannel: {},
          deliveryRate: 0,
          clickRate: 0,
          dailyTrend: [],
        }
      }

      // Aggregate by channel
      const byChannel: Record<string, { delivered: number; failed: number; clicked: number; opened: number }> = {}
      const dailyMap: Record<string, Record<string, number>> = {}

      for (const e of events) {
        // By channel
        if (!byChannel[e.channel]) {
          byChannel[e.channel] = { delivered: 0, failed: 0, clicked: 0, opened: 0 }
        }
        if (e.event === 'delivered') byChannel[e.channel].delivered++
        if (e.event === 'failed') byChannel[e.channel].failed++
        if (e.event === 'clicked') byChannel[e.channel].clicked++
        if (e.event === 'opened') byChannel[e.channel].opened++

        // Daily trend
        const day = e.created_at.split('T')[0]
        if (!dailyMap[day]) dailyMap[day] = {}
        dailyMap[day][e.channel] = (dailyMap[day][e.channel] ?? 0) + 1
      }

      const totalDelivered = Object.values(byChannel).reduce((s, c) => s + c.delivered, 0)
      const totalFailed = Object.values(byChannel).reduce((s, c) => s + c.failed, 0)
      const totalClicked = Object.values(byChannel).reduce((s, c) => s + c.clicked, 0)

      return {
        totalSent: totalDelivered + totalFailed,
        byChannel,
        deliveryRate: totalDelivered + totalFailed > 0
          ? Math.round((totalDelivered / (totalDelivered + totalFailed)) * 100)
          : 0,
        clickRate: totalDelivered > 0
          ? Math.round((totalClicked / totalDelivered) * 100)
          : 0,
        dailyTrend: Object.entries(dailyMap).map(([date, channels]) => ({
          date,
          ...channels,
        })),
      }
    }),
})

// ── Grouping helper ─────────────────────────────────────────
function groupNotifications(
  items: NotificationRow[]
): (NotificationRow & { groupCount: number })[] {
  const grouped: (NotificationRow & { groupCount: number })[] = []
  const groupMap = new Map<string, number>() // group_key -> index in grouped[]

  for (const item of items) {
    if (item.group_key) {
      const existing = groupMap.get(item.group_key)
      if (existing !== undefined) {
        grouped[existing].groupCount++
        continue
      }
      groupMap.set(item.group_key, grouped.length)
    }
    grouped.push({ ...item, groupCount: 1 })
  }

  return grouped
}
