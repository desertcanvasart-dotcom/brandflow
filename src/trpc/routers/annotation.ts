import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database } from '@/types/database'

type AnnotationRow = Database['public']['Tables']['annotations']['Row']

export const annotationRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      deliverableId: z.string().uuid(),
      version: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('annotations')
        .select('*')
        .eq('deliverable_id', input.deliverableId)
        .order('created_at', { ascending: true })

      if (input.version !== undefined) query = query.eq('version', input.version)

      const { data } = await query.returns<AnnotationRow[]>()
      return data ?? []
    }),

  create: orgProcedure
    .input(z.object({
      deliverableId: z.string().uuid(),
      type: z.enum(['pin', 'rectangle', 'arrow']).optional(),
      xPercent: z.number().min(0).max(100),
      yPercent: z.number().min(0).max(100),
      widthPercent: z.number().min(0).max(100).optional(),
      heightPercent: z.number().min(0).max(100).optional(),
      body: z.string().min(1),
      version: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('annotations')
        .insert({
          deliverable_id: input.deliverableId,
          author_id: ctx.user.id,
          type: input.type ?? 'pin',
          x_percent: input.xPercent,
          y_percent: input.yPercent,
          width_percent: input.widthPercent ?? null,
          height_percent: input.heightPercent ?? null,
          body: input.body,
          version: input.version ?? 1,
        })
        .select()
        .single<AnnotationRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      body: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('annotations')
        .update({ body: input.body })
        .eq('id', input.id)
        .eq('author_id', ctx.user.id)
        .select()
        .single<AnnotationRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  resolve: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('annotations')
        .update({ is_resolved: true })
        .eq('id', input.id)
        .select()
        .single<AnnotationRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('annotations')
        .delete()
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
