import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import type { Database } from '@/types/database'

type OrgRow = Database['public']['Tables']['organizations']['Row']

export const organizationRouter = createTRPCRouter({
  get: orgProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('organizations')
      .select('*')
      .eq('id', ctx.orgId)
      .single<OrgRow>()

    return data
  }),

  update: adminProcedure
    .input(z.object({
      name: z.string().min(2).optional(),
      logoUrl: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
      defaultTaskDurationHours: z.number().min(0.5).max(24).optional(),
      workingDays: z.array(z.string()).optional(),
      timezone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name) updates.name = input.name
      if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl
      if (input.settings) updates.settings = input.settings
      if (input.defaultTaskDurationHours !== undefined) updates.default_task_duration_hours = input.defaultTaskDurationHours
      if (input.workingDays) updates.working_days = input.workingDays
      if (input.timezone) updates.timezone = input.timezone

      const { data, error } = await ctx.supabase
        .from('organizations')
        .update(updates)
        .eq('id', ctx.orgId)
        .select()
        .single()

      if (error) throw error
      return data
    }),
})
