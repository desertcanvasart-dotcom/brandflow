import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { MEETING_SUMMARIZER_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { meetingId, transcript, meetingType, projectType, brandName } = await req.json()

    const result = streamText({
      model: defaultModel,
      system: MEETING_SUMMARIZER_PROMPT,
      prompt: `Meeting Type: ${meetingType || 'general'}
Project Type: ${projectType || 'general'}
Brand: ${brandName || 'N/A'}

Transcript:
${transcript}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/summarize] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
