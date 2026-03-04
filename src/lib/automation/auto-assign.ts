import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type AutomationRuleRow = Database['public']['Tables']['automation_rules']['Row']

interface AutoAssignParams {
  supabase: SupabaseClient<Database>
  orgId: string
  taskId: string
  projectType: string
  platform?: string | null
  tags?: string[]
}

interface RuleConditions {
  project_type?: string
  platform?: string
  tags?: string[]
  match_all?: boolean
}

interface RuleAction {
  type: 'assign_member' | 'round_robin'
  member_id?: string
  member_ids?: string[]
}

export async function applyAutoAssignment(params: AutoAssignParams): Promise<string | null> {
  try {
    // Fetch active auto_assign rules for this org
    const { data: rules } = await params.supabase
      .from('automation_rules')
      .select('*')
      .eq('organization_id', params.orgId)
      .eq('rule_type', 'auto_assign')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .returns<AutomationRuleRow[]>()

    if (!rules || rules.length === 0) return null

    for (const rule of rules) {
      const conditions = rule.conditions as unknown as RuleConditions
      const action = rule.action as unknown as RuleAction

      if (!matchesConditions(conditions, params)) continue

      // Resolve the assignee
      const assigneeId = await resolveAssignee(params.supabase, action)
      if (!assigneeId) continue

      // Update the task
      await params.supabase
        .from('tasks')
        .update({ assignee_id: assigneeId })
        .eq('id', params.taskId)

      return assigneeId
    }

    return null
  } catch (error) {
    console.error('[auto-assign] Failed:', error)
    return null
  }
}

function matchesConditions(conditions: RuleConditions, params: AutoAssignParams): boolean {
  const checks: boolean[] = []

  if (conditions.project_type) {
    checks.push(conditions.project_type === params.projectType)
  }

  if (conditions.platform) {
    checks.push(conditions.platform === params.platform)
  }

  if (conditions.tags && conditions.tags.length > 0 && params.tags) {
    const hasMatchingTag = conditions.tags.some((t) => params.tags?.includes(t))
    checks.push(hasMatchingTag)
  }

  // If no conditions specified, the rule matches everything
  if (checks.length === 0) return true

  // match_all = AND logic, otherwise OR logic
  if (conditions.match_all) {
    return checks.every(Boolean)
  }
  return checks.some(Boolean)
}

async function resolveAssignee(
  supabase: SupabaseClient<Database>,
  action: RuleAction
): Promise<string | null> {
  if (action.type === 'assign_member' && action.member_id) {
    return action.member_id
  }

  if (action.type === 'round_robin' && action.member_ids && action.member_ids.length > 0) {
    // Get task counts for each member (active tasks only)
    const counts: { userId: string; count: number }[] = []

    for (const memberId of action.member_ids) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', memberId)
        .not('status', 'in', '("done","published")')

      counts.push({ userId: memberId, count: count ?? 0 })
    }

    // Return member with fewest active tasks
    counts.sort((a, b) => a.count - b.count)
    return counts[0]?.userId ?? null
  }

  return null
}
