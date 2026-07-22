import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/activity/log'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = user.app_metadata?.organization_id as string
  if (!orgId) {
    return Response.json({ error: 'No organization' }, { status: 403 })
  }

  // Deactivate the connection
  const { error } = await supabaseAdmin
    .from('google_calendar_connections')
    .update({ is_active: false })
    .eq('organization_id', orgId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[google-calendar] Failed to disconnect:', error.message)
    return Response.json({ error: 'Failed to disconnect' }, { status: 500 })
  }

  // Log the activity
  await logActivity({
    supabase: supabaseAdmin as any,
    orgId,
    actorId: user.id,
    action: 'calendar_disconnected',
    entityType: 'calendar',
    entityId: orgId,
  })

  return Response.json({ success: true })
}
