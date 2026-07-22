import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = (await req.json()) as { url: string }
  if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AgencyBeatsBot/1.0; +https://agencybeats.com)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const html = await response.text()

    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
    )
    const pageTitle = ogTitleMatch?.[1] || titleMatch?.[1] || ''

    // Extract description
    const descMatch = html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    )
    const ogDescMatch = html.match(
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
    )
    const pageDescription = ogDescMatch?.[1] || descMatch?.[1] || ''

    // Strip HTML to extract text
    let text = html
      // Remove script and style blocks
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      // Remove nav, header, footer (common non-content blocks)
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()

    // Limit to reasonable size (~50k chars)
    if (text.length > 50000) {
      text = text.slice(0, 50000)
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length

    return NextResponse.json({
      text,
      wordCount,
      pageTitle: pageTitle.trim(),
      pageDescription: pageDescription.trim(),
      contentType,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to extract content from URL'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
