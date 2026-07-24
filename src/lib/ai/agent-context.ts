import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AIOutputType } from '@/types/enums'
import { searchSimilar } from './embedding-service'
import { supabaseAdmin } from '@/lib/supabase/admin'

type BrandRow = Database['public']['Tables']['brands']['Row']
type BrandStrategyRow = Database['public']['Tables']['brand_strategies']['Row']

interface BuildAgentContextParams {
  supabase: SupabaseClient<Database>
  orgId: string
  brandId?: string
  agentType: AIOutputType
  userQuery: string
}

/**
 * Builds enriched context for AI agents by combining 4 layers:
 * A. RAG — semantic search across knowledge base (briefs, meetings, content, guidelines)
 * B. Campaign History — recent content items and client feedback
 * C. Brand Strategy — content pillars, personas, tone profiles, campaign objectives
 * D. Output Feedback — patterns from saved/discarded AI outputs
 */
export async function buildAgentContext({
  supabase,
  orgId,
  brandId,
  agentType,
  userQuery,
}: BuildAgentContextParams): Promise<string> {
  const sections: string[] = []

  // Fetch brand data first (used by multiple layers)
  let brandContext = ''
  if (brandId) {
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('organization_id', orgId)
      .single<BrandRow>()

    if (brand) {
      brandContext = `--- BRAND PROFILE ---
Brand: ${brand.name}
Description: ${brand.description || 'N/A'}
Website: ${brand.website_url || 'N/A'}
Active Platforms: ${(brand.platforms as string[] || []).join(', ') || 'N/A'}
Brand Guidelines: ${brand.guidelines ? JSON.stringify(brand.guidelines) : 'N/A'}
Colors: ${brand.colors ? JSON.stringify(brand.colors) : 'N/A'}
Fonts: ${brand.fonts ? JSON.stringify(brand.fonts) : 'N/A'}`
      sections.push(brandContext)
    }
  }

  // Run all enrichment layers in parallel
  const [ragContext, campaignHistory, strategyContext, feedbackContext] =
    await Promise.all([
      buildRagContext(orgId, userQuery, brandId),
      brandId ? buildCampaignHistory(supabase, orgId, brandId) : '',
      brandId ? buildStrategyContext(supabase, brandId) : '',
      brandId ? buildFeedbackContext(orgId, brandId, agentType) : '',
    ])

  if (ragContext) sections.push(ragContext)
  if (campaignHistory) sections.push(campaignHistory)
  if (strategyContext) sections.push(strategyContext)
  if (feedbackContext) sections.push(feedbackContext)

  return sections.join('\n\n')
}

// ── Layer A: RAG Context Injection ──────────────────────────

async function buildRagContext(
  orgId: string,
  query: string,
  brandId?: string,
): Promise<string> {
  try {
    const results = await searchSimilar({
      orgId,
      query,
      limit: 5,
      threshold: 0.65,
      // Client-facing output: never retrieve another brand's material.
      // Agency-scope knowledge is still included (see match_embeddings).
      brandId,
    })

    if (!results || results.length === 0) return ''

    const formatted = results
      .map(
        (r: { source_type: string; chunk_text: string; similarity: number }, i: number) =>
          `[${i + 1}] (${r.source_type}) ${(r.chunk_text || '').slice(0, 400)}`,
      )
      .join('\n')

    return `--- RELEVANT KNOWLEDGE BASE ---\n${formatted}`
  } catch {
    // RAG is non-critical — fail silently
    return ''
  }
}

// ── Layer B: Campaign History Feed ──────────────────────────

async function buildCampaignHistory(
  supabase: SupabaseClient<Database>,
  orgId: string,
  brandId: string,
): Promise<string> {
  const parts: string[] = []

  // 1. Fetch recent content items for this brand
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', orgId)
    .eq('brand_id', brandId)

  const projectIds = (projects ?? []).map((p) => p.id)

  if (projectIds.length > 0) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .in('project_id', projectIds)

    const taskIds = (tasks ?? []).map((t) => t.id)

    if (taskIds.length > 0) {
      // Recent content
      const { data: contentItems } = await supabase
        .from('content_items')
        .select('platform, body, hashtags, created_at')
        .in('task_id', taskIds)
        .not('body', 'is', null)
        .order('created_at', { ascending: false })
        .limit(15)

      if (contentItems && contentItems.length > 0) {
        const contentLines = contentItems.map(
          (c, i) =>
            `[${i + 1}] ${c.platform}: ${(c.body || '').slice(0, 200)}${(c.hashtags as string[] || []).length > 0 ? ` | Tags: ${(c.hashtags as string[]).join(', ')}` : ''}`,
        )
        parts.push(`Recent Content (${contentItems.length} items):\n${contentLines.join('\n')}`)
      }

      // Client feedback (comments on tasks)
      const { data: comments } = await supabase
        .from('comments')
        .select('body, created_at, author_id')
        .in('task_id', taskIds)
        .eq('is_internal', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (comments && comments.length > 0) {
        const commentLines = comments.map(
          (c, i) => `[${i + 1}] "${(c.body || '').slice(0, 150)}"`,
        )
        parts.push(`Client Feedback (${comments.length} items):\n${commentLines.join('\n')}`)
      }
    }
  }

  if (parts.length === 0) return ''
  return `--- CAMPAIGN HISTORY ---\n${parts.join('\n\n')}`
}

