import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { CTA_SUGGESTION_PROMPT } from '@/lib/ai/prompts'
import { buildAgentContext } from '@/lib/ai/agent-context'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { brandId, context, purpose, placement } = await req.json()
    const orgId = user.app_metadata?.organization_id as string
    if (!orgId) return new Response('No organization', { status: 403 })

    const enrichedContext = await buildAgentContext({
      supabase,
      orgId,
      brandId: brandId || undefined,
      agentType: 'cta_suggestion',
      userQuery: purpose || 'CTA suggestion',
    })

    const result = streamText({
      model: defaultModel,
      system: CTA_SUGGESTION_PROMPT,
      prompt: `${enrichedContext}

--- USER REQUEST ---
Industry/Context: ${context || 'N/A'}
CTA Purpose: ${purpose || 'N/A'}
Placement: ${placement || 'button'}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/generate-cta] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
