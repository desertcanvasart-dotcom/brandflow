import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { SEO_RESEARCH_PROMPT } from '@/lib/ai/prompts'
import { buildAgentContext } from '@/lib/ai/agent-context'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { brandId, focusTopic, focusUrl } = await req.json()
    const orgId = user.app_metadata?.organization_id as string
    if (!orgId) return new Response('No organization', { status: 403 })

    // Build enriched context — replaces manual brand/content fetching
    const enrichedContext = await buildAgentContext({
      supabase,
      orgId,
      brandId: brandId || undefined,
      agentType: 'seo_research',
      userQuery: focusTopic || focusUrl || 'SEO research',
    })

    const result = streamText({
      model: defaultModel,
      system: SEO_RESEARCH_PROMPT,
      prompt: `${enrichedContext}

--- USER REQUEST ---
${focusTopic ? `Focus Topic: ${focusTopic}` : ''}
${focusUrl ? `Focus URL: ${focusUrl}` : ''}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/seo-research] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
