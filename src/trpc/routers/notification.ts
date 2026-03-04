import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']
type PrefRow = Database['public']['Tables']['notification_preferences']['Row']

export const notificationRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(20),
      unreadOnly: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      let query = ctx.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
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

      return {
        items: trimmed,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]?.created_at : undefined,
      }
    }),

  unreadCount: orgProcedure
    .query(async ({ ctx }) => {
      const { count } = await ctx.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .eq('is_read', false)

      return count ?? 0
    }),

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
})
