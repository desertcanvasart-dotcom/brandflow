import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { slugify } from '@/lib/utils'
import type { Database } from '@/types/database'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type WorkflowRow = Database['public']['Tables']['workflow_templates']['Row']

export const projectRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      brandId: z.string().uuid().optional(),
      type: z.enum(['content_ops', 'web_build', 'full_service']).optional(),
      status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('projects')
        .select('*, brands(name, logo_url)')
        .eq('organization_id', ctx.orgId)
        .order('updated_at', { ascending: false })

      if (input?.brandId) query = query.eq('brand_id', input.brandId)
      if (input?.type) query = query.eq('type', input.type)
      if (input?.status) query = query.eq('status', input.status)
      if (input?.search) query = query.ilike('name', `%${input.search}%`)

      const { data } = await query.returns<(ProjectRow & { brands: { name: string; logo_url: string | null } })[]>()
      return data ?? []
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('projects')
        .select('*, brands(name, logo_url, slug)')
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .single<ProjectRow & { brands: { name: string; logo_url: string | null; slug: string } }>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      return data
    }),

  create: managerProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(['content_ops', 'web_build', 'full_service']),
      brandId: z.string().uuid(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name)

      // Find the default workflow template for this project type
      // For full_service, use content_ops template for the workflow (Kanban)
      const templateType = input.type === 'full_service' ? 'content_ops' : input.type
      const { data: template } = await ctx.supabase
        .from('workflow_templates')
        .select('*')
        .eq('project_type', templateType)
        .eq('is_default', true)
        .or(`organization_id.eq.${ctx.orgId},organization_id.is.null`)
        .order('organization_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .single<WorkflowRow>()

      // Create the project
      const { data: project, error } = await ctx.supabase
        .from('projects')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId,
          workflow_template_id: template?.id ?? null,
          type: input.type,
          name: input.name,
          slug,
          description: input.description ?? null,
          status: 'active' as const,
          start_date: input.startDate ?? null,
          end_date: input.endDate ?? null,
          created_by: ctx.user.id,
        })
        .select()
        .single<ProjectRow>()

      if (error || !project) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Failed to create project',
        })
      }

      // For web_build and full_service projects, auto-create phases
      if (input.type === 'web_build' || input.type === 'full_service') {
        // For full_service, fetch the web_build template for phases
        const phaseTemplate = input.type === 'full_service'
          ? (await ctx.supabase
              .from('workflow_templates')
              .select('*')
              .eq('project_type', 'web_build')
              .eq('is_default', true)
              .or(`organization_id.eq.${ctx.orgId},organization_id.is.null`)
              .order('organization_id', { ascending: false, nullsFirst: false })
              .limit(1)
              .single<WorkflowRow>()).data
          : template

        if (phaseTemplate) {
          const stages = phaseTemplate.stages as unknown as Array<{ name: string; description?: string }>
          if (stages && stages.length > 0) {
            const phaseInserts = stages.map((stage, i) => ({
              project_id: project.id,
              name: stage.name,
              description: stage.description ?? null,
              sort_order: i,
            }))
            await ctx.supabase.from('phases').insert(phaseInserts)
          }
        }
      }

      return project
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name) {
        updates.name = input.name
        updates.slug = slugify(input.name)
      }
      if (input.description !== undefined) updates.description = input.description || null
      if (input.status) updates.status = input.status
      if (input.startDate !== undefined) updates.start_date = input.startDate || null
      if (input.endDate !== undefined) updates.end_date = input.endDate || null

      const { data, error } = await ctx.supabase
        .from('projects')
        .update(updates)
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<ProjectRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('projects')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
