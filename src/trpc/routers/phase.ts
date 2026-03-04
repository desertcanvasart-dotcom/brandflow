import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import type { Database } from '@/types/database'

type PhaseRow = Database['public']['Tables']['phases']['Row']

export const phaseRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('phases')
        .select('*')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })
        .returns<PhaseRow[]>()

      return data ?? []
    }),

  create: managerProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      milestoneName: z.string().optional(),
      milestoneDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('phases')
        .insert({
          project_id: input.projectId,
          name: input.name,
          description: input.description ?? null,
          sort_order: input.sortOrder ?? 0,
          start_date: input.startDate ?? null,
          end_date: input.endDate ?? null,
          milestone_name: input.milestoneName ?? null,
          milestone_date: input.milestoneDate ?? null,
        })
        .select()
        .single<PhaseRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']).optional(),
      sortOrder: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      milestoneName: z.string().optional(),
      milestoneDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name) updates.name = input.name
      if (input.description !== undefined) updates.description = input.description || null
      if (input.status) updates.status = input.status
      if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder
      if (input.startDate !== undefined) updates.start_date = input.startDate || null
      if (input.endDate !== undefined) updates.end_date = input.endDate || null
      if (input.milestoneName !== undefined) updates.milestone_name = input.milestoneName || null
      if (input.milestoneDate !== undefined) updates.milestone_date = input.milestoneDate || null

      const { data, error } = await ctx.supabase
        .from('phases')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single<PhaseRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  reorder: managerProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        sortOrder: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const item of input.items) {
        await ctx.supabase
          .from('phases')
          .update({ sort_order: item.sortOrder })
          .eq('id', item.id)
      }
      return { success: true }
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('phases')
        .delete()
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
