import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { nanoid } from 'nanoid'
import { slugify, generateRoomSlug } from '@/lib/utils'
import { logActivity } from '@/lib/activity/log'
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

  // ── Lightweight per-project stats for enriched list view ──
  listStats: orgProcedure.query(async ({ ctx }) => {
    // 1. Get all org project IDs
    const { data: projects } = await ctx.supabase
      .from('projects')
      .select('id')
      .eq('organization_id', ctx.orgId)

    if (!projects?.length) return []
    const projectIds = projects.map((p) => p.id)

    // 2. Get all tasks for these projects
    const { data: tasks } = await ctx.supabase
      .from('tasks')
      .select('project_id, status, due_date, assignee_id')
      .in('project_id', projectIds)

    // 3. Get org members for team avatars
    const { data: members } = await ctx.supabase
      .from('organization_members')
      .select('user_id, display_name, avatar_url')
      .eq('organization_id', ctx.orgId)
      .eq('is_active', true)

    const memberMap = new Map(
      (members ?? []).map((m) => [
        m.user_id,
        { displayName: m.display_name ?? 'Unknown', avatarUrl: m.avatar_url as string | null },
      ])
    )

    // 4. Aggregate per project
    const now = new Date().toISOString()
    const DONE = ['done', 'published']

    const statsMap: Record<
      string,
      { total: number; completed: number; inProgress: number; overdue: number; assignees: Set<string> }
    > = {}

    for (const t of tasks ?? []) {
      if (!statsMap[t.project_id]) {
        statsMap[t.project_id] = { total: 0, completed: 0, inProgress: 0, overdue: 0, assignees: new Set() }
      }
      const s = statsMap[t.project_id]
      s.total++
      if (DONE.includes(t.status)) s.completed++
      if (t.status === 'in_progress') s.inProgress++
      if (t.due_date && t.due_date < now && !DONE.includes(t.status)) s.overdue++
      if (t.assignee_id) s.assignees.add(t.assignee_id)
    }

    // 5. Build return array
    return projectIds.map((pid) => {
      const s = statsMap[pid] ?? { total: 0, completed: 0, inProgress: 0, overdue: 0, assignees: new Set<string>() }
      const percent = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
      const teamMembers = Array.from(s.assignees)
        .slice(0, 3)
        .map((uid) => ({
          userId: uid,
          displayName: memberMap.get(uid)?.displayName ?? 'Unknown',
          avatarUrl: memberMap.get(uid)?.avatarUrl ?? null,
        }))

      return {
        projectId: pid,
        total: s.total,
        completed: s.completed,
        inProgress: s.inProgress,
        overdue: s.overdue,
        percent,
        teamMembers,
        totalAssignees: s.assignees.size,
      }
    })
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

      // Auto-create meeting room for the project
      const roomSlug = generateRoomSlug(input.name)
      await ctx.supabase.from('meeting_rooms').insert({
        organization_id: ctx.orgId,
        project_id: project.id,
        slug: roomSlug,
        name: `${input.name} Room`,
        livekit_room_id: `room-${nanoid(12)}`,
      })

      // Auto-create project chat channel
      await ctx.supabase.from('channels').insert({
        organization_id: ctx.orgId,
        project_id: project.id,
        name: `#${input.name}`,
        type: 'project' as const,
        created_by: ctx.user.id,
      })

      // Audit log
      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'project_created',
        entityType: 'project',
        entityId: project.id,
        projectId: project.id,
        metadata: { name: project.name, type: project.type },
      })

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
