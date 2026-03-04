import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ActivityAction, ActivityEntityType } from '@/types/enums'

export async function logActivity(params: {
  supabase: SupabaseClient<Database>
  orgId: string
  actorId: string
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: string
  projectId?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await params.supabase.from('activity_logs').insert({
      organization_id: params.orgId,
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      project_id: params.projectId ?? null,
      metadata: (params.metadata ?? {}) as Database['public']['Tables']['activity_logs']['Insert']['metadata'],
    })
  } catch (error) {
    console.error('[activity] Failed to log:', error)
  }
}
