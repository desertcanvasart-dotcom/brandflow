import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type AutomationRuleRow = Database['public']['Tables']['automation_rules']['Row']

interface TaskContext {
  taskId: string
  projectType?: string
  platform?: string | null
  taskType?: string | null
  serviceType?: string | null
  phaseName?: string | null
  tags?: string[]
}

interface RuleConditions {
  project_type?: string
  platform?: string
  task_type?: string
  service_type?: string
  task_phase?: string
  tags?: string[]
  match_all?: boolean
}

interface RuleAction {
  type: 'assign_member' | 'round_robin' | 'assign_department' | 'set_priority'
  member_id?: string
  member_ids?: string[]
  department_id?: string
  priority?: number
  due_offset_days?: number
}

/**
 * Evaluate all active automation rules for an organization against the given task context.
 * Applies matching rules in priority order. Supports:
 * - Conditions: project_type, platform, task_type, service_type, task_phase, tags
 * - Actions: assign_member, round_robin, assign_department, set_priority
 */
export async function evaluateRules(
  supabase: SupabaseClient<Database>,
  orgId: string,
  context: TaskContext
): Promise<{ assigneeId?: string; applied: number }> {
  try {
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('rule_type', 'auto_assign')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .returns<AutomationRuleRow[]>()

    if (!rules || rules.length === 0) return { applied: 0 }

    let assigneeId: string | undefined
    let applied = 0

    for (const rule of rules) {
      const conditions = rule.conditions as unknown as RuleConditions
      const action = rule.action as unknown as RuleAction

      if (!matchesConditions(conditions, context)) continue

      // Apply the action
      const result = await applyAction(supabase, context.taskId, action)
      if (result.assigneeId) assigneeId = result.assigneeId
      applied++

      // For assignment-type actions, only apply the first match
      if (action.type === 'assign_member' || action.type === 'round_robin' || action.type === 'assign_department') {
        break
      }
    }

    return { assigneeId, applied }
  } catch (error) {
    console.error('[evaluate-rules] Failed:', error)
    return { applied: 0 }
  }
}

function matchesConditions(conditions: RuleConditions, context: TaskContext): boolean {
  const checks: boolean[] = []

  if (conditions.project_type) {
    checks.push(conditions.project_type === context.projectType)
  }

  if (conditions.platform) {
    checks.push(conditions.platform === context.platform)
  }

  if (conditions.task_type) {
    checks.push(conditions.task_type === context.taskType)
  }

  if (conditions.service_type) {
    checks.push(conditions.service_type === context.serviceType)
  }

  if (conditions.task_phase) {
    checks.push(
      conditions.task_phase.toLowerCase() === (context.phaseName ?? '').toLowerCase()
    )
  }

  if (conditions.tags && conditions.tags.length > 0 && context.tags) {
    const hasMatchingTag = conditions.tags.some((t) => context.tags?.includes(t))
    checks.push(hasMatchingTag)
  }

  // If no conditions, rule matches everything
  if (checks.length === 0) return true

  // AND vs OR logic
  if (conditions.match_all) {
    return checks.every(Boolean)
  }
  return checks.some(Boolean)
}

async function applyAction(
  supabase: SupabaseClient<Database>,
  taskId: string,
  action: RuleAction
): Promise<{ assigneeId?: string }> {
  const updates: Record<string, unknown> = {}

  if (action.type === 'assign_member' && action.member_id) {
    updates.assignee_id = action.member_id
  } else if (action.type === 'round_robin' && action.member_ids?.length) {
    // Load balancing: pick member with fewest active tasks
    const counts: { userId: string; count: number }[] = []
    for (const memberId of action.member_ids) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', memberId)
        .not('status', 'in', '("done","published")')

      counts.push({ userId: memberId, count: count ?? 0 })
    }
    counts.sort((a, b) => a.count - b.count)
    if (counts[0]) {
      updates.assignee_id = counts[0].userId
    }
  } else if (action.type === 'assign_department' && action.department_id) {
    // Assign to a random active member in the department with fewest tasks
    const { data: deptMembers } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('department_id', action.department_id)
      .eq('is_active', true)

    if (deptMembers?.length) {
      const counts: { userId: string; count: number }[] = []
      for (const m of deptMembers) {
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', m.user_id)
          .not('status', 'in', '("done","published")')

        counts.push({ userId: m.user_id, count: count ?? 0 })
      }
      counts.sort((a, b) => a.count - b.count)
      if (counts[0]) {
        updates.assignee_id = counts[0].userId
      }
    }
  } else if (action.type === 'set_priority' && action.priority !== undefined) {
    updates.sort_order = action.priority
  }

  // Apply due offset if specified
  if (action.due_offset_days) {
    const due = new Date()
    due.setDate(due.getDate() + action.due_offset_days)
    updates.due_date = due.toISOString().split('T')[0]
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
  }

  return { assigneeId: updates.assignee_id as string | undefined }
}
