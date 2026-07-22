import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database, Json } from '@/types/database'

type AIOutputRow = Database['public']['Tables']['ai_outputs']['Row']

const agentTypeSchema = z.enum([
  'ad_copy',
  'seo_research',
  'performance_report',
  'competitor_analysis',
  'cta_suggestion',
])

const outputStatusSchema = z.enum([
  'generated',
  'saved',
  'discarded',
  'used',
])

export const aiOutputRouter = createTRPCRouter({
  save: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        agentType: agentTypeSchema,
        inputSummary: z.string().optional(),
        outputText: z.string().min(1),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('ai_outputs')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId ?? null,
          agent_type: input.agentType,
          status: 'generated' as const,
          input_summary: input.inputSummary ?? null,
          output_text: input.outputText,
          user_id: ctx.user.id,
          metadata: (input.metadata ?? {}) as Json,
        })
        .select()
        .single<AIOutputRow>()

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return data!
    }),

  updateStatus: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: outputStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('ai_outputs')
        .update({ status: input.status })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<AIOutputRow>()

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return data!
    }),

  rate: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('ai_outputs')
        .update({ rating: input.rating })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<AIOutputRow>()

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return data!
    }),

  listByBrand: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        agentType: agentTypeSchema.optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('ai_outputs')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .eq('brand_id', input.brandId)
        .order('created_at', { ascending: false })
        .limit(input.limit)

      if (input.agentType) {
        query = query.eq('agent_type', input.agentType)
      }

      const { data, error } = await query

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return data ?? []
    }),
})
