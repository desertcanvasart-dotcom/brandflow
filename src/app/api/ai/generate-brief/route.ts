import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { BRIEF_GENERATOR_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { meetingSummary, projectType, brandGuidelines, briefType } = await req.json()

    const result = streamText({
      model: defaultModel,
      system: BRIEF_GENERATOR_PROMPT,
      prompt: `Brief Type: ${briefType || 'content_brief'}
Project Type: ${projectType || 'content_ops'}
Brand Guidelines: ${brandGuidelines || 'N/A'}

Meeting Summary:
${meetingSummary}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/generate-brief] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
