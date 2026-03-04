import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/deepgram/transcribe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { meetingId, audioUrl } = await req.json()
  if (!meetingId || !audioUrl) {
    return Response.json({ error: 'meetingId and audioUrl are required' }, { status: 400 })
  }

  try {
    const { transcript, paragraphs } = await transcribeAudio(audioUrl)

    // Update the meeting with transcript
    const { error } = await supabaseAdmin
      .from('meetings')
      .update({
        transcript,
        status: 'completed' as const,
      })
      .eq('id', meetingId)

    if (error) throw error

    return Response.json({ success: true, transcript, paragraphs })
  } catch (err: any) {
    console.error('Transcription error:', err)
    return Response.json({ error: err.message || 'Transcription failed' }, { status: 500 })
  }
}
