import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import { logActivity } from '@/lib/activity/log'
import { createNotification, createNotifications } from '@/lib/notifications/create'
import { applyAutoAssignment } from '@/lib/automation/auto-assign'
import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']

export const taskRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      phaseId: z.string().uuid().optional(),
      status: z.enum([
        'backlog', 'todo', 'in_progress', 'in_review',
        'client_review', 'approved', 'scheduled', 'published',
        'blocked', 'done',
      ]).optional(),
      assigneeId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('tasks')
        .select('*')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })

      if (input.phaseId) query = query.eq('phase_id', input.phaseId)
      if (input.status) query = query.eq('status', input.status)
      if (input.assigneeId) query = query.eq('assignee_id', input.assigneeId)

      const { data } = await query.returns<TaskRow[]>()
      return data ?? []
    }),

  listByBoard: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('*')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })
        .returns<TaskRow[]>()

      // Group by status for Kanban view
      const grouped: Record<string, TaskRow[]> = {}
      for (const task of tasks ?? []) {
        if (!grouped[task.status]) grouped[task.status] = []
        grouped[task.status].push(task)
      }
      return grouped
    }),

  listForTimeline: orgProcedure
    .input(z.object({
      projectIds: z.array(z.string().uuid()).min(1).max(50),
    }))
    .query(async ({ ctx, input }) => {
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('*, projects!inner(name, brand_id, brands(id, name, logo_url))')
        .in('project_id', input.projectIds)
        .order('sort_order', { ascending: true })

      type TaskWithProject = TaskRow & {
        projects: {
          name: string
          brand_id: string
          brands: { id: string; name: string; logo_url: string | null }
        }
      }

      const typedTasks = (tasks ?? []) as TaskWithProject[]

      // Fetch assignee data separately (no FK from tasks.assignee_id to organization_members)
      const assigneeIds = [...new Set(typedTasks.map((t) => t.assignee_id).filter(Boolean))] as string[]
      let memberMap = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null }>()

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

      return typedTasks.map((t) => ({
        ...t,
        assignee: t.assignee_id ? memberMap.get(t.assignee_id) ?? null : null,
      }))
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('tasks')
        .select('*')
        .eq('id', input.id)
        .single<TaskRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })
      }

      return data
    }),

  create: orgProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      phaseId: z.string().uuid().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum([
        'backlog', 'todo', 'in_progress', 'in_review',
        'client_review', 'approved', 'scheduled', 'published',
        'blocked', 'done',
      ]).optional(),
      assigneeId: z.string().uuid().optional(),
      reviewerId: z.string().uuid().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      priority: z.number().min(0).max(4).optional(),
      estimatedHours: z.number().optional(),
      tags: z.array(z.string()).optional(),
      // Content-specific fields
      platform: z.enum([
        'instagram', 'facebook', 'twitter', 'linkedin',
        'tiktok', 'youtube', 'blog', 'newsletter', 'other',
      ]).optional(),
      // Deliverable-specific fields
      deliverableType: z.enum([
        'wireframe', 'mockup', 'prototype', 'code', 'document', 'asset', 'other',
      ]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get max sort_order for this project/phase
      const sortQuery = ctx.supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: false })
        .limit(1)

      const { data: lastTask } = input.phaseId
        ? await sortQuery.eq('phase_id', input.phaseId).returns<{ sort_order: number }[]>()
        : await sortQuery.returns<{ sort_order: number }[]>()

      const nextOrder = (lastTask?.[0]?.sort_order ?? -1) + 1

      const { data: task, error } = await ctx.supabase
        .from('tasks')
        .insert({
          project_id: input.projectId,
          phase_id: input.phaseId ?? null,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? 'todo',
          assignee_id: input.assigneeId ?? null,
          reviewer_id: input.reviewerId ?? null,
          start_date: input.startDate ?? null,
          due_date: input.dueDate ?? null,
          priority: input.priority ?? 0,
          estimated_hours: input.estimatedHours ?? null,
          tags: input.tags ?? [],
          sort_order: nextOrder,
          created_by: ctx.user.id,
        })
        .select()
        .single<TaskRow>()

      if (error || !task) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Failed to create task',
        })
      }

      // Look up the project type to auto-create linked records
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('type, name')
        .eq('id', input.projectId)
        .single<{ type: string; name: string }>()

      const projectType = project?.type

      // Auto-create content_item for content_ops and full_service projects
      if (projectType === 'content_ops' || projectType === 'full_service') {
        await ctx.supabase.from('content_items').insert({
          task_id: task.id,
          platform: input.platform ?? 'other',
        })
      }

      // Auto-create deliverable for web_build and full_service projects
      if (projectType === 'web_build' || projectType === 'full_service') {
        await ctx.supabase.from('deliverables').insert({
          task_id: task.id,
          type: input.deliverableType ?? 'other',
        })
      }

      // ── Automation hooks ──

      // Auto-assignment (only if no assignee was set)
      let finalAssigneeId = task.assignee_id
      if (!finalAssigneeId && projectType) {
        const autoAssigned = await applyAutoAssignment({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          taskId: task.id,
          projectType,
          platform: input.platform,
          tags: input.tags,
        })
        if (autoAssigned) finalAssigneeId = autoAssigned
      }

      // Get actor display name for notifications
      const { data: actor } = await ctx.supabase
        .from('organization_members')
        .select('display_name')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .single<{ display_name: string | null }>()

      const actorName = actor?.display_name ?? 'Someone'
      const taskLink = `/projects/${input.projectId}?task=${task.id}`

      // Log activity
      logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'task_created',
        entityType: 'task',
        entityId: task.id,
        projectId: input.projectId,
        metadata: { taskTitle: task.title, projectName: project?.name ?? '' },
      })

      // Notify assignee
      if (finalAssigneeId) {
        createNotification({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          recipientUserId: finalAssigneeId,
          actorId: ctx.user.id,
          type: 'task_assigned',
          title: `You've been assigned to "${task.title}"`,
          body: `Assigned by ${actorName} in ${project?.name ?? 'a project'}`,
          link: taskLink,
          metadata: { taskTitle: task.title, projectName: project?.name ?? '', actorName },
        })
      }

      return task
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum([
        'backlog', 'todo', 'in_progress', 'in_review',
        'client_review', 'approved', 'scheduled', 'published',
        'blocked', 'done',
      ]).optional(),
      phaseId: z.string().uuid().optional().nullable(),
      assigneeId: z.string().uuid().optional().nullable(),
      reviewerId: z.string().uuid().optional().nullable(),
      startDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      priority: z.number().min(0).max(4).optional(),
      estimatedHours: z.number().optional().nullable(),
      actualHours: z.number().optional().nullable(),
      tags: z.array(z.string()).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch old state for change detection
      const { data: oldTask } = await ctx.supabase
        .from('tasks')
        .select('*, projects!inner(name)')
        .eq('id', input.id)
        .single<TaskRow & { projects: { name: string } }>()

      const updates: Record<string, unknown> = {}
      if (input.title) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      if (input.status) updates.status = input.status
      if (input.phaseId !== undefined) updates.phase_id = input.phaseId
      if (input.assigneeId !== undefined) updates.assignee_id = input.assigneeId
      if (input.reviewerId !== undefined) updates.reviewer_id = input.reviewerId
      if (input.startDate !== undefined) updates.start_date = input.startDate
      if (input.dueDate !== undefined) updates.due_date = input.dueDate
      if (input.priority !== undefined) updates.priority = input.priority
      if (input.estimatedHours !== undefined) updates.estimated_hours = input.estimatedHours
      if (input.actualHours !== undefined) updates.actual_hours = input.actualHours
      if (input.tags) updates.tags = input.tags
      if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder

      const { data, error } = await ctx.supabase
        .from('tasks')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single<TaskRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // ── Automation hooks ──
      if (oldTask) {
        const projectName = oldTask.projects?.name ?? ''
        const taskLink = `/projects/${oldTask.project_id}?task=${input.id}`

        // Status changed
        if (input.status && input.status !== oldTask.status) {
          logActivity({
            supabase: ctx.supabase,
            orgId: ctx.orgId,
            actorId: ctx.user.id,
            action: 'status_changed',
            entityType: 'task',
            entityId: input.id,
            projectId: oldTask.project_id,
            metadata: { taskTitle: oldTask.title, projectName, oldStatus: oldTask.status, newStatus: input.status },
          })

          // Notify assignee and reviewer
          const recipients = [oldTask.assignee_id, oldTask.reviewer_id].filter((id): id is string => !!id)
          if (recipients.length > 0) {
            createNotifications({
              supabase: ctx.supabase,
              orgId: ctx.orgId,
              actorId: ctx.user.id,
              recipientUserIds: recipients,
              type: 'task_status_changed',
              title: `"${oldTask.title}" status changed to ${input.status.replace(/_/g, ' ')}`,
              body: `In project ${projectName}`,
              link: taskLink,
              metadata: { taskTitle: oldTask.title, projectName, oldStatus: oldTask.status, newStatus: input.status },
            })
          }

          // Post system message to project chat when task is done
          if (input.status === 'done' && oldTask.project_id) {
            import('@/lib/chat/system-message').then(({ insertSystemMessage }) =>
              insertSystemMessage({
                supabase: ctx.supabase,
                projectId: oldTask.project_id,
                event: 'task_completed',
                content: `Task "${oldTask.title}" has been marked as done`,
              })
            ).catch(() => {})
          }
        }

        // Assignee changed
        if (input.assigneeId !== undefined && input.assigneeId !== oldTask.assignee_id) {
          logActivity({
            supabase: ctx.supabase,
            orgId: ctx.orgId,
            actorId: ctx.user.id,
            action: 'assignment_changed',
            entityType: 'task',
            entityId: input.id,
            projectId: oldTask.project_id,
            metadata: { taskTitle: oldTask.title, projectName },
          })

          // Notify new assignee
          if (input.assigneeId) {
            const { data: actor } = await ctx.supabase
              .from('organization_members')
              .select('display_name')
              .eq('user_id', ctx.user.id)
              .eq('organization_id', ctx.orgId)
              .single<{ display_name: string | null }>()

            createNotification({
              supabase: ctx.supabase,
              orgId: ctx.orgId,
              recipientUserId: input.assigneeId,
              actorId: ctx.user.id,
              type: 'task_assigned',
              title: `You've been assigned to "${oldTask.title}"`,
              body: `Assigned by ${actor?.display_name ?? 'Someone'} in ${projectName}`,
              link: taskLink,
              metadata: { taskTitle: oldTask.title, projectName, actorName: actor?.display_name ?? 'Someone' },
            })
          }
        }

        // General update (if not already logged as status or assignment change)
        if (!input.status && input.assigneeId === undefined) {
          logActivity({
            supabase: ctx.supabase,
            orgId: ctx.orgId,
            actorId: ctx.user.id,
            action: 'task_updated',
            entityType: 'task',
            entityId: input.id,
            projectId: oldTask.project_id,
            metadata: { taskTitle: oldTask.title, projectName },
          })
        }
      }

      return data
    }),

  reorder: orgProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string().uuid(),
        status: z.string(),
        sortOrder: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const item of input.items) {
        await ctx.supabase
          .from('tasks')
          .update({ status: item.status as TaskRow['status'], sort_order: item.sortOrder })
          .eq('id', item.id)
      }
      return { success: true }
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch task before delete for activity log
      const { data: task } = await ctx.supabase
        .from('tasks')
        .select('title, project_id, projects!inner(name)')
        .eq('id', input.id)
        .single<{ title: string; project_id: string; projects: { name: string } }>()

      const { error } = await ctx.supabase
        .from('tasks')
        .delete()
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Log activity
      if (task) {
        logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'task_deleted',
          entityType: 'task',
          entityId: input.id,
          projectId: task.project_id,
          metadata: { taskTitle: task.title, projectName: task.projects?.name ?? '' },
        })
      }

      return { success: true }
    }),
})
