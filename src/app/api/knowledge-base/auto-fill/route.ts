import { generateObject } from 'ai'
import { z } from 'zod/v4'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import type { KBContentType } from '@/types/kb-forms'

// ── Zod schemas per content type (used by generateObject) ─────────────

const personaSchema = z.object({
  personaName: z.string().nullable().describe('Name or archetype of the persona'),
  role: z.string().nullable().describe('Job title or role'),
  demographics: z.string().nullable().describe('Age range, location, income, education'),
  goals: z.array(z.string()).describe('List of goals or objectives'),
  painPoints: z.array(z.string()).describe('List of pain points or frustrations'),
  preferredChannels: z.array(z.string()).describe('Marketing channels they use'),
  behaviorNotes: z.string().nullable().describe('Behavioral patterns and decision making'),
  quotes: z.array(z.string()).describe('Representative quotes from this persona'),
})

const strategySchema = z.object({
  objectiveType: z.enum(['awareness', 'engagement', 'conversion', 'retention']).nullable().describe('Primary objective type'),
  targetAudience: z.string().nullable().describe('Target audience description'),
  channels: z.array(z.string()).describe('Marketing channels to use'),
  keyMessages: z.array(z.string()).describe('Core messaging themes'),
  kpis: z.array(z.string()).describe('Key performance indicators'),
  timeline: z.string().nullable().describe('Timeline or duration'),
  budget: z.string().nullable().describe('Budget range or amount'),
  competitivePosition: z.string().nullable().describe('Competitive positioning statement'),
})

const competitorSchema = z.object({
  companyName: z.string().nullable().describe('Competitor company name'),
  website: z.string().nullable().describe('Website URL'),
  industry: z.string().nullable().describe('Industry or sector'),
  strengths: z.array(z.string()).describe('Competitive strengths'),
  weaknesses: z.array(z.string()).describe('Known weaknesses'),
  channels: z.array(z.string()).describe('Active marketing channels'),
  positioning: z.string().nullable().describe('Market positioning'),
  priceRange: z.string().nullable().describe('Pricing information'),
  notes: z.string().nullable().describe('Additional observations'),
  threatLevel: z.enum(['low', 'medium', 'high']).nullable().describe('Threat level assessment'),
})

const campaignSchema = z.object({
  campaignName: z.string().nullable().describe('Campaign name'),
  objective: z.string().nullable().describe('Campaign objective'),
  startDate: z.string().nullable().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().nullable().describe('End date (YYYY-MM-DD)'),
  channels: z.array(z.string()).describe('Channels used'),
  targetAudience: z.string().nullable().describe('Target audience'),
  budget: z.string().nullable().describe('Budget'),
  keyMessages: z.array(z.string()).describe('Key messages'),
  deliverables: z.array(z.string()).describe('Deliverables produced'),
  successMetrics: z.array(z.string()).describe('Success metrics and results'),
  overallRating: z.enum(['poor', 'fair', 'good', 'great', 'excellent']).nullable().describe('Overall campaign rating'),
})

const sopSchema = z.object({
  processName: z.string().nullable().describe('Name of the process'),
  owner: z.string().nullable().describe('Process owner'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'per_project', 'as_needed']).nullable().describe('How often this runs'),
  steps: z.array(z.object({
    title: z.string().describe('Step title'),
    description: z.string().describe('Step description'),
    responsible: z.string().optional().describe('Person responsible'),
  })).describe('Ordered process steps'),
  tools: z.array(z.string()).describe('Tools used'),
  notes: z.string().nullable().describe('Additional notes'),
})

const SCHEMAS: Record<KBContentType, z.ZodType> = {
  persona: personaSchema,
  strategy: strategySchema,
  competitor: competitorSchema,
  campaign: campaignSchema,
  sop: sopSchema,
}

const SCHEMA_DESCRIPTIONS: Record<KBContentType, string> = {
  persona: 'customer persona',
  strategy: 'marketing strategy',
  competitor: 'competitor analysis',
  campaign: 'campaign history',
  sop: 'standard operating procedure (SOP)',
}

// ── Confidence schema (returned alongside extracted data) ─────────────

const confidenceSchema = z.record(z.string(), z.enum(['high', 'medium', 'low']))

// ── URL text extraction ───────────────────────────────────────────────

async function extractTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AgencyBeats/1.0 (Knowledge Extraction Bot)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`)
  const html = await response.text()

  // Basic HTML → text conversion (strip tags, decode entities)
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000) // Limit to ~50k chars
}

// ── Main handler ──────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const { contentType, source } = body as {
    contentType: KBContentType
    source: { type: 'file' | 'url' | 'text'; content: string }
  }

  if (!contentType || !source?.type || !source?.content) {
    return Response.json(
      { error: 'contentType and source (type + content) are required' },
      { status: 400 }
    )
  }

  const schema = SCHEMAS[contentType]
  if (!schema) {
    return Response.json({ error: `Unknown content type: ${contentType}` }, { status: 400 })
  }

  try {
    let documentContent: string

    if (source.type === 'url') {
      documentContent = await extractTextFromUrl(source.content)
    } else if (source.type === 'text') {
      documentContent = source.content.slice(0, 50000)
    } else if (source.type === 'file') {
      // For file sources, we pass the base64 content directly to the AI
      // The AI model handles PDF/DOCX natively through document support
      documentContent = source.content
    } else {
      return Response.json({ error: 'Invalid source type' }, { status: 400 })
    }

    const systemPrompt = `You are a knowledge extraction assistant for a digital marketing agency platform.
A user has provided a document and wants you to extract structured information from it to fill a ${SCHEMA_DESCRIPTIONS[contentType]} form.

Extract ONLY information that is clearly and explicitly stated in the document. Do NOT invent, infer, or assume any values. If a field cannot be confidently extracted, return null for that field. For array fields, return an empty array [] if nothing is found.

Return a JSON object matching the exact schema provided. Return ONLY the JSON object. No explanation, no markdown, no preamble.`

    // Build the user prompt based on source type
    let userPrompt: string
    if (source.type === 'file') {
      userPrompt = `Extract ${SCHEMA_DESCRIPTIONS[contentType]} data from this document. The document content is provided as base64-encoded data:\n\n${documentContent.slice(0, 100000)}`
    } else {
      userPrompt = `Extract ${SCHEMA_DESCRIPTIONS[contentType]} data from the following content:\n\n${documentContent}`
    }

    const result = await generateObject({
      model: defaultModel,
      schema,
      system: systemPrompt,
      prompt: userPrompt,
    })

    // Generate confidence scores by checking which fields have values
    const extracted = result.object as Record<string, unknown>
    const confidence: Record<string, 'high' | 'medium' | 'low'> = {}

    for (const [key, value] of Object.entries(extracted)) {
      if (value === null || value === undefined) {
        confidence[key] = 'low'
      } else if (Array.isArray(value)) {
        confidence[key] = value.length > 0 ? 'high' : 'low'
      } else if (typeof value === 'string') {
        confidence[key] = value.trim().length > 10 ? 'high' : value.trim().length > 0 ? 'medium' : 'low'
      } else {
        confidence[key] = 'medium'
      }
    }

    // Clean nulls → appropriate defaults for the form
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(extracted)) {
      if (value === null || value === undefined) {
        // Skip nulls — leave fields empty in the form
        continue
      }
      cleaned[key] = value
    }

    return Response.json({ data: cleaned, confidence })
  } catch (error) {
    console.error('[auto-fill] Extraction failed:', error)
    return Response.json(
      { error: 'Failed to extract data from the provided source' },
      { status: 500 }
    )
  }
}
