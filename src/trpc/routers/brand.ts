import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { slugify } from '@/lib/utils'
import { canAddBrand } from '@/lib/stripe/helpers'
import type { Database } from '@/types/database'

type BrandRow = Database['public']['Tables']['brands']['Row']

export const brandRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('brands')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (input?.search) {
        query = query.ilike('name', `%${input.search}%`)
      }

      const { data } = await query.returns<BrandRow[]>()
      return data ?? []
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('brands')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .single<BrandRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brand not found' })
      }

      return data
    }),

  create: managerProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      websiteUrl: z.string().url().optional().or(z.literal('')),
      platforms: z.array(z.enum([
        'instagram', 'facebook', 'twitter', 'linkedin',
        'tiktok', 'youtube', 'blog', 'newsletter', 'other',
      ])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Plan enforcement: check brand limits
      const brandCheck = await canAddBrand(ctx.orgId)
      if (!brandCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: brandCheck.reason ?? 'Brand limit reached for your current plan',
        })
      }

      const slug = slugify(input.name)

      const { data, error } = await ctx.supabase
        .from('brands')
        .insert({
          organization_id: ctx.orgId,
          name: input.name,
          slug,
          description: input.description ?? null,
          website_url: input.websiteUrl || null,
          platforms: input.platforms ?? [],
        })
        .select()
        .single<BrandRow>()

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A brand with this name already exists',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return data
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      websiteUrl: z.string().url().optional().or(z.literal('')),
      logoUrl: z.string().optional(),
      platforms: z.array(z.enum([
        'instagram', 'facebook', 'twitter', 'linkedin',
        'tiktok', 'youtube', 'blog', 'newsletter', 'other',
      ])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name) {
        updates.name = input.name
        updates.slug = slugify(input.name)
      }
      if (input.description !== undefined) updates.description = input.description || null
      if (input.websiteUrl !== undefined) updates.website_url = input.websiteUrl || null
      if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl || null
      if (input.platforms) updates.platforms = input.platforms

      const { data, error } = await ctx.supabase
        .from('brands')
        .update(updates)
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<BrandRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateGuidelines: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      guidelines: z.record(z.string(), z.unknown()).optional(),
      colors: z.array(z.object({
        name: z.string(),
        hex: z.string(),
        usage: z.string().optional(),
      })).optional(),
      fonts: z.array(z.object({
        name: z.string(),
        url: z.string().optional(),
        usage: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.guidelines !== undefined) updates.guidelines = input.guidelines
      if (input.colors !== undefined) updates.colors = input.colors
      if (input.fonts !== undefined) updates.fonts = input.fonts

      const { data, error } = await ctx.supabase
        .from('brands')
        .update(updates)
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<BrandRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete
      const { error } = await ctx.supabase
        .from('brands')
        .update({ is_active: false })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
