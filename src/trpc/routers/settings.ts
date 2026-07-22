import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import type { Database } from '@/types/database'
import crypto from 'crypto'

type MemberRow = Database['public']['Tables']['organization_members']['Row']
type ApiKeyRow = Database['public']['Tables']['api_keys']['Row']
type WebhookLogRow = Database['public']['Tables']['webhook_delivery_logs']['Row']
type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row']
type AuditLogEntry = ActivityLogRow & {
  organization_members: { display_name: string; avatar_url: string | null } | null
}

export const settingsRouter = createTRPCRouter({
  // ── Profile (self-editing) ──────────────────────────────────
  getProfile: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .eq('user_id', ctx.user.id)
        .single<MemberRow>()

      // Get email from auth user
      return {
        ...data,
        email: ctx.user.email,
      }
    }),

  updateProfile: orgProcedure
    .input(z.object({
      displayName: z.string().min(1).max(100).optional(),
      avatarUrl: z.string().optional(),
      timezone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.displayName !== undefined) updates.display_name = input.displayName
      if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl
      if (input.timezone !== undefined) updates.timezone = input.timezone

      const { data, error } = await ctx.supabase
        .from('organization_members')
        .update(updates)
        .eq('organization_id', ctx.orgId)
        .eq('user_id', ctx.user.id)
        .select()
        .single()

      if (error) throw error
      return data
    }),

  changeEmail: orgProcedure
    .input(z.object({ newEmail: z.email() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({
        email: input.newEmail,
      })
      if (error) throw new Error(error.message)
      return { success: true, message: 'Check your new email to confirm the change' }
    }),

  changePassword: orgProcedure
    .input(z.object({ newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.auth.updateUser({
        password: input.newPassword,
      })
      if (error) throw new Error(error.message)
      return { success: true }
    }),

  // ── API Keys ────────────────────────────────────────────────
  generateApiKey: adminProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      // Generate a random key
      const rawKey = `ab_live_${crypto.randomBytes(32).toString('hex')}`
      const keyPrefix = rawKey.substring(0, 16) // "ab_live_" + 8 chars
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

      const { data, error } = await ctx.supabase
        .from('api_keys')
        .insert({
          organization_id: ctx.orgId,
          created_by: ctx.user.id,
          name: input.name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
        })
        .select()
        .single<ApiKeyRow>()

      if (error) throw new Error('Failed to create API key')

      // Return the full key ONCE
      return {
        ...data,
        fullKey: rawKey,
      }
    }),

  listApiKeys: adminProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('api_keys')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .returns<ApiKeyRow[]>()

      // Never return key_hash
      return (data ?? []).map(({ key_hash: _hash, ...rest }) => rest)
    }),

  revokeApiKey: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('api_keys')
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new Error('Failed to revoke API key')
      return { success: true }
    }),

  // ── Webhook Delivery Logs ───────────────────────────────────
  getWebhookDeliveryLogs: adminProcedure
    .input(z.object({
      integrationId: z.string().uuid(),
      limit: z.number().min(1).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('webhook_delivery_logs')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .eq('integration_id', input.integrationId)
        .order('created_at', { ascending: false })
        .limit(input.limit)
        .returns<WebhookLogRow[]>()

      return data ?? []
    }),

  retryWebhookDelivery: adminProcedure
    .input(z.object({ logId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the original log entry
      type LogWithIntegration = WebhookLogRow & {
        organization_integrations: { config: Record<string, unknown> }
      }
      const { data: logEntry } = await ctx.supabase
        .from('webhook_delivery_logs')
        .select('*, organization_integrations!inner(config)')
        .eq('id', input.logId)
        .eq('organization_id', ctx.orgId)
        .single<LogWithIntegration>()

      if (!logEntry) throw new Error('Delivery log not found')

      const config = logEntry.organization_integrations?.config
      const url = config?.endpoint_url as string
      if (!url) throw new Error('Webhook URL not found')

      // Retry the delivery
      const startTime = Date.now()
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry.payload),
          signal: AbortSignal.timeout(10000),
        })

        const responseBody = await response.text()
        const responseTime = Date.now() - startTime

        // Log the retry
        await ctx.supabase.from('webhook_delivery_logs').insert({
          organization_id: ctx.orgId,
          integration_id: logEntry.integration_id,
          event_type: logEntry.event_type,
          payload: logEntry.payload,
          status_code: response.status,
          response_time_ms: responseTime,
          response_body: responseBody.substring(0, 1000),
          attempt_number: (logEntry.attempt_number ?? 0) + 1,
        })

        return { success: response.ok, statusCode: response.status }
      } catch (err) {
        const responseTime = Date.now() - startTime
        await ctx.supabase.from('webhook_delivery_logs').insert({
          organization_id: ctx.orgId,
          integration_id: logEntry.integration_id,
          event_type: logEntry.event_type,
          payload: logEntry.payload,
          error_message: err instanceof Error ? err.message : 'Unknown error',
          response_time_ms: responseTime,
          attempt_number: (logEntry.attempt_number ?? 0) + 1,
        })

        throw new Error('Webhook delivery failed')
      }
    }),

  testWebhook: adminProcedure
    .input(z.object({
      integrationId: z.string().uuid(),
      url: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        organization_id: ctx.orgId,
        data: {
          message: 'This is a test webhook delivery from Agency Beats',
        },
      }

      const startTime = Date.now()
      try {
        const response = await fetch(input.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000),
        })

        const responseBody = await response.text()
        const responseTime = Date.now() - startTime

        // Log the test delivery
        await ctx.supabase.from('webhook_delivery_logs').insert({
          organization_id: ctx.orgId,
          integration_id: input.integrationId,
          event_type: 'test',
          payload: testPayload,
          status_code: response.status,
          response_time_ms: responseTime,
          response_body: responseBody.substring(0, 1000),
          attempt_number: 1,
        })

        return { success: response.ok, statusCode: response.status, responseTime }
      } catch (err) {
        const responseTime = Date.now() - startTime
        await ctx.supabase.from('webhook_delivery_logs').insert({
          organization_id: ctx.orgId,
          integration_id: input.integrationId,
          event_type: 'test',
          payload: testPayload,
          error_message: err instanceof Error ? err.message : 'Unknown error',
          response_time_ms: responseTime,
          attempt_number: 1,
        })

        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          responseTime,
        }
      }
    }),

  // ── Audit Log ───────────────────────────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(200).optional().default(100),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('activity_logs')
        .select('*, organization_members!activity_logs_actor_id_fkey(display_name, avatar_url)')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit(input.limit + 1)

      if (input.cursor) {
        query = query.lt('created_at', input.cursor)
      }

      const { data } = await query.returns<AuditLogEntry[]>()

      const items = data ?? []
      const hasMore = items.length > input.limit
      const trimmed = hasMore ? items.slice(0, input.limit) : items

      return {
        items: trimmed,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]?.created_at : undefined,
      }
    }),

  // ── Google Calendar Connections ─────────────────────────────
  getGoogleCalendarConnections: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('google_calendar_connections')
        .select('id, email_address, display_name, last_synced_at, is_active, created_at')
        .eq('organization_id', ctx.orgId)

      return data ?? []
    }),
})
