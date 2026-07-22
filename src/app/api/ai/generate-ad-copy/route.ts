import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { AD_COPY_GENERATOR_PROMPT } from '@/lib/ai/prompts'
import { buildAgentContext } from '@/lib/ai/agent-context'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { brandId, objective, targetAudience, platform, cta, brandGuidelines, brandVoice } = await req.json()
    const orgId = user.app_metadata?.organization_id as string
    if (!orgId) return new Response('No organization', { status: 403 })

    // Build enriched context from all 4 layers
    const enrichedContext = await buildAgentContext({
      supabase,
      orgId,
      brandId: brandId || undefined,
      agentType: 'ad_copy',
      userQuery: objective || 'ad copy generation',
    })

    const result = streamText({
      model: defaultModel,
      system: AD_COPY_GENERATOR_PROMPT,
      prompt: `${enrichedContext}

--- USER REQUEST ---
Ad Platform: ${platform || 'Meta Ads'}
Campaign Objective: ${objective || 'N/A'}
Target Audience: ${targetAudience || 'N/A'}
Desired CTA: ${cta || 'N/A'}
Brand Voice: ${brandVoice || 'professional'}
Brand Guidelines: ${brandGuidelines || 'N/A'}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/generate-ad-copy] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
