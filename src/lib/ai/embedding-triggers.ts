import { upsertEmbeddings, deleteEmbeddings } from './embedding-service'
import type { EmbeddingSourceType } from '@/types/enums'

/**
 * Fire-and-forget embedding generation.
 * Calls upsertEmbeddings in the background — the mutation returns immediately.
 * Errors are logged but never propagate to the caller.
 */
export function triggerEmbedding(
  orgId: string,
  sourceType: EmbeddingSourceType,
  sourceId: string,
  text: string,
  metadata?: Record<string, unknown>
) {
  if (!text.trim()) return

  void upsertEmbeddings({ orgId, sourceType, sourceId, text, metadata }).catch(
    (err) => console.error(`[embedding-trigger] Failed to embed ${sourceType}/${sourceId}:`, err)
  )
}

/**
 * Fire-and-forget embedding deletion.
 */
export function triggerEmbeddingDeletion(
  sourceType: EmbeddingSourceType,
  sourceId: string
) {
  void deleteEmbeddings(sourceType, sourceId).catch(
    (err) => console.error(`[embedding-trigger] Failed to delete ${sourceType}/${sourceId}:`, err)
  )
}

/**
 * Per-field embedding for structured KB documents.
 * Builds "[DocTitle — FieldName] value" lines for each non-empty field,
 * giving RAG search precise field-level context.
 */
export function triggerStructuredEmbedding(
  orgId: string,
  sourceId: string,
  title: string,
  structuredData: Record<string, unknown>
) {
  const lines: string[] = []

  for (const [key, value] of Object.entries(structuredData)) {
    if (value === null || value === undefined) continue

    const fieldLabel = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim()

    if (Array.isArray(value)) {
      if (value.length === 0) continue
      const items = value.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return Object.entries(item)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        }
        return String(item)
      })
      lines.push(`[${title} — ${fieldLabel}] ${items.join('; ')}`)
    } else if (typeof value === 'string') {
      if (value.trim() === '') continue
      lines.push(`[${title} — ${fieldLabel}] ${value}`)
    } else if (typeof value === 'object') {
      const nested = JSON.stringify(value)
      lines.push(`[${title} — ${fieldLabel}] ${nested}`)
    } else {
      lines.push(`[${title} — ${fieldLabel}] ${String(value)}`)
    }
  }

  const text = lines.join('\n')
  if (!text.trim()) return

  triggerEmbedding(orgId, 'document', sourceId, text)
}

/**
 * Convert a JSON object into flat text suitable for embedding.
 * Filters out null/undefined/empty values and formats as "key: value" lines.
 */
export function stringifyForEmbedding(obj: Record<string, unknown>): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue

    const label = key.replace(/_/g, ' ')

    if (Array.isArray(value)) {
      if (value.length === 0) continue
      // For arrays of objects, stringify each item
      const items = value.map((item) =>
        typeof item === 'object' && item !== null
          ? Object.entries(item)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : String(item)
      )
      lines.push(`${label}: ${items.join('; ')}`)
    } else if (typeof value === 'object') {
      // Nested object — recurse one level
      const nested = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(', ')
      if (nested) lines.push(`${label}: ${nested}`)
    } else if (typeof value === 'string' && value.trim() === '') {
      continue
    } else {
      lines.push(`${label}: ${value}`)
    }
  }

  return lines.join('\n')
}
