import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { upsertEmbeddings } from '@/lib/ai/embedding-service'
import { stringifyForEmbedding } from '@/lib/ai/embedding-triggers'
import type { EmbeddingSourceType } from '@/types/enums'
import type { Database } from '@/types/database'

type BrandStrategyRow = Database['public']['Tables']['brand_strategies']['Row']

const VALID_SOURCE_TYPES: EmbeddingSourceType[] = [
  'brand_guidelines',
  'meeting_transcript',
  'content_item',
  'brief',
  'comment',
  'document',
]

export async function POST(req: Request) {
  // Auth check — super_admin only
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })
  if (user.app_metadata?.is_super_admin !== true) {
    return new Response('Forbidden — super admin only', { status: 403 })
  }

  const { sourceType } = await req.json()
  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    return Response.json(
      { error: `sourceType must be one of: ${VALID_SOURCE_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  let processed = 0

  switch (sourceType as EmbeddingSourceType) {
    case 'brand_guidelines': {
      // Index brand guidelines
      const { data: brands } = await supabaseAdmin
        .from('brands')
        .select('id, organization_id, name, description, guidelines')
        .eq('is_active', true)

      for (const brand of brands ?? []) {
        const parts: string[] = [brand.name]
        if (brand.description) parts.push(brand.description)
        if (brand.guidelines) {
          parts.push(stringifyForEmbedding(brand.guidelines as Record<string, unknown>))
        }
        const text = parts.join('\n\n')
        if (text.trim()) {
          await upsertEmbeddings({
            orgId: brand.organization_id,
            sourceType: 'brand_guidelines',
            sourceId: brand.id,
            text,
          })
          processed++
        }
      }

      // Also index brand strategies
      const { data: strategies } = await supabaseAdmin
        .from('brand_strategies')
        .select('*')
        .returns<BrandStrategyRow[]>()

      for (const strategy of strategies ?? []) {
        const text = stringifyForEmbedding({
          content_pillars: strategy.content_pillars,
          audience_personas: strategy.audience_personas,
          tone_profiles: strategy.tone_profiles,
          campaign_objectives: strategy.campaign_objectives,
          competitive_notes: strategy.competitive_notes,
        } as Record<string, unknown>)
        if (text.trim()) {
          await upsertEmbeddings({
            orgId: strategy.organization_id,
            sourceType: 'brand_guidelines',
            sourceId: strategy.brand_id,
            text,
            metadata: { sub_type: 'brand_strategy' },
          })
          processed++
        }
      }
      break
    }

    case 'meeting_transcript': {
      const { data: meetings } = await supabaseAdmin
        .from('meetings')
        .select('id, organization_id, transcript')
        .not('transcript', 'is', null)

      for (const meeting of meetings ?? []) {
        if (meeting.transcript?.trim()) {
          await upsertEmbeddings({
            orgId: meeting.organization_id,
            sourceType: 'meeting_transcript',
            sourceId: meeting.id,
            text: meeting.transcript,
          })
          processed++
        }
      }
      break
    }

    case 'content_item': {
      const { data: items } = await supabaseAdmin
        .from('content_items')
        .select('id, body, tasks!inner(projects!inner(organization_id))')
        .not('body', 'is', null)

      for (const item of items ?? []) {
        const orgId = (item as any).tasks?.projects?.organization_id
        if (orgId && (item.body as string)?.trim()) {
          await upsertEmbeddings({
            orgId,
            sourceType: 'content_item',
            sourceId: item.id,
            text: item.body as string,
          })
          processed++
        }
      }
      break
    }

    case 'brief': {
      // Index both briefs table and service_briefs table
      const { data: briefs } = await supabaseAdmin
        .from('briefs')
        .select('id, organization_id, title, body')

      for (const brief of briefs ?? []) {
        const text = `${brief.title}\n\n${
          brief.body ? stringifyForEmbedding(brief.body as Record<string, unknown>) : ''
        }`
        if (text.trim()) {
          await upsertEmbeddings({
            orgId: brief.organization_id,
            sourceType: 'brief',
            sourceId: brief.id,
            text,
          })
          processed++
        }
      }

      // Also index service_briefs
      const { data: serviceBriefs } = await supabaseAdmin
        .from('service_briefs')
        .select('id, organization_id, title, service_type, overview, objectives, deliverables, requirements, kpis')

      for (const sb of serviceBriefs ?? []) {
        const text = stringifyForEmbedding({
          title: sb.title,
          service_type: sb.service_type,
          overview: sb.overview,
          objectives: sb.objectives,
          deliverables: sb.deliverables,
          requirements: sb.requirements,
          kpis: sb.kpis,
        } as Record<string, unknown>)
        if (text.trim()) {
          await upsertEmbeddings({
            orgId: sb.organization_id,
            sourceType: 'brief',
            sourceId: sb.id,
            text,
          })
          processed++
        }
      }
      break
    }

    case 'comment': {
      const { data: comments } = await supabaseAdmin
        .from('comments')
        .select('id, body, tasks!inner(projects!inner(organization_id))')

      for (const comment of comments ?? []) {
        const orgId = (comment as any).tasks?.projects?.organization_id
        if (orgId && comment.body?.trim()) {
          await upsertEmbeddings({
            orgId,
            sourceType: 'comment',
            sourceId: comment.id,
            text: comment.body,
          })
          processed++
        }
      }
      break
    }

    case 'document': {
      const { data: docs } = await supabaseAdmin
        .from('knowledge_base_documents')
        .select('id, organization_id, extracted_text')
        .eq('embedding_status', 'ready')
        .not('extracted_text', 'is', null)

      for (const doc of docs ?? []) {
        if (doc.extracted_text?.trim()) {
          await upsertEmbeddings({
            orgId: doc.organization_id,
            sourceType: 'document',
            sourceId: doc.id,
            text: doc.extracted_text,
          })
          processed++
        }
      }
      break
    }
  }

  return Response.json({ sourceType, processed })
}
