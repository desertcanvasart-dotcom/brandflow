import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { PERFORMANCE_REPORT_PROMPT } from '@/lib/ai/prompts'
import { buildAgentContext } from '@/lib/ai/agent-context'
import { subDays } from 'date-fns'

const COMPLETED_STATUSES = ['done', 'published']

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { brandId, dateRange = '30d', reportFocus = 'overview' } = await req.json()
    const orgId = user.app_metadata?.organization_id as string
    if (!orgId) return new Response('No organization', { status: 403 })

    // Fetch projects
    let projectQuery = supabase
      .from('projects')
      .select('id, name, status')
      .eq('organization_id', orgId)
    if (brandId) projectQuery = projectQuery.eq('brand_id', brandId)
    const { data: projects } = await projectQuery
    const projectIds = (projects ?? []).map((p) => p.id)

    const dateFrom = dateRange === 'all'
      ? null
      : subDays(new Date(), dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90).toISOString()

    // Fetch tasks
    type TaskRow = { id: string; status: string; due_date: string | null; assignee_id: string | null; created_at: string; updated_at: string; project_id: string }
    let tasks: TaskRow[] = []
    if (projectIds.length > 0) {
      const { data } = await supabase
        .from('tasks')
        .select('id, status, due_date, assignee_id, created_at, updated_at, project_id')
        .in('project_id', projectIds)
      tasks = (data ?? []) as TaskRow[]
    }

    // Compute overview metrics
    const now = new Date().toISOString()
    const totalTasks = tasks.length
    const tasksCompleted = tasks.filter(
      (t) => COMPLETED_STATUSES.includes(t.status) && (!dateFrom || t.updated_at >= dateFrom)
    ).length
    const overdueTasks = tasks.filter(
      (t) => t.due_date && t.due_date < now && !COMPLETED_STATUSES.includes(t.status)
    ).length
    const activeProjects = (projects ?? []).filter((p) => p.status === 'active').length

    // Tasks by status
    const statusCounts: Record<string, number> = {}
    tasks.forEach((t) => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1 })

    // Project progress
    const projectProgress = (projects ?? [])
      .filter((p) => p.status === 'active')
      .map((p) => {
        const pTasks = tasks.filter((t) => t.project_id === p.id)
        const pCompleted = pTasks.filter((t) => COMPLETED_STATUSES.includes(t.status)).length
        const pct = pTasks.length > 0 ? Math.round((pCompleted / pTasks.length) * 100) : 0
        return `${p.name}: ${pCompleted}/${pTasks.length} tasks completed (${pct}%)`
      })
      .join('\n')

    // Team workload
    let teamData = ''
    if (reportFocus === 'overview' || reportFocus === 'team') {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, display_name')
        .eq('organization_id', orgId)
        .eq('is_active', true)

      const byMember: Record<string, { name: string; assigned: number; completed: number; overdue: number }> = {}
      for (const m of members ?? []) {
        byMember[m.user_id] = { name: m.display_name || 'Unknown', assigned: 0, completed: 0, overdue: 0 }
      }
      for (const t of tasks) {
        if (t.assignee_id && byMember[t.assignee_id]) {
          byMember[t.assignee_id].assigned++
          if (COMPLETED_STATUSES.includes(t.status)) byMember[t.assignee_id].completed++
          if (t.due_date && t.due_date < now && !COMPLETED_STATUSES.includes(t.status)) {
            byMember[t.assignee_id].overdue++
          }
        }
      }
      teamData = Object.values(byMember)
        .filter((m) => m.assigned > 0)
        .map((m) => `${m.name}: ${m.assigned} assigned, ${m.completed} completed, ${m.overdue} overdue`)
        .join('\n')
    }

    // Content by platform
    let contentData = ''
    if (reportFocus === 'overview' || reportFocus === 'content') {
      const taskIds = tasks.map((t) => t.id)
      if (taskIds.length > 0) {
        const { data: contentItems } = await supabase
          .from('content_items')
          .select('platform, task_id')
          .in('task_id', taskIds)
        const platformCounts: Record<string, number> = {}
        for (const c of contentItems ?? []) {
          platformCounts[c.platform] = (platformCounts[c.platform] || 0) + 1
        }
        contentData = Object.entries(platformCounts)
          .map(([p, c]) => `${p}: ${c}`)
          .join(', ')
      }
    }

    // Brand context
    let brandName = 'All brands'
    if (brandId) {
      const { data: brand } = await supabase.from('brands').select('name').eq('id', brandId).single()
      brandName = brand?.name || 'Unknown brand'
    }

    const dateLabel =
      dateRange === '7d' ? 'Last 7 days' :
      dateRange === '30d' ? 'Last 30 days' :
      dateRange === '90d' ? 'Last 90 days' : 'All time'

    // Build enriched context (strategy, RAG, feedback layers — additive to analytics)
    const enrichedContext = await buildAgentContext({
      supabase,
      orgId,
      brandId: brandId || undefined,
      agentType: 'performance_report',
      userQuery: `performance report ${reportFocus} ${dateLabel}`,
    })

    const result = streamText({
      model: defaultModel,
      system: PERFORMANCE_REPORT_PROMPT,
      prompt: `${enrichedContext}

--- USER REQUEST ---
Report Scope: ${brandName}
Date Range: ${dateLabel}
Report Focus: ${reportFocus}

--- ANALYTICS DATA: OVERVIEW ---
Active Projects: ${activeProjects}
Total Tasks: ${totalTasks}
Tasks Completed (in period): ${tasksCompleted}
Overdue Tasks: ${overdueTasks}

--- ANALYTICS DATA: TASKS BY STATUS ---
${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join('\n') || 'No tasks'}

--- ANALYTICS DATA: PROJECT PROGRESS ---
${projectProgress || 'No active projects'}

${teamData ? `--- ANALYTICS DATA: TEAM WORKLOAD ---\n${teamData}` : ''}

${contentData ? `--- ANALYTICS DATA: CONTENT BY PLATFORM ---\n${contentData}` : ''}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/performance-report] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
