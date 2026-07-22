import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure } from '../init'
import { subDays, startOfDay, startOfWeek, startOfMonth, format } from 'date-fns'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PLATFORM_LABELS } from '@/lib/constants'
import type { TaskStatus, ContentPlatform } from '@/types/enums'
import { generateText } from 'ai'
import { defaultModel } from '@/lib/ai/provider'

const analyticsInput = z.object({
  brandId: z.string().uuid().optional(),
  dateRange: z.enum(['7d', '30d', '90d', 'year', 'all']).optional().default('30d'),
})

function getDaysForRange(range: string): number | null {
  if (range === 'all') return null
  if (range === '7d') return 7
  if (range === '30d') return 30
  if (range === '90d') return 90
  if (range === 'year') return 365
  return 30
}

function getDateFrom(range: string): string | null {
  const days = getDaysForRange(range)
  if (days === null) return null
  return subDays(new Date(), days).toISOString()
}

function getPrevDateRange(range: string): { from: string; to: string } | null {
  const days = getDaysForRange(range)
  if (days === null) return null
  const to = subDays(new Date(), days).toISOString()
  const from = subDays(new Date(), days * 2).toISOString()
  return { from, to }
}

const COMPLETED_STATUSES: TaskStatus[] = ['done', 'published']

export const analyticsRouter = createTRPCRouter({
  overview: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      // Get projects
      let projectQuery = ctx.supabase
        .from('projects')
        .select('id, status')
        .eq('organization_id', ctx.orgId)
      if (input.brandId) projectQuery = projectQuery.eq('brand_id', input.brandId)
      const { data: projects } = await projectQuery

      const projectIds = (projects ?? []).map((p) => p.id)
      const activeProjects = (projects ?? []).filter((p) => p.status === 'active').length

      // Get brand count
      let brandQuery = ctx.supabase
        .from('brands')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', ctx.orgId)
        .eq('is_active', true)
      if (input.brandId) brandQuery = brandQuery.eq('id', input.brandId)
      const { count: totalBrands } = await brandQuery

      if (projectIds.length === 0) {
        return { totalBrands: totalBrands ?? 0, activeProjects: 0, tasksCompleted: 0, overdueTasks: 0, totalTasks: 0 }
      }

      // Get tasks
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, status, due_date, updated_at')
        .in('project_id', projectIds)

      const allTasks = tasks ?? []
      const now = new Date().toISOString()
      const dateFrom = getDateFrom(input.dateRange ?? '30d')

      const tasksCompleted = allTasks.filter(
        (t) =>
          COMPLETED_STATUSES.includes(t.status as TaskStatus) &&
          (!dateFrom || t.updated_at >= dateFrom)
      ).length

      const overdueTasks = allTasks.filter(
        (t) =>
          t.due_date &&
          t.due_date < now &&
          !COMPLETED_STATUSES.includes(t.status as TaskStatus)
      ).length

      // Compute previous period trend data
      const prevRange = getPrevDateRange(input.dateRange ?? '30d')
      let prevTasksCompleted = 0
      let prevOverdueTasks = 0
      let prevActiveProjects = 0

      if (prevRange) {
        prevTasksCompleted = allTasks.filter(
          (t) =>
            COMPLETED_STATUSES.includes(t.status as TaskStatus) &&
            t.updated_at >= prevRange.from &&
            t.updated_at < prevRange.to
        ).length

        prevOverdueTasks = allTasks.filter(
          (t) =>
            t.due_date &&
            t.due_date < prevRange.to &&
            t.due_date >= prevRange.from &&
            !COMPLETED_STATUSES.includes(t.status as TaskStatus)
        ).length

        // Previous active projects — approximate by counting projects created before range end
        prevActiveProjects = (projects ?? []).filter(
          (p) => p.status === 'active'
        ).length
      }

      return {
        totalBrands: totalBrands ?? 0,
        activeProjects,
        tasksCompleted,
        overdueTasks,
        totalTasks: allTasks.length,
        prevTasksCompleted,
        prevOverdueTasks,
        prevActiveProjects,
      }
    }),

  tasksByStatus: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const projectIds = await getProjectIds(ctx, input.brandId)
      if (projectIds.length === 0) return []

      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('status')
        .in('project_id', projectIds)

      const counts: Record<string, number> = {}
      for (const t of tasks ?? []) {
        counts[t.status] = (counts[t.status] || 0) + 1
      }

      return Object.entries(counts).map(([status, count]) => ({
        status,
        label: TASK_STATUS_LABELS[status as TaskStatus] ?? status,
        count,
        color: TASK_STATUS_COLORS[status as TaskStatus] ?? '#6B7280',
      }))
    }),

  tasksOverTime: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const projectIds = await getProjectIds(ctx, input.brandId)
      if (projectIds.length === 0) return []

      const dateFrom = getDateFrom(input.dateRange ?? '30d')

      let query = ctx.supabase
        .from('tasks')
        .select('status, created_at, updated_at')
        .in('project_id', projectIds)
      if (dateFrom) query = query.gte('created_at', dateFrom)

      const { data: tasks } = await query
      const allTasks = tasks ?? []

      // Also fetch tasks completed in range (may have been created earlier)
      let completedTasks = allTasks.filter((t) =>
        COMPLETED_STATUSES.includes(t.status as TaskStatus)
      )
      if (dateFrom) {
        // Also get tasks created before range but completed in range
        const { data: olderCompleted } = await ctx.supabase
          .from('tasks')
          .select('status, created_at, updated_at')
          .in('project_id', projectIds)
          .lt('created_at', dateFrom)
          .gte('updated_at', dateFrom)
          .in('status', COMPLETED_STATUSES)

        completedTasks = [
          ...completedTasks,
          ...(olderCompleted ?? []),
        ]
      }

      const range = input.dateRange ?? '30d'
      const bucketFn =
        range === '7d'
          ? (d: string) => format(startOfDay(new Date(d)), 'MMM d')
          : range === 'all' || range === 'year'
            ? (d: string) => format(startOfMonth(new Date(d)), 'MMM yyyy')
            : (d: string) => format(startOfWeek(new Date(d)), 'MMM d')

      const createdBuckets: Record<string, number> = {}
      for (const t of allTasks) {
        const key = bucketFn(t.created_at)
        createdBuckets[key] = (createdBuckets[key] || 0) + 1
      }

      const completedBuckets: Record<string, number> = {}
      for (const t of completedTasks) {
        const key = bucketFn(t.updated_at)
        completedBuckets[key] = (completedBuckets[key] || 0) + 1
      }

      const allKeys = [...new Set([...Object.keys(createdBuckets), ...Object.keys(completedBuckets)])]
      allKeys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

      return allKeys.map((date) => ({
        date,
        created: createdBuckets[date] ?? 0,
        completed: completedBuckets[date] ?? 0,
      }))
    }),

  projectProgress: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('projects')
        .select('id, name, status, brands(name)')
        .eq('organization_id', ctx.orgId)
        .eq('status', 'active')
      if (input.brandId) query = query.eq('brand_id', input.brandId)

      const { data: projects } = await query
      if (!projects || projects.length === 0) return []

      const projectIds = projects.map((p) => p.id)
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('project_id, status')
        .in('project_id', projectIds)

      const tasksByProject: Record<string, { total: number; completed: number }> = {}
      for (const t of tasks ?? []) {
        if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = { total: 0, completed: 0 }
        tasksByProject[t.project_id].total++
        if (COMPLETED_STATUSES.includes(t.status as TaskStatus)) {
          tasksByProject[t.project_id].completed++
        }
      }

      return projects
        .map((p) => {
          const stats = tasksByProject[p.id] ?? { total: 0, completed: 0 }
          const brandData = p.brands as unknown as { name: string } | null
          return {
            projectId: p.id,
            projectName: p.name,
            brandName: brandData?.name ?? '',
            total: stats.total,
            completed: stats.completed,
            percent: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
          }
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
    }),

  teamWorkload: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const { data: members } = await ctx.supabase
        .from('organization_members')
        .select('user_id, display_name')
        .eq('organization_id', ctx.orgId)
        .eq('is_active', true)

      if (!members || members.length === 0) return []

      const projectIds = await getProjectIds(ctx, input.brandId)
      if (projectIds.length === 0) {
        return members.map((m) => ({
          userId: m.user_id,
          displayName: m.display_name ?? 'Unknown',
          assigned: 0,
          completed: 0,
          inProgress: 0,
          overdue: 0,
        }))
      }

      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('assignee_id, status, due_date')
        .in('project_id', projectIds)
        .not('assignee_id', 'is', null)

      const now = new Date().toISOString()
      const byMember: Record<string, { assigned: number; completed: number; inProgress: number; overdue: number }> = {}

      for (const t of tasks ?? []) {
        if (!t.assignee_id) continue
        if (!byMember[t.assignee_id]) byMember[t.assignee_id] = { assigned: 0, completed: 0, inProgress: 0, overdue: 0 }
        byMember[t.assignee_id].assigned++
        if (COMPLETED_STATUSES.includes(t.status as TaskStatus)) {
          byMember[t.assignee_id].completed++
        }
        if (t.status === 'in_progress') {
          byMember[t.assignee_id].inProgress++
        }
        if (t.due_date && t.due_date < now && !COMPLETED_STATUSES.includes(t.status as TaskStatus)) {
          byMember[t.assignee_id].overdue++
        }
      }

      return members
        .map((m) => ({
          userId: m.user_id,
          displayName: m.display_name ?? 'Unknown',
          ...(byMember[m.user_id] ?? { assigned: 0, completed: 0, inProgress: 0, overdue: 0 }),
        }))
        .filter((m) => m.assigned > 0)
        .sort((a, b) => b.assigned - a.assigned)
    }),

  contentByPlatform: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const projectIds = await getProjectIds(ctx, input.brandId)
      if (projectIds.length === 0) return []

      // Get task IDs for these projects
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id')
        .in('project_id', projectIds)

      const taskIds = (tasks ?? []).map((t) => t.id)
      if (taskIds.length === 0) return []

      const { data: contentItems } = await ctx.supabase
        .from('content_items')
        .select('platform')
        .in('task_id', taskIds)

      const counts: Record<string, number> = {}
      for (const c of contentItems ?? []) {
        counts[c.platform] = (counts[c.platform] || 0) + 1
      }

      return Object.entries(counts)
        .map(([platform, count]) => ({
          platform,
          label: PLATFORM_LABELS[platform as ContentPlatform] ?? platform,
          count,
        }))
        .sort((a, b) => b.count - a.count)
    }),

  contentByStatus: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const projectIds = await getProjectIds(ctx, input.brandId)
      if (projectIds.length === 0) return []

      // Get tasks that have content items
      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, status')
        .in('project_id', projectIds)

      const taskIds = (tasks ?? []).map((t) => t.id)
      if (taskIds.length === 0) return []

      const { data: contentItems } = await ctx.supabase
        .from('content_items')
        .select('task_id')
        .in('task_id', taskIds)

      // Map content items to their task status
      const taskStatusMap: Record<string, string> = {}
      for (const t of tasks ?? []) {
        taskStatusMap[t.id] = t.status
      }

      const CONTENT_STAGES: Record<string, { label: string; color: string; statuses: string[] }> = {
        draft: { label: 'Draft', color: '#6B7280', statuses: ['backlog', 'todo', 'in_progress'] },
        review: { label: 'In Review', color: '#F59E0B', statuses: ['in_review', 'client_review'] },
        approved: { label: 'Approved', color: '#10B981', statuses: ['approved'] },
        scheduled: { label: 'Scheduled', color: '#06B6D4', statuses: ['scheduled'] },
        published: { label: 'Published', color: '#059669', statuses: ['published', 'done'] },
      }

      const stageCounts: Record<string, number> = {}
      for (const c of contentItems ?? []) {
        const taskStatus = taskStatusMap[c.task_id]
        for (const [stage, config] of Object.entries(CONTENT_STAGES)) {
          if (config.statuses.includes(taskStatus)) {
            stageCounts[stage] = (stageCounts[stage] || 0) + 1
            break
          }
        }
      }

      return Object.entries(CONTENT_STAGES).map(([key, config]) => ({
        status: key,
        label: config.label,
        count: stageCounts[key] ?? 0,
        color: config.color,
      }))
    }),

  drillDown: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        status: z.string().optional(),
        assigneeId: z.string().uuid().optional(),
        projectId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const projectIds = input.projectId
        ? [input.projectId]
        : await getProjectIds(ctx, input.brandId)
      if (projectIds.length === 0) return []

      let query = ctx.supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, assignee_id, project_id, projects(name)')
        .in('project_id', projectIds)
        .order('updated_at', { ascending: false })
        .limit(input.limit)

      if (input.status) query = query.eq('status', input.status)
      if (input.assigneeId) query = query.eq('assignee_id', input.assigneeId)

      const { data } = await query
      return (data ?? []) as {
        id: string
        title: string
        status: string
        priority: number
        due_date: string | null
        assignee_id: string | null
        project_id: string
        projects: { name: string }
      }[]
    }),

  compareOverview: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        rangeA: z.enum(['7d', '30d', '90d', 'year', 'all']),
        rangeB: z.enum(['7d', '30d', '90d', 'year', 'all']),
      })
    )
    .query(async ({ ctx, input }) => {
      const projectIds = await getProjectIds(ctx, input.brandId)

      if (projectIds.length === 0) {
        const empty = { tasksCompleted: 0, tasksCreated: 0, overdueTasks: 0, totalTasks: 0 }
        return { a: empty, b: empty }
      }

      const { data: tasks } = await ctx.supabase
        .from('tasks')
        .select('id, status, due_date, created_at, updated_at')
        .in('project_id', projectIds)

      const allTasks = tasks ?? []
      const now = new Date().toISOString()

      function computeMetrics(range: string) {
        const dateFrom = getDateFrom(range)
        const created = allTasks.filter((t) => !dateFrom || t.created_at >= dateFrom).length
        const completed = allTasks.filter(
          (t) => COMPLETED_STATUSES.includes(t.status as TaskStatus) && (!dateFrom || t.updated_at >= dateFrom)
        ).length
        const overdue = allTasks.filter(
          (t) => t.due_date && t.due_date < now && !COMPLETED_STATUSES.includes(t.status as TaskStatus)
        ).length
        return { tasksCompleted: completed, tasksCreated: created, overdueTasks: overdue, totalTasks: allTasks.length }
      }

      return {
        a: computeMetrics(input.rangeA),
        b: computeMetrics(input.rangeB),
      }
    }),

  insights: orgProcedure
    .input(analyticsInput)
    .query(async ({ ctx, input }) => {
      const projectIds = await getProjectIds(ctx, input.brandId)

      // Gather metrics
      const dateFrom = getDateFrom(input.dateRange ?? '30d')
      let tasks: { status: string; due_date: string | null; assignee_id: string | null; updated_at: string }[] = []
      if (projectIds.length > 0) {
        const { data } = await ctx.supabase
          .from('tasks')
          .select('status, due_date, assignee_id, updated_at')
          .in('project_id', projectIds)
        tasks = data ?? []
      }

      const now = new Date().toISOString()
      const totalTasks = tasks.length
      const completed = tasks.filter(
        (t) => COMPLETED_STATUSES.includes(t.status as TaskStatus) && (!dateFrom || t.updated_at >= dateFrom)
      ).length
      const overdue = tasks.filter(
        (t) => t.due_date && t.due_date < now && !COMPLETED_STATUSES.includes(t.status as TaskStatus)
      ).length
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length
      const inReview = tasks.filter((t) => t.status === 'in_review' || t.status === 'client_review').length
      const blocked = tasks.filter((t) => t.status === 'blocked').length

      // Team workload summary
      const assigneeCounts: Record<string, number> = {}
      for (const t of tasks) {
        if (t.assignee_id) assigneeCounts[t.assignee_id] = (assigneeCounts[t.assignee_id] || 0) + 1
      }
      const teamSize = Object.keys(assigneeCounts).length
      const avgTasksPerMember = teamSize > 0 ? Math.round(totalTasks / teamSize) : 0
      const maxAssigned = teamSize > 0 ? Math.max(...Object.values(assigneeCounts)) : 0

      if (totalTasks === 0) {
        return { insights: [] }
      }

      const dateLabel = input.dateRange === '7d' ? 'last 7 days' : input.dateRange === '30d' ? 'last 30 days' : input.dateRange === '90d' ? 'last 90 days' : input.dateRange === 'year' ? 'last year' : 'all time'

      const { text } = await generateText({
        model: defaultModel,
        system: `You are a digital agency analytics advisor. Given metrics, return exactly 3-5 brief, actionable insights as a JSON array of strings. Each insight should be one sentence, specific and data-driven. Focus on: task velocity, bottlenecks, team capacity, deadlines. Do NOT use markdown. Return ONLY a JSON array like: ["insight 1", "insight 2", "insight 3"]`,
        prompt: `Agency metrics for ${dateLabel}:
- Total tasks: ${totalTasks}
- Completed in period: ${completed}
- In progress: ${inProgress}
- In review: ${inReview}
- Blocked: ${blocked}
- Overdue: ${overdue}
- Team members with tasks: ${teamSize}
- Avg tasks per member: ${avgTasksPerMember}
- Max tasks on one member: ${maxAssigned}
- Completion rate: ${totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0}%`,
      })

      try {
        const insights = JSON.parse(text.trim()) as string[]
        return { insights: insights.slice(0, 5) }
      } catch {
        // If parsing fails, split by newlines
        const lines = text.split('\n').filter((l) => l.trim().length > 0).slice(0, 5)
        return { insights: lines }
      }
    }),
})

// Helper to get project IDs for org, optionally filtered by brand
async function getProjectIds(
  ctx: { supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never; orgId: string },
  brandId?: string
): Promise<string[]> {
  let query = ctx.supabase
    .from('projects')
    .select('id')
    .eq('organization_id', ctx.orgId)
  if (brandId) query = query.eq('brand_id', brandId)
  const { data } = await query
  return (data ?? []).map((p) => p.id)
}
