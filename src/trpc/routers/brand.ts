import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { slugify } from '@/lib/utils'
import { canAddBrand } from '@/lib/stripe/helpers'
import { triggerEmbedding, stringifyForEmbedding } from '@/lib/ai/embedding-triggers'
import type { Database } from '@/types/database'

type BrandRow = Database['public']['Tables']['brands']['Row']

export const brandRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      search: z.string().optional(),
      includeArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('brands')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('name', { ascending: true })

      // Only filter active brands when not requesting archived
      if (!input?.includeArchived) {
        query = query.eq('is_active', true)
      }

      if (input?.search) {
        query = query.ilike('name', `%${input.search}%`)
      }

      const { data } = await query.returns<BrandRow[]>()
      return data ?? []
    }),

  listWithStats: orgProcedure.query(async ({ ctx }) => {
    // 1. Get all org brand IDs
    const { data: brands } = await ctx.supabase
      .from('brands')
      .select('id')
      .eq('organization_id', ctx.orgId)

    if (!brands?.length) return []
    const brandIds = brands.map((b) => b.id)

    // 2. Get all projects for these brands
    const { data: projects } = await ctx.supabase
      .from('projects')
      .select('id, brand_id, status')
      .eq('organization_id', ctx.orgId)
      .in('brand_id', brandIds)

    // Build brand → project mapping
    const brandProjectMap = new Map<string, { projectIds: string[]; activeCount: number }>()
    for (const p of projects ?? []) {
      if (!brandProjectMap.has(p.brand_id)) {
        brandProjectMap.set(p.brand_id, { projectIds: [], activeCount: 0 })
      }
      const entry = brandProjectMap.get(p.brand_id)!
      entry.projectIds.push(p.id)
      if (p.status === 'active') entry.activeCount++
    }

    // 3. Get all tasks for those projects
    const allProjectIds = (projects ?? []).map((p) => p.id)
    const projectBrandMap = new Map<string, string>()
    for (const p of projects ?? []) {
      projectBrandMap.set(p.id, p.brand_id)
    }

    const DONE = ['done', 'published']
    const brandStats = new Map<string, {
      taskCount: number
      completedTaskCount: number
      assignees: Set<string>
    }>()

    if (allProjectIds.length > 0) {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('project_id, status, assignee_id')
        .in('project_id', allProjectIds)

      for (const t of tasks ?? []) {
        const brandId = projectBrandMap.get(t.project_id)
        if (!brandId) continue

        if (!brandStats.has(brandId)) {
          brandStats.set(brandId, { taskCount: 0, completedTaskCount: 0, assignees: new Set() })
        }
        const s = brandStats.get(brandId)!
        s.taskCount++
        if (DONE.includes(t.status)) s.completedTaskCount++
        if (t.assignee_id) s.assignees.add(t.assignee_id)
      }
    }

    // 4. Build return array
    return brandIds.map((bid) => {
      const projectEntry = brandProjectMap.get(bid)
      const stats = brandStats.get(bid)

      return {
        brandId: bid,
        projectCount: projectEntry?.projectIds.length ?? 0,
        activeProjectCount: projectEntry?.activeCount ?? 0,
        taskCount: stats?.taskCount ?? 0,
        completedTaskCount: stats?.completedTaskCount ?? 0,
        teamMemberCount: stats?.assignees.size ?? 0,
      }
    })
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
      logoUrl: z.string().optional(),
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
          logo_url: input.logoUrl || null,
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

      // Embed updated brand info for RAG
      if (input.description !== undefined && data) {
        const text = [data.name, data.description].filter(Boolean).join('\n\n')
        triggerEmbedding(ctx.orgId, 'brand_guidelines', data.id, text)
      }

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

      // Embed guidelines for RAG
      if (input.guidelines && data) {
        const text = stringifyForEmbedding(input.guidelines as Record<string, unknown>)
        triggerEmbedding(ctx.orgId, 'brand_guidelines', data.id, text)
      }

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

  restore: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('brands')
        .update({ is_active: true })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
