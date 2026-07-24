import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { KB_QA_PROMPT } from '@/lib/ai/prompts'
import { searchSimilar } from '@/lib/ai/embedding-service'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { prompt: question, brandId } = (await req.json()) as {
      prompt: string
      brandId?: string
    }
    const orgId = user.app_metadata?.organization_id as string
    if (!orgId) return new Response('No organization', { status: 403 })
    if (!question?.trim())
      return new Response('Question is required', { status: 400 })

    // Semantic search across knowledge base
    const results = await searchSimilar({
      orgId,
      query: question,
      sourceType: 'document',
      limit: 8,
      threshold: 0.6,
      // When a brand is selected, answer from that brand plus agency
      // knowledge only. With no brand selected this stays org-wide,
      // which is what the agency's own hub Ask is for.
      brandId,
    })

    if (!results || results.length === 0) {
      // Return a plain text response when no context is found
      return new Response(
        "I couldn't find any relevant information in your knowledge base to answer this question. Try uploading more documents or rephrasing your question.",
        { headers: { 'Content-Type': 'text/plain' } }
      )
    }

    // Build context from search results
    // Fetch document titles for the matched chunks
    const sourceIds = [
      ...new Set(results.map((r: { source_id: string }) => r.source_id)),
    ]
    const { data: docs } = await supabase
      .from('knowledge_base_documents')
      .select('id, title, source_type, category')
      .in('id', sourceIds)

    const docMap = new Map(
      (docs ?? []).map((d: { id: string; title: string; source_type: string; category: string }) => [d.id, d])
    )

    const contextChunks = results
      .map(
        (
          r: {
            source_id: string
            chunk_text: string
            similarity: number
            chunk_index: number
          },
          i: number
        ) => {
          const doc = docMap.get(r.source_id)
          const title = doc?.title ?? 'Unknown Document'
          const similarity = Math.round(r.similarity * 100)
          return `[Source ${i + 1}] "${title}" (${similarity}% match, chunk ${r.chunk_index + 1}):\n${r.chunk_text}`
        }
      )
      .join('\n\n---\n\n')

    const result = streamText({
      model: defaultModel,
      system: KB_QA_PROMPT,
      prompt: `--- KNOWLEDGE BASE CONTEXT ---
${contextChunks}

--- USER QUESTION ---
${question}`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[ai/ask-knowledge-base] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
