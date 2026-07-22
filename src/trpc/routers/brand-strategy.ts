import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { triggerEmbedding, stringifyForEmbedding } from '@/lib/ai/embedding-triggers'
import type { Database, Json } from '@/types/database'

type BrandStrategyRow = Database['public']['Tables']['brand_strategies']['Row']

const contentPillarSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  keywords: z.array(z.string()),
})

const audiencePersonaSchema = z.object({
  name: z.string().min(1),
  demographics: z.string(),
  painPoints: z.array(z.string()),
  goals: z.array(z.string()),
  preferredPlatforms: z.array(z.string()),
})

const toneProfileSchema = z.object({
  voice: z.string(),
  tone: z.string(),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  samplePhrases: z.array(z.string()),
})

const campaignObjectiveSchema = z.object({
  objective: z.string().min(1),
  kpis: z.array(z.string()),
  targetDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused']).default('active'),
})

export const brandStrategyRouter = createTRPCRouter({
  getByBrand: orgProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('brand_strategies')
        .select('*')
        .eq('brand_id', input.brandId)
        .eq('organization_id', ctx.orgId)
        .single<BrandStrategyRow>()

      return data
    }),

  upsert: managerProcedure
    .input(
      z.object({
        brandId: z.string().uuid(),
        contentPillars: z.array(contentPillarSchema).optional(),
        audiencePersonas: z.array(audiencePersonaSchema).optional(),
        toneProfiles: toneProfileSchema.optional(),
        campaignObjectives: z.array(campaignObjectiveSchema).optional(),
        competitiveNotes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if strategy already exists
      const { data: existing } = await ctx.supabase
        .from('brand_strategies')
        .select('id')
        .eq('brand_id', input.brandId)
        .eq('organization_id', ctx.orgId)
        .single()

      const payload: Record<string, unknown> = {}
      if (input.contentPillars !== undefined)
        payload.content_pillars = input.contentPillars as unknown as Json
      if (input.audiencePersonas !== undefined)
        payload.audience_personas = input.audiencePersonas as unknown as Json
      if (input.toneProfiles !== undefined)
        payload.tone_profiles = input.toneProfiles as unknown as Json
      if (input.campaignObjectives !== undefined)
        payload.campaign_objectives = input.campaignObjectives as unknown as Json
      if (input.competitiveNotes !== undefined)
        payload.competitive_notes = input.competitiveNotes

      let result: BrandStrategyRow

      if (existing) {
        // Update existing strategy
        const { data, error } = await ctx.supabase
          .from('brand_strategies')
          .update(payload)
          .eq('id', existing.id)
          .eq('organization_id', ctx.orgId)
          .select()
          .single<BrandStrategyRow>()

        if (error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          })
        result = data
      } else {
        // Create new strategy
        const { data, error } = await ctx.supabase
          .from('brand_strategies')
          .insert({
            organization_id: ctx.orgId,
            brand_id: input.brandId,
            ...payload,
          })
          .select()
          .single<BrandStrategyRow>()

        if (error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          })
        result = data
      }

      // Embed brand strategy for RAG (pillars, personas, tone — all under brand_guidelines)
      const strategyText = stringifyForEmbedding({
        content_pillars: input.contentPillars,
        audience_personas: input.audiencePersonas,
        tone_profiles: input.toneProfiles,
        campaign_objectives: input.campaignObjectives,
        competitive_notes: input.competitiveNotes,
      } as Record<string, unknown>)
      if (strategyText) {
        triggerEmbedding(ctx.orgId, 'brand_guidelines', input.brandId, strategyText)
      }

      return result
    }),

  delete: managerProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('brand_strategies')
        .delete()
        .eq('brand_id', input.brandId)
        .eq('organization_id', ctx.orgId)

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return { success: true }
    }),
})