// ── Layer C: Brand Strategy Injection ───────────────────────

async function buildStrategyContext(
  supabase: SupabaseClient<Database>,
  brandId: string,
): Promise<string> {
  const { data: strategy } = await supabase
    .from('brand_strategies')
    .select('*')
    .eq('brand_id', brandId)
    .single<BrandStrategyRow>()

  if (!strategy) return ''

  const parts: string[] = []

  // Content pillars
  const pillars = strategy.content_pillars as Array<{
    name: string
    description: string
    keywords: string[]
  }> | null
  if (pillars && pillars.length > 0) {
    const pillarLines = pillars.map(
      (p) => `• ${p.name}: ${p.description} [keywords: ${(p.keywords || []).join(', ')}]`,
    )
    parts.push(`Content Pillars:\n${pillarLines.join('\n')}`)
  }

  // Audience personas
  const personas = strategy.audience_personas as Array<{
    name: string
    demographics: string
    painPoints: string[]
    goals: string[]
    preferredPlatforms: string[]
  }> | null
  if (personas && personas.length > 0) {
    const personaLines = personas.map(
      (p) =>
        `• ${p.name}: ${p.demographics} | Pain points: ${(p.painPoints || []).join(', ')} | Goals: ${(p.goals || []).join(', ')} | Platforms: ${(p.preferredPlatforms || []).join(', ')}`,
    )
    parts.push(`Audience Personas:\n${personaLines.join('\n')}`)
  }

  // Tone profiles
  const tone = strategy.tone_profiles as {
    voice?: string
    tone?: string
    doList?: string[]
    dontList?: string[]
    samplePhrases?: string[]
  } | null
  if (tone && (tone.voice || tone.tone)) {
    let toneText = `Voice: ${tone.voice || 'N/A'} | Tone: ${tone.tone || 'N/A'}`
    if (tone.doList?.length) toneText += `\n  DO: ${tone.doList.join(', ')}`
    if (tone.dontList?.length) toneText += `\n  DON'T: ${tone.dontList.join(', ')}`
    if (tone.samplePhrases?.length)
      toneText += `\n  Sample phrases: "${tone.samplePhrases.join('", "')}"`
    parts.push(`Tone & Voice:\n${toneText}`)
  }

  // Campaign objectives
  const objectives = strategy.campaign_objectives as Array<{
    objective: string
    kpis: string[]
    targetDate?: string
    status: string
  }> | null
  if (objectives && objectives.length > 0) {
    const activeObjectives = objectives.filter((o) => o.status === 'active')
    if (activeObjectives.length > 0) {
      const objLines = activeObjectives.map(
        (o) =>
          `• ${o.objective} [KPIs: ${(o.kpis || []).join(', ')}]${o.targetDate ? ` (target: ${o.targetDate})` : ''}`,
      )
      parts.push(`Active Campaign Objectives:\n${objLines.join('\n')}`)
    }
  }

  // Competitive notes
  if (strategy.competitive_notes) {
    parts.push(`Competitive Notes:\n${strategy.competitive_notes}`)
  }

  if (parts.length === 0) return ''
  return `--- BRAND STRATEGY ---\n${parts.join('\n\n')}`
}

// ── Layer D: Output Feedback Patterns ───────────────────────

async function buildFeedbackContext(
  orgId: string,
  brandId: string,
  agentType: AIOutputType,
): Promise<string> {
  const parts: string[] = []

  // Positive patterns — saved/used outputs with high ratings
  const { data: goodOutputs } = await supabaseAdmin
    .from('ai_outputs')
    .select('input_summary, output_text, rating')
    .eq('organization_id', orgId)
    .eq('brand_id', brandId)
    .eq('agent_type', agentType)
    .in('status', ['saved', 'used'])
    .order('created_at', { ascending: false })
    .limit(3)

  if (goodOutputs && goodOutputs.length > 0) {
    const goodLines = goodOutputs.map(
      (o, i) =>
        `[${i + 1}] Input: ${(o.input_summary || '').slice(0, 100)} → Output preview: ${(o.output_text || '').slice(0, 200)}...${o.rating ? ` (rated ${o.rating}/5)` : ''}`,
    )
    parts.push(`--- WHAT WORKED BEFORE ---\n${goodLines.join('\n')}`)
  }

  // Anti-patterns — discarded or low-rated outputs
  const { data: badOutputs } = await supabaseAdmin
    .from('ai_outputs')
    .select('input_summary, output_text, rating')
    .eq('organization_id', orgId)
    .eq('brand_id', brandId)
    .eq('agent_type', agentType)
    .eq('status', 'discarded')
    .order('created_at', { ascending: false })
    .limit(2)

  if (badOutputs && badOutputs.length > 0) {
    const badLines = badOutputs.map(
      (o, i) =>
        `[${i + 1}] Input: ${(o.input_summary || '').slice(0, 100)} → Output preview: ${(o.output_text || '').slice(0, 200)}...${o.rating ? ` (rated ${o.rating}/5)` : ''}`,
    )
    parts.push(`--- WHAT DIDN'T WORK ---\n${badLines.join('\n')}`)
  }

  return parts.join('\n\n')
}
