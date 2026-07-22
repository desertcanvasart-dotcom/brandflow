import { WebhookReceiver } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { triggerPostMeetingAutomation } from '@/lib/meetings/post-meeting'

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
)

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const authHeader = req.headers.get('authorization') || ''
    const event = await receiver.receive(body, authHeader)

    const roomName = event.room?.name
    if (!roomName) {
      return Response.json({ received: true })
    }

    switch (event.event) {
      case 'room_started': {
        // Update legacy meetings table (fix: was using wrong column name 'livekit_room_name')
        await supabaseAdmin
          .from('meetings')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('livekit_room_id', roomName)

        // Check if this is a persistent meeting room
        const { data: meetingRoom } = await supabaseAdmin
          .from('meeting_rooms')
          .select('id')
          .eq('livekit_room_id', roomName)
          .single()

        if (meetingRoom) {
          // Find or create an active session for this room
          const { data: existingSession } = await supabaseAdmin
            .from('meeting_sessions')
            .select('id')
            .eq('room_id', meetingRoom.id)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

          if (!existingSession) {
            // Create a new session
            await supabaseAdmin
              .from('meeting_sessions')
              .insert({
                room_id: meetingRoom.id,
                title: `Session - ${new Date().toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}`,
                source: 'internal',
              })
          }
        }
        break
      }

      case 'room_finished': {
        // Update legacy meetings table
        await supabaseAdmin
          .from('meetings')
          .update({ status: 'completed', ended_at: new Date().toISOString() })
          .eq('livekit_room_id', roomName)

        // Check for persistent meeting room
        const { data: meetingRoom } = await supabaseAdmin
          .from('meeting_rooms')
          .select('id')
          .eq('livekit_room_id', roomName)
          .single()

        if (meetingRoom) {
          // End the active session
          const now = new Date()
          const { data: activeSession } = await supabaseAdmin
            .from('meeting_sessions')
            .select('id, started_at')
            .eq('room_id', meetingRoom.id)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

          if (activeSession) {
            const startedAt = new Date(activeSession.started_at)
            const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000)

            await supabaseAdmin
              .from('meeting_sessions')
              .update({
                ended_at: now.toISOString(),
                duration_seconds: durationSeconds,
              })
              .eq('id', activeSession.id)

            // Mark all participants as not present
            await supabaseAdmin
              .from('session_participants')
              .update({ is_present: false, left_at: now.toISOString() })
              .eq('session_id', activeSession.id)
              .is('left_at', null)

            // Trigger post-meeting automation (fire-and-forget)
            void triggerPostMeetingAutomation(meetingRoom.id, activeSession.id)
          }
        }
        break
      }

      case 'participant_joined': {
        const participantIdentity = event.participant?.identity
        if (!participantIdentity) break

        // Legacy meeting participant tracking
        const { data: meeting } = await supabaseAdmin
          .from('meetings')
          .select('id')
          .eq('livekit_room_id', roomName)
          .single()

        if (meeting) {
          await supabaseAdmin
            .from('meeting_participants')
            .update({ joined_at: new Date().toISOString() })
            .eq('meeting_id', meeting.id)
            .eq('user_id', participantIdentity)
        }

        // Session-based participant tracking (supports guests via identity)
        const { data: meetingRoom } = await supabaseAdmin
          .from('meeting_rooms')
          .select('id')
          .eq('livekit_room_id', roomName)
          .single()

        if (meetingRoom) {
          const { data: activeSession } = await supabaseAdmin
            .from('meeting_sessions')
            .select('id')
            .eq('room_id', meetingRoom.id)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

          if (activeSession) {
            await supabaseAdmin
              .from('session_participants')
              .update({
                is_present: true,
                joined_at: new Date().toISOString(),
                left_at: null,
              })
              .eq('session_id', activeSession.id)
              .eq('identity', participantIdentity)
          }
        }
        break
      }

      case 'participant_left': {
        const participantIdentity = event.participant?.identity
        if (!participantIdentity) break

        // Legacy meeting participant tracking
        const { data: meeting } = await supabaseAdmin
          .from('meetings')
          .select('id')
          .eq('livekit_room_id', roomName)
          .single()

        if (meeting) {
          await supabaseAdmin
            .from('meeting_participants')
            .update({ left_at: new Date().toISOString() })
            .eq('meeting_id', meeting.id)
            .eq('user_id', participantIdentity)
        }

        // Session-based participant tracking
        const { data: meetingRoom } = await supabaseAdmin
          .from('meeting_rooms')
          .select('id')
          .eq('livekit_room_id', roomName)
          .single()

        if (meetingRoom) {
          const { data: activeSession } = await supabaseAdmin
            .from('meeting_sessions')
            .select('id')
            .eq('room_id', meetingRoom.id)
            .is('ended_at', null)
            .order('started_at', { ascending: false })
            .limit(1)
            .single()

          if (activeSession) {
            await supabaseAdmin
              .from('session_participants')
              .update({
                is_present: false,
                left_at: new Date().toISOString(),
              })
              .eq('session_id', activeSession.id)
              .eq('identity', participantIdentity)
          }
        }
        break
      }
    }

    return Response.json({ received: true })
  } catch (err: any) {
    console.error('LiveKit webhook error:', err)
    return Response.json({ error: 'Invalid webhook' }, { status: 400 })
  }
}
