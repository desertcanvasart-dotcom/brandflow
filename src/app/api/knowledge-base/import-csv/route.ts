import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

// ---------------------------------------------------------------------------
// String similarity helpers
// ---------------------------------------------------------------------------

function similarityScore(a: string, b: string): number {
  const al = a.toLowerCase().replace(/[^a-z]/g, '')
  const bl = b.toLowerCase().replace(/[^a-z]/g, '')
  if (al === bl) return 1
  if (al.includes(bl) || bl.includes(al)) return 0.8
  // Simple character overlap
  const aChars = new Set(al.split(''))
  const bChars = new Set(bl.split(''))
  const intersection = [...aChars].filter(c => bChars.has(c)).length
  return intersection / Math.max(aChars.size, bChars.size)
}

// ---------------------------------------------------------------------------
// Known column aliases per schema field
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  // Persona fields
  personaName: ['name', 'persona', 'persona name', 'customer name', 'segment'],
  role: ['role', 'title', 'job title', 'position', 'job role'],
  demographics: ['demographics', 'demographic', 'age', 'gender', 'location', 'demo'],
  goals: ['goals', 'goal', 'objectives', 'objective', 'motivation', 'motivations'],
  painPoints: ['pain points', 'pain', 'challenges', 'challenge', 'frustrations', 'problems'],
  preferredChannels: ['channels', 'preferred channels', 'platforms', 'media'],
  behaviorNotes: ['behavior', 'behaviour', 'behavior notes', 'notes', 'habits'],
  quotes: ['quotes', 'quote', 'verbatim', 'testimonial', 'testimonials'],

  // Competitor fields
  companyName: ['company', 'company name', 'competitor', 'name', 'business'],
  website: ['website', 'url', 'site', 'web', 'homepage'],
  industry: ['industry', 'sector', 'vertical', 'category'],
  strengths: ['strengths', 'strength', 'pros', 'advantages'],
  weaknesses: ['weaknesses', 'weakness', 'cons', 'disadvantages'],
  channels: ['channels', 'channel', 'platforms', 'platform', 'media'],
  positioning: ['positioning', 'position', 'value prop', 'value proposition', 'tagline'],
  priceRange: ['price', 'price range', 'pricing', 'cost', 'price point'],
  notes: ['notes', 'note', 'comments', 'comment', 'description'],
  threatLevel: ['threat', 'threat level', 'risk', 'priority', 'severity'],
}

// ---------------------------------------------------------------------------
// Schema fields per content type
// ---------------------------------------------------------------------------

const SCHEMA_FIELDS: Record<string, string[]> = {
  persona: [
    'personaName',
    'role',
    'demographics',
    'goals',
    'painPoints',
    'preferredChannels',
    'behaviorNotes',
    'quotes',
  ],
  competitor: [
    'companyName',
    'website',
    'industry',
    'strengths',
    'weaknesses',
    'channels',
    'positioning',
    'priceRange',
    'notes',
    'threatLevel',
  ],
}

// ---------------------------------------------------------------------------
// Auto-mapping logic
// ---------------------------------------------------------------------------

function suggestMappings(
  headers: string[],
  contentType: string
): Record<string, string> {
  const fields = SCHEMA_FIELDS[contentType] ?? []
  const mappings: Record<string, string> = {}
  const usedFields = new Set<string>()

  for (const header of headers) {
    let bestField = ''
    let bestScore = 0

    for (const field of fields) {
      if (usedFields.has(field)) continue

      // 1. Check known aliases first
      const aliases = COLUMN_ALIASES[field] ?? []
      const headerLower = header.toLowerCase().trim()
      if (aliases.some(a => a === headerLower)) {
        bestField = field
        bestScore = 1
        break
      }

      // 2. Partial alias match
      const aliasPartialScore = Math.max(
        ...aliases.map(a => similarityScore(header, a)),
        0
      )

      // 3. Direct field name similarity
      const directScore = similarityScore(header, field)

      const score = Math.max(aliasPartialScore, directScore)
      if (score > bestScore) {
        bestScore = score
        bestField = field
      }
    }

    // Only map if we have a reasonable confidence
    if (bestScore >= 0.5 && bestField) {
      mappings[header] = bestField
      usedFields.add(bestField)
    }
  }

  return mappings
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const contentType = formData.get('contentType') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!contentType || !['persona', 'competitor'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid contentType. Must be "persona" or "competitor".' },
        { status: 400 }
      )
    }

    // Read file text
    const text = await file.text()

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }

    // Parse CSV with PapaParse
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    })

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse CSV',
          details: parsed.errors.slice(0, 5).map(e => e.message),
        },
        { status: 400 }
      )
    }

    const headers = parsed.meta.fields ?? []
    const rows = parsed.data

    if (headers.length === 0) {
      return NextResponse.json(
        { error: 'No headers detected in CSV' },
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV has headers but no data rows' },
        { status: 400 }
      )
    }

    // Build suggested column mappings
    const suggestedMappings = suggestMappings(headers, contentType)

    return NextResponse.json({
      headers,
      rows,
      rowCount: rows.length,
      suggestedMappings,
    })
  } catch (error) {
    console.error('[knowledge-base/import-csv] Error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
