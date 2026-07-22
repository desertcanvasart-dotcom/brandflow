import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const { fileUrl, mimeType } = await req.json()

  if (!fileUrl || !mimeType) {
    return Response.json(
      { error: 'fileUrl and mimeType are required' },
      { status: 400 }
    )
  }

  try {
    // Download file from R2/URL
    const response = await fetch(fileUrl)
    if (!response.ok) {
      return Response.json(
        { error: `Failed to download file: ${response.statusText}` },
        { status: 422 }
      )
    }

    let text = ''

    if (mimeType === 'application/pdf') {
      const buffer = await response.arrayBuffer()
      const { pdf } = await import('pdf-parse')
      const pdfData = await pdf(buffer)
      text = pdfData.text
    } else if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'text/csv'
    ) {
      text = await response.text()
    } else {
      return Response.json(
        { error: `Unsupported file type: ${mimeType}` },
        { status: 400 }
      )
    }

    // Clean up extracted text
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0

    return Response.json({ text, wordCount })
  } catch (err) {
    console.error('[extract-document-text] Extraction failed:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Text extraction failed' },
      { status: 500 }
    )
  }
}
