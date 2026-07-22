import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { TRANSCRIPT_CHAT_PROMPT } from '@/lib/ai/prompts'
import { searchSimilar } from '@/lib/ai/embedding-service'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { prompt: question, sessionId, projectId } = (await req.json()) as {
    prompt: string
    sessionId?: string
    projectId?: string
  }

  const orgId = user.app_metadata?.organization_id as string
  if (!orgId) return new Response('No organization', { status: 403 })
  if (!question?.trim())
    return new Response('Question is required', { status: 400 })
  if (!sessionId && !projectId)
    return new Response('Either sessionId or projectId is required', { status: 400 })

  let contextChunks = ''

  if (sessionId) {
    // Session-level: load transcript directly from the session
    const { data: session } = await supabaseAdmin
      .from('meeting_sessions')
      .select('id, title, transcript_text, transcript_segments, summary')
      .eq('id', sessionId)
      .single()

    if (!session) return new Response('Session not found', { status: 404 })

    // Verify the session belongs to a room in the user's org
    const { data: room } = await supabaseAdmin
      .from('meeting_rooms')
      .select('organization_id')
      .eq('id', (
        await supabaseAdmin
          .from('meeting_sessions')
          .select('room_id')
          .eq('id', sessionId)
          .single()
      ).data?.room_id ?? '')
      .single()

    if (!room || room.organization_id !== orgId) {
      return new Response('Forbidden', { status: 403 })
    }

    const transcriptText = session.transcript_text ?? ''
    const summary = session.summary ?? ''

    if (!transcriptText && !summary) {
      return new Response(
        'No transcript available for this session yet. The transcript will be available after the meeting ends and is processed.',
        { headers: { 'Content-Type': 'text/plain' } }
      )
    }

    // Build context from session data
    const parts: string[] = []
    if (summary) {
      parts.push(`[Session Summary - "${session.title ?? 'Untitled'}"]\n${summary}`)
    }
    if (transcriptText) {
      // Truncate if very long (keep under 100k chars for context window)
      const truncated = transcriptText.length > 80000
        ? transcriptText.substring(0, 80000) + '\n\n[... transcript truncated for length ...]'
        : transcriptText
      parts.push(`[Full Transcript - "${session.title ?? 'Untitled'}"]\n${truncated}`)
    }

    contextChunks = parts.join('\n\n---\n\n')
  } else if (projectId) {
    // Project-level: use RAG search across all meeting transcripts for this project
    // First verify the project belongs to the user's org
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .single()

    if (!project || project.organization_id !== orgId) {
      return new Response('Forbidden', { status: 403 })
    }

    // Search via embeddings with source_type = 'meeting_transcript'
    const results = await searchSimilar({
      orgId,
      query: question,
      sourceType: 'meeting_transcript',
      limit: 10,
      threshold: 0.55,
    })

    if (!results || results.length === 0) {
      // Fall back to loading recent session transcripts directly
      const { data: rooms } = await supabaseAdmin
        .from('meeting_rooms')
        .select('id')
        .eq('project_id', projectId)

      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map((r: { id: string }) => r.id)
        const { data: sessions } = await supabaseAdmin
          .from('meeting_sessions')
          .select('id, title, transcript_text, summary, started_at')
          .in('room_id', roomIds)
          .order('started_at', { ascending: false })
          .limit(5)

        if (sessions && sessions.length > 0) {
          const sessionTexts = sessions
            .filter((s: any) => s.transcript_text || s.summary)
            .map((s: any, i: number) => {
              const parts: string[] = []
              if (s.summary) parts.push(`Summary:\n${s.summary}`)
              if (s.transcript_text) {
                const truncated = s.transcript_text.length > 15000
                  ? s.transcript_text.substring(0, 15000) + '\n[... truncated ...]'
                  : s.transcript_text
                parts.push(`Transcript:\n${truncated}`)
              }
              const date = s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Unknown date'
              return `[Session ${i + 1}: "${s.title ?? 'Untitled'}" — ${date}]\n${parts.join('\n\n')}`
            })
            .join('\n\n---\n\n')

          if (sessionTexts) {
            contextChunks = sessionTexts
          }
        }
      }

      if (!contextChunks) {
        return new Response(
          "I couldn't find any meeting transcripts for this project. Transcripts become available after meetings are completed and processed.",
          { headers: { 'Content-Type': 'text/plain' } }
        )
      }
    } else {
      // Build context from RAG results
      // Fetch session titles for matched source IDs
      const sourceIds = [...new Set(results.map((r: { source_id: string }) => r.source_id))]
      const { data: sessions } = await supabaseAdmin
        .from('meeting_sessions')
        .select('id, title, started_at')
        .in('id', sourceIds)

      const sessionMap = new Map(
        (sessions ?? []).map((s: { id: string; title: string | null; started_at: string }) => [s.id, s])
      )

      contextChunks = results
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
            const session = sessionMap.get(r.source_id) as any
            const title = session?.title ?? 'Unknown Session'
            const date = session?.started_at
              ? new Date(session.started_at).toLocaleDateString()
              : ''
            const similarity = Math.round(r.similarity * 100)
            return `[Source ${i + 1}] "${title}"${date ? ` (${date})` : ''} (${similarity}% match, chunk ${r.chunk_index + 1}):\n${r.chunk_text}`
          }
        )
        .join('\n\n---\n\n')
    }
  }

  const result = streamText({
    model: defaultModel,
    system: TRANSCRIPT_CHAT_PROMPT,
    prompt: `--- TRANSCRIPT CONTEXT ---
${contextChunks}

--- USER QUESTION ---
${question}`,
  })

  return result.toTextStreamResponse()
}
