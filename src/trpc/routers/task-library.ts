import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure } from '../init'
import { SERVICE_TYPES } from '@/types/enums'
import type { Database } from '@/types/database'

type TemplateRow = Database['public']['Tables']['task_templates']['Row']

export const taskLibraryRouter = createTRPCRouter({
  /**
   * Returns summary stats for all 10 service types:
   * { serviceType, taskCount, totalHours }[]
   */
  getServiceSummaries: orgProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('task_templates')
      .select('service_type, estimated_hours')

    const rows = data ?? []

    // Aggregate by service_type
    const map = new Map<string, { taskCount: number; totalHours: number }>()
    for (const st of SERVICE_TYPES) {
      map.set(st, { taskCount: 0, totalHours: 0 })
    }

    for (const row of rows) {
      const entry = map.get(row.service_type)
      if (entry) {
        entry.taskCount++
        entry.totalHours += Number(row.estimated_hours ?? 0)
      }
    }

    return SERVICE_TYPES.map((st) => ({
      serviceType: st,
      taskCount: map.get(st)?.taskCount ?? 0,
      totalHours: map.get(st)?.totalHours ?? 0,
    }))
  }),

  /**
   * Returns all templates for a specific service type,
   * ordered by phase_name then task_name.
   */
  listByService: orgProcedure
    .input(z.object({ serviceType: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('task_templates')
        .select('*')
        .eq('service_type', input.serviceType)
        .order('phase_name')
        .order('task_name')

      return (data ?? []) as TemplateRow[]
    }),
})
