import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { CONTENT_DRAFTER_PROMPT } from '@/lib/ai/prompts'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { brief, platform, brandGuidelines, brandVoice, additionalContext } = await req.json()

  const result = streamText({
    model: defaultModel,
    system: CONTENT_DRAFTER_PROMPT,
    prompt: `Platform: ${platform || 'general'}
Brand Voice: ${brandVoice || 'professional'}
Brand Guidelines: ${brandGuidelines || 'N/A'}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}

Brief:
${brief}`,
  })

  return result.toTextStreamResponse()
}
