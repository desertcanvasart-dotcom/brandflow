import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database } from '@/types/database'
import { evaluateRules } from '@/lib/automation/evaluate-rules'

type TaskRow = Database['public']['Tables']['tasks']['Row']
type PhaseRow = Database['public']['Tables']['phases']['Row']
type TemplateRow = Database['public']['Tables']['task_templates']['Row']

export const projectTasksRouter = createTRPCRouter({
  /**
   * Get all tasks for a project that have template_id or service_type set,
   * grouped by service_type → phase.
   */
  listByProject: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Fetch tasks with phase info
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('*, phases(id, name, sort_order)')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })

      type TaskWithPhase = TaskRow & {
        phases: { id: string; name: string; sort_order: number } | null
      }

      const typedTasks = (tasks ?? []) as TaskWithPhase[]

      // Fetch assignee info
      const assigneeIds = [
        ...new Set(typedTasks.map((t) => t.assignee_id).filter(Boolean)),
      ] as string[]
      const memberMap = new Map<
        string,
        { user_id: string; display_name: string | null; avatar_url: string | null }
      >()

      if (assigneeIds.length > 0) {
        const { data: members } = await ctx.supabase
          .from('organization_members')
          .select('user_id, display_name, avatar_url')
          .in('user_id', assigneeIds)
          .eq('organization_id', ctx.orgId)

        for (const m of members ?? []) {
          memberMap.set(m.user_id, m)
        }
      }

      // Group by service_type → phase_name
      const grouped: Record<
        string,
        {
          phaseName: string
          phaseId: string | null
          phaseSortOrder: number
          tasks: (TaskWithPhase & {
            assignee: {
              user_id: string
              display_name: string | null
              avatar_url: string | null
            } | null
          })[]
        }[]
      > = {}

      for (const task of typedTasks) {
        const serviceKey = task.service_type ?? '_unassigned'
        const phaseName = task.phases?.name ?? 'Unphased'
        const phaseId = task.phases?.id ?? null
        const phaseSortOrder = task.phases?.sort_order ?? 999

        if (!grouped[serviceKey]) grouped[serviceKey] = []

        let phaseGroup = grouped[serviceKey].find(
          (g) => g.phaseName === phaseName
        )
        if (!phaseGroup) {
          phaseGroup = { phaseName, phaseId, phaseSortOrder, tasks: [] }
          grouped[serviceKey].push(phaseGroup)
        }

        phaseGroup.tasks.push({
          ...task,
          assignee: task.assignee_id
            ? memberMap.get(task.assignee_id) ?? null
            : null,
        })
      }

      // Sort phase groups within each service
      for (const key of Object.keys(grouped)) {
        grouped[key].sort((a, b) => a.phaseSortOrder - b.phaseSortOrder)
      }

      return grouped
    }),

  /**
   * Bulk insert tasks from templates.
   * Looks up or creates phases by name for the project.
   */
  addFromTemplates: orgProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        templateIds: z.array(z.string().uuid()).min(1).max(200),
        serviceType: z.string(),
        briefId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch templates
      const { data: templates, error: tplErr } = await ctx.supabase
        .from('task_templates')
        .select('*')
        .in('id', input.templateIds)

      if (tplErr || !templates?.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No valid templates found',
        })
      }

      const typedTemplates = templates as TemplateRow[]

      // Get existing phases for this project
      const { data: existingPhases } = await ctx.supabase
        .from('phases')
        .select('*')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })
        .returns<PhaseRow[]>()

      const phaseMap = new Map<string, PhaseRow>()
      for (const p of existingPhases ?? []) {
        phaseMap.set(p.name.toLowerCase(), p)
      }

      // Determine phase names needed from templates
      const neededPhases = [
        ...new Set(typedTemplates.map((t) => t.phase_name)),
      ]

      // Create missing phases
      let maxSortOrder =
        Math.max(0, ...(existingPhases ?? []).map((p) => p.sort_order)) + 1

      for (const phaseName of neededPhases) {
        if (!phaseMap.has(phaseName.toLowerCase())) {
          const { data: newPhase } = await ctx.supabase
            .from('phases')
            .insert({
              project_id: input.projectId,
              name: phaseName,
              sort_order: maxSortOrder++,
            })
            .select()
            .single<PhaseRow>()

          if (newPhase) {
            phaseMap.set(phaseName.toLowerCase(), newPhase)
          }
        }
      }

      // Get max sort_order for existing tasks in this project
      const { data: lastTask } = await ctx.supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .returns<{ sort_order: number }[]>()

      let sortOrder = (lastTask?.[0]?.sort_order ?? -1) + 1

      // Build task inserts grouped by phase for correct ordering
      const taskInserts: Database['public']['Tables']['tasks']['Insert'][] = []

      // Sort templates by phase name to keep them grouped
      const sortedTemplates = [...typedTemplates].sort((a, b) =>
        a.phase_name.localeCompare(b.phase_name)
      )

      for (const template of sortedTemplates) {
        const phase = phaseMap.get(template.phase_name.toLowerCase())

        taskInserts.push({
          project_id: input.projectId,
          phase_id: phase?.id ?? null,
          title: template.task_name,
          description: template.description ?? null,
          status: 'todo',
          estimated_hours: template.estimated_hours ?? null,
          sort_order: sortOrder++,
          created_by: ctx.user.id,
          template_id: template.id,
          task_type: template.type ?? null,
          service_type: input.serviceType,
          source_brief_id: input.briefId ?? null,
        })
      }

      // Bulk insert
      const { data: inserted, error: insertErr } = await ctx.supabase
        .from('tasks')
        .insert(taskInserts)
        .select()
        .returns<TaskRow[]>()

      if (insertErr) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: insertErr.message,
        })
      }

      // Get project type for rule evaluation
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('type')
        .eq('id', input.projectId)
        .single()

      // Evaluate auto-assignment rules for each inserted task
      if (inserted?.length) {
        for (const task of inserted) {
          const phase = phaseMap.get(
            sortedTemplates
              .find((t) => t.id === task.template_id)
              ?.phase_name?.toLowerCase() ?? ''
          )
          await evaluateRules(ctx.supabase, ctx.orgId, {
            taskId: task.id,
            projectType: project?.type ?? undefined,
            taskType: task.task_type,
            serviceType: task.service_type,
            phaseName: phase?.name ?? null,
          })
        }
      }

      return {
        insertedCount: inserted?.length ?? 0,
        phaseCount: neededPhases.length,
      }
    }),

  /**
   * Add a single custom (non-template) task to a project.
   */
  addManualTask: orgProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        phaseId: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        serviceType: z.string().optional(),
        taskType: z.string().optional(),
        estimatedHours: z.number().optional(),
        assigneeId: z.string().uuid().optional(),
        dueDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get max sort_order
      const { data: lastTask } = await ctx.supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .returns<{ sort_order: number }[]>()

      const nextOrder = (lastTask?.[0]?.sort_order ?? -1) + 1

      const { data: task, error } = await ctx.supabase
        .from('tasks')
        .insert({
          project_id: input.projectId,
          phase_id: input.phaseId ?? null,
          title: input.title,
          description: input.description ?? null,
          status: 'todo',
          estimated_hours: input.estimatedHours ?? null,
          assignee_id: input.assigneeId ?? null,
          due_date: input.dueDate ?? null,
          sort_order: nextOrder,
          created_by: ctx.user.id,
          service_type: input.serviceType ?? null,
          task_type: input.taskType ?? null,
        })
        .select()
        .single<TaskRow>()

      if (error || !task) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Failed to create task',
        })
      }

      // Evaluate auto-assignment rules if no assignee was specified
      if (!input.assigneeId) {
        const { data: project } = await ctx.supabase
          .from('projects')
          .select('type')
          .eq('id', input.projectId)
          .single()

        // Get phase name if phase was specified
        let phaseName: string | null = null
        if (input.phaseId) {
          const { data: phase } = await ctx.supabase
            .from('phases')
            .select('name')
            .eq('id', input.phaseId)
            .single()
          phaseName = phase?.name ?? null
        }

        await evaluateRules(ctx.supabase, ctx.orgId, {
          taskId: task.id,
          projectType: project?.type ?? undefined,
          taskType: task.task_type,
          serviceType: task.service_type,
          phaseName,
        })
      }

      return task
    }),

  /**
   * Update a task's fields (assignee, due_date, status, notes, sort_order, depends_on).
   * When status changes to 'done', triggers dependency resolution.
   */
  updateTask: orgProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z
          .enum(['todo', 'in_progress', 'in_review', 'done', 'blocked'])
          .optional(),
        assigneeId: z.string().uuid().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        sortOrder: z.number().optional(),
        dependsOn: z.array(z.string().uuid()).optional(),
        estimatedHours: z.number().optional().nullable(),
        serviceType: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...fields } = input

      // Fetch current state
      const { data: oldTask } = await ctx.supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single<TaskRow>()

      if (!oldTask) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      const updates: Record<string, unknown> = {}
      if (fields.status !== undefined) updates.status = fields.status
      if (fields.assigneeId !== undefined)
        updates.assignee_id = fields.assigneeId
      if (fields.dueDate !== undefined) updates.due_date = fields.dueDate
      if (fields.notes !== undefined) updates.notes = fields.notes
      if (fields.sortOrder !== undefined) updates.sort_order = fields.sortOrder
      if (fields.dependsOn !== undefined) updates.depends_on = fields.dependsOn
      if (fields.estimatedHours !== undefined)
        updates.estimated_hours = fields.estimatedHours
      if (fields.serviceType !== undefined)
        updates.service_type = fields.serviceType

      const { data: updated, error } = await ctx.supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single<TaskRow>()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      // If status changed to 'done', resolve dependencies
      if (fields.status === 'done' && oldTask.status !== 'done') {
        await resolveDependencies(ctx.supabase, oldTask.project_id, id)
      }

      return updated
    }),

  /**
   * Delete a task.
   */
  deleteTask: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Remove this task from any other tasks' depends_on arrays
      const { data: dependents } = await ctx.supabase
        .from('tasks')
        .select('id, depends_on')
        .contains('depends_on', [input.id])

      if (dependents?.length) {
        for (const dep of dependents) {
          const newDeps = ((dep.depends_on as string[]) ?? []).filter(
            (d) => d !== input.id
          )
          await ctx.supabase
            .from('tasks')
            .update({ depends_on: newDeps })
            .eq('id', dep.id)
        }
      }

      const { error } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      }

      return { success: true }
    }),

  /**
   * Bulk update sort_order for DnD persistence.
   */
  reorderTasks: orgProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            sortOrder: z.number(),
            phaseId: z.string().uuid().optional().nullable(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      for (const item of input.items) {
        const updates: Record<string, unknown> = {
          sort_order: item.sortOrder,
        }
        if (item.phaseId !== undefined) updates.phase_id = item.phaseId
        await ctx.supabase.from('tasks').update(updates).eq('id', item.id)
      }
      return { success: true }
    }),

  /**
   * Compute project health: on_track, at_risk, or delayed.
   * - on_track: 0 overdue AND <2 blocked
   * - at_risk: 1-3 overdue OR 3+ blocked
   * - delayed: 4+ overdue
   */
  getProjectHealth: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, status, due_date')
        .eq('project_id', input.projectId)
        .not('status', 'eq', 'done')
        .returns<{ id: string; status: string; due_date: string | null }[]>()

      const allTasks = tasks ?? []
      const now = new Date().toISOString().slice(0, 10)

      const overdueCount = allTasks.filter(
        (t) =>
          t.due_date &&
          t.due_date < now &&
          t.status !== 'done'
      ).length

      const blockedCount = allTasks.filter(
        (t) => t.status === 'blocked'
      ).length

      const totalTasks = allTasks.length
      const doneTasks =
        (
          await ctx.supabase
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', input.projectId)
            .eq('status', 'done')
        ).count ?? 0

      let health: 'on_track' | 'at_risk' | 'delayed'

      if (overdueCount >= 4) {
        health = 'delayed'
      } else if (overdueCount >= 1 || blockedCount >= 3) {
        health = 'at_risk'
      } else {
        health = 'on_track'
      }

      return {
        health,
        overdueCount,
        blockedCount,
        totalTasks: totalTasks + doneTasks,
        completedTasks: doneTasks,
      }
    }),

  /**
   * Manually trigger dependency resolution for a project.
   * Finds blocked tasks whose dependencies are all done → sets them to todo.
   */
  resolveDeps: orgProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        completedTaskId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const unblocked = await resolveDependencies(
        ctx.supabase,
        input.projectId,
        input.completedTaskId
      )
      return { unblockedCount: unblocked }
    }),
})

