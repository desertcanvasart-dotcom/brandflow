import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database } from '@/types/database'

type ContentItemRow = Database['public']['Tables']['content_items']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']

export const calendarRouter = createTRPCRouter({
  getTasksByRange: orgProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      brandId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tasks')
        .select('*, projects!inner(organization_id, brand_id, name, brands(name, logo_url))')
        .not('due_date', 'is', null)
        .gte('due_date', input.startDate)
        .lte('due_date', input.endDate)
        .returns<(TaskRow & {
          projects: {
            organization_id: string
            brand_id: string
            name: string
            brands: { name: string; logo_url: string | null }
          }
        })[]>()

      let filtered = (data ?? []).filter(
        (t) => t.projects.organization_id === ctx.orgId
      )

      if (input.brandId) {
        filtered = filtered.filter((t) => t.projects.brand_id === input.brandId)
      }

      return filtered
    }),

  getContentByRange: orgProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      brandId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all tasks with content items that have scheduled_at in range
      const query = ctx.supabase
        .from('content_items')
        .select('*, tasks!inner(*, projects!inner(organization_id, brand_id, brands(name, logo_url)))')
        .gte('scheduled_at', input.startDate)
        .lte('scheduled_at', input.endDate)

      const { data } = await query.returns<(ContentItemRow & {
        tasks: TaskRow & {
          projects: {
            organization_id: string
            brand_id: string
            brands: { name: string; logo_url: string | null }
          }
        }
      })[]>()

      // Filter by org
      const filtered = (data ?? []).filter(
        (item) => item.tasks.projects.organization_id === ctx.orgId
      )

      // Filter by brand if specified
      if (input.brandId) {
        return filtered.filter(
          (item) => item.tasks.projects.brand_id === input.brandId
        )
      }

      return filtered
    }),

  reschedule: orgProcedure
    .input(z.object({
      contentItemId: z.string().uuid(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('content_items')
        .update({ scheduled_at: input.scheduledAt })
        .eq('id', input.contentItemId)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Auto-transition parent task to 'scheduled'
      if (data) {
        await ctx.supabase
          .from('tasks')
          .update({ status: 'scheduled' as const })
          .eq('id', data.task_id)
      }

      return data
    }),
})
