import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database } from '@/types/database'

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row']

export const activityRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      cursor: z.string().optional(),
      limit: z.number().min(1).max(50).optional().default(20),
      projectId: z.string().uuid().optional(),
      actorId: z.string().uuid().optional(),
      entityType: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20
      let query = ctx.supabase
        .from('activity_logs')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit(limit + 1)

      if (input?.projectId) {
        query = query.eq('project_id', input.projectId)
      }
      if (input?.actorId) {
        query = query.eq('actor_id', input.actorId)
      }
      if (input?.entityType) {
        query = query.eq('entity_type', input.entityType)
      }
      if (input?.cursor) {
        query = query.lt('created_at', input.cursor)
      }

      const { data } = await query.returns<ActivityLogRow[]>()
      const items = data ?? []
      const hasMore = items.length > limit
      const trimmed = hasMore ? items.slice(0, limit) : items

      return {
        items: trimmed,
        nextCursor: hasMore ? trimmed[trimmed.length - 1]?.created_at : undefined,
      }
    }),
})
