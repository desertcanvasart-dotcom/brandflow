import { WebhookReceiver } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabase/admin'

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
)

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const authHeader = req.headers.get('authorization') || ''
    const event = await receiver.receive(body, authHeader)

    switch (event.event) {
      case 'room_started': {
        const roomName = event.room?.name
        if (roomName) {
          await supabaseAdmin
            .from('meetings')
            .update({ status: 'in_progress', started_at: new Date().toISOString() })
            .eq('livekit_room_name', roomName)
        }
        break
      }
      case 'room_finished': {
        const roomName = event.room?.name
        if (roomName) {
          await supabaseAdmin
            .from('meetings')
            .update({ status: 'completed', ended_at: new Date().toISOString() })
            .eq('livekit_room_name', roomName)
        }
        break
      }
      case 'participant_joined': {
        const roomName = event.room?.name
        const participantIdentity = event.participant?.identity
        if (roomName && participantIdentity) {
          // Update participant joined_at
          const { data: meeting } = await supabaseAdmin
            .from('meetings')
            .select('id')
            .eq('livekit_room_name', roomName)
            .single()

          if (meeting) {
            await supabaseAdmin
              .from('meeting_participants')
              .update({ joined_at: new Date().toISOString() })
              .eq('meeting_id', meeting.id)
              .eq('user_id', participantIdentity)
          }
        }
        break
      }
      case 'participant_left': {
        const roomName = event.room?.name
        const participantIdentity = event.participant?.identity
        if (roomName && participantIdentity) {
          const { data: meeting } = await supabaseAdmin
            .from('meetings')
            .select('id')
            .eq('livekit_room_name', roomName)
            .single()

          if (meeting) {
            await supabaseAdmin
              .from('meeting_participants')
              .update({ left_at: new Date().toISOString() })
              .eq('meeting_id', meeting.id)
              .eq('user_id', participantIdentity)
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
