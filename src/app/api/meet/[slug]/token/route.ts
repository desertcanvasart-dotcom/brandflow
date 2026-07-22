import { nanoid } from 'nanoid'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createLiveKitToken } from '@/lib/livekit/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let body: { name: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }

  // Look up the room by slug
  const { data: room, error: roomError } = await supabaseAdmin
    .from('meeting_rooms')
    .select('id, livekit_room_id, is_active, organization_id')
    .eq('slug', slug)
    .single()

  if (roomError || !room) {
    return Response.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.is_active) {
    return Response.json({ error: 'Room is not active' }, { status: 403 })
  }

  // Find or create an active session for this room
  // An active session is one that has no ended_at
  let sessionId: string

  const { data: activeSession } = await supabaseAdmin
    .from('meeting_sessions')
    .select('id')
    .eq('room_id', room.id)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (activeSession) {
    sessionId = activeSession.id
  } else {
    // Create a new session
    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from('meeting_sessions')
      .insert({
        room_id: room.id,
        title: `Session - ${new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })}`,
        source: 'internal',
      })
      .select('id')
      .single()

    if (sessionError || !newSession) {
      return Response.json({ error: 'Failed to create session' }, { status: 500 })
    }
    sessionId = newSession.id
  }

  // Generate guest identity
  const guestIdentity = `guest-${nanoid(8)}`

  // Insert guest as session participant
  await supabaseAdmin.from('session_participants').insert({
    session_id: sessionId,
    user_id: null,
    guest_name: body.name.trim(),
    guest_email: body.email?.trim() ?? null,
    role: 'participant',
    identity: guestIdentity,
    is_present: true,
    joined_at: new Date().toISOString(),
  })

  // Generate LiveKit token for the guest
  const token = await createLiveKitToken(
    room.livekit_room_id,
    guestIdentity,
    body.name.trim(),
    true, // guests can publish audio/video
  )

  return Response.json({
    token,
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    sessionId,
  })
}
