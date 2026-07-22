import { createClient } from '@/lib/supabase/server'
import { addToBrief } from '@/lib/meetings/transcript-actions'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = user.app_metadata?.organization_id as string
  if (!orgId) return Response.json({ error: 'No organization' }, { status: 403 })

  const { content, projectId, sessionId } = (await req.json()) as {
    content: string
    projectId?: string
    sessionId?: string
  }

  if (!content?.trim()) {
    return Response.json({ error: 'Content is required' }, { status: 400 })
  }

  // If only sessionId provided, look up the projectId from the room
  let resolvedProjectId = projectId
  if (!resolvedProjectId && sessionId) {
    const { data: session } = await supabase
      .from('meeting_sessions')
      .select('room_id')
      .eq('id', sessionId)
      .single()

    if (session) {
      const { data: room } = await supabase
        .from('meeting_rooms')
        .select('project_id')
        .eq('id', session.room_id)
        .single()

      resolvedProjectId = room?.project_id ?? undefined
    }
  }

  if (!resolvedProjectId) {
    return Response.json({ error: 'Could not determine project' }, { status: 400 })
  }

  const result = await addToBrief({
    supabase,
    orgId,
    projectId: resolvedProjectId,
    content: content.trim(),
    sourceSessionId: sessionId,
    userId: user.id,
  })

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 500 })
  }

  return Response.json({ success: true, intakeId: result.intakeId })
}
