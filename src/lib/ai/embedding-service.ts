import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateEmbedding, generateEmbeddings, chunkText } from './embeddings'
import type { EmbeddingSourceType } from '@/types/enums'

interface UpsertEmbeddingsParams {
  orgId: string
  sourceType: EmbeddingSourceType
  sourceId: string
  text: string
  metadata?: Record<string, unknown>
}

export async function upsertEmbeddings({
  orgId,
  sourceType,
  sourceId,
  text,
  metadata = {},
}: UpsertEmbeddingsParams) {
  // Delete existing embeddings for this source
  await supabaseAdmin
    .from('embeddings')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)

  if (!text.trim()) return

  const chunks = chunkText(text)
  const vectors = await generateEmbeddings(chunks)

  const rows = chunks.map((chunk, i) => ({
    organization_id: orgId,
    source_type: sourceType,
    source_id: sourceId,
    chunk_index: i,
    chunk_text: chunk,
    embedding: JSON.stringify(vectors[i]),
    metadata,
  }))

  // Bulk insert — supabase accepts arrays
  const { error } = await supabaseAdmin.from('embeddings').insert(rows as any)
  if (error) console.error('[embeddings] Insert error:', error.message)
}

interface SearchParams {
  orgId: string
  query: string
  sourceType?: EmbeddingSourceType
  limit?: number
  threshold?: number
}

export async function searchSimilar({
  orgId,
  query,
  sourceType,
  limit = 10,
  threshold = 0.7,
}: SearchParams) {
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await supabaseAdmin.rpc('match_embeddings' as any, {
    query_embedding: JSON.stringify(queryEmbedding),
    match_org_id: orgId,
    match_threshold: threshold,
    match_count: limit,
    filter_source_type: sourceType ?? null,
  } as any)

  if (error) {
    console.error('[embeddings] Search error:', error.message)
    return []
  }

  return data ?? []
}

export async function deleteEmbeddings(sourceType: EmbeddingSourceType, sourceId: string) {
  await supabaseAdmin
    .from('embeddings')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
}