/**
 * Resolve dependencies when a task is marked as done.
 * Finds all tasks that depend on the completed task,
 * checks if ALL their dependencies are now done,
 * and unblocks them (blocked → todo).
 */
async function resolveDependencies(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  projectId: string,
  completedTaskId: string
): Promise<number> {
  // Find tasks that depend on the completed task
  const { data: dependents } = await supabase
    .from('tasks')
    .select('id, depends_on, status')
    .eq('project_id', projectId)
    .contains('depends_on', [completedTaskId])

  if (!dependents?.length) return 0

  // Get all tasks in the project to check dependency statuses
  const { data: projectTasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('project_id', projectId)
    .returns<{ id: string; status: string }[]>()

  const taskStatusMap = new Map<string, string>()
  for (const t of projectTasks ?? []) {
    taskStatusMap.set(t.id, t.status)
  }

  let unblockedCount = 0

  for (const dep of dependents) {
    // Only unblock tasks that are currently blocked
    if (dep.status !== 'blocked') continue

    const deps = (dep.depends_on as string[]) ?? []
    const allDepsDone = deps.every((depId) => taskStatusMap.get(depId) === 'done')

    if (allDepsDone) {
      await supabase
        .from('tasks')
        .update({ status: 'todo' })
        .eq('id', dep.id)
      unblockedCount++
    }
  }

  return unblockedCount
}
