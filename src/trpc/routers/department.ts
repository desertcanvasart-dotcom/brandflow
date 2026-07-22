import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import type { Database } from '@/types/database'

type DepartmentRow = Database['public']['Tables']['departments']['Row']

export const departmentRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('departments')
      .select('*')
      .eq('organization_id', ctx.orgId)
      .order('sort_order', { ascending: true })
      .returns<DepartmentRow[]>()

    return data ?? []
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get max sort_order if not provided
      let sortOrder = input.sortOrder
      if (sortOrder === undefined) {
        const { data: existing } = await ctx.supabase
          .from('departments')
          .select('sort_order')
          .eq('organization_id', ctx.orgId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .returns<{ sort_order: number }[]>()
        sortOrder = (existing?.[0]?.sort_order ?? -1) + 1
      }

      const { data, error } = await ctx.supabase
        .from('departments')
        .insert({
          organization_id: ctx.orgId,
          name: input.name,
          description: input.description ?? null,
          color: input.color,
          sort_order: sortOrder,
        })
        .select()
        .single<DepartmentRow>()

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A department with this name already exists',
          })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name
      if (input.description !== undefined) updates.description = input.description || null
      if (input.color !== undefined) updates.color = input.color

      const { data, error } = await ctx.supabase
        .from('departments')
        .update(updates)
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<DepartmentRow>()

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A department with this name already exists',
          })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      return data
    }),

  reorder: adminProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        sortOrder: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const item of input.items) {
        await ctx.supabase
          .from('departments')
          .update({ sort_order: item.sortOrder })
          .eq('id', item.id)
          .eq('organization_id', ctx.orgId)
      }
      return { success: true }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('departments')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
