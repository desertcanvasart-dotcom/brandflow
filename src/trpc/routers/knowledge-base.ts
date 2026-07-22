import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, publicProcedure } from '../init'
import { triggerEmbedding, triggerEmbeddingDeletion, triggerStructuredEmbedding, stringifyForEmbedding } from '@/lib/ai/embedding-triggers'
import { nanoid } from 'nanoid'
import { createHash } from 'crypto'
import type { Database, Json } from '@/types/database'

type KBDocumentRow = Database['public']['Tables']['knowledge_base_documents']['Row']
type KBVersionRow = Database['public']['Tables']['knowledge_document_versions']['Row']
type HubspotConnectionRow = Database['public']['Tables']['hubspot_connections']['Row']

const categoryEnum = z.enum([
  'general',
  'brand_guidelines',
  'marketing_strategy',
  'campaign_history',
  'seo_research',
  'competitor_analysis',
  'customer_personas',
  'sop',
])

const knowledgeScopeEnum = z.enum(['agency', 'brand', 'project'])

export const knowledgeBaseRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z
        .object({
          brandId: z.string().uuid().optional(),
          search: z.string().optional(),
          category: categoryEnum.optional(),
          knowledgeScope: knowledgeScopeEnum.optional(),
          projectId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })

      if (input?.brandId) query = query.eq('brand_id', input.brandId)
      if (input?.search) query = query.ilike('title', `%${input.search}%`)
      if (input?.category) query = query.eq('category', input.category)
      if (input?.knowledgeScope) query = query.eq('knowledge_scope', input.knowledgeScope)
      if (input?.projectId) query = query.eq('project_id', input.projectId)

      const { data } = await query.returns<KBDocumentRow[]>()
      return data ?? []
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .single<KBDocumentRow>()

      if (error || !data)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })
      return data
    }),

  getStats: orgProcedure
    .input(
      z
        .object({
          brandId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // Count docs
      let docQuery = ctx.supabase
        .from('knowledge_base_documents')
        .select('id, word_count, chunk_count', { count: 'exact' })
        .eq('organization_id', ctx.orgId)

      if (input?.brandId) docQuery = docQuery.eq('brand_id', input.brandId)

      const { data: docs, count } = await docQuery.returns<
        { id: string; word_count: number | null; chunk_count: number | null }[]
      >()

      const totalDocs = count ?? 0
      const totalWords = (docs ?? []).reduce((sum, d) => sum + (d.word_count ?? 0), 0)
      const totalChunks = (docs ?? []).reduce((sum, d) => sum + (d.chunk_count ?? 0), 0)

      return { totalDocs, totalWords, totalChunks }
    }),

  upload: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        fileUrl: z.string().url(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        category: categoryEnum.optional(),
        knowledgeScope: knowledgeScopeEnum.optional(),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Insert with processing status
      const { data: doc, error: insertError } = await ctx.supabase
        .from('knowledge_base_documents')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId ?? null,
          title: input.title,
          description: input.description ?? null,
          file_url: input.fileUrl,
          file_name: input.fileName,
          file_size: input.fileSize,
          mime_type: input.mimeType,
          source_type: 'uploaded_file',
          embedding_status: 'processing',
          uploaded_by: ctx.user.id,
          category: input.category ?? 'general',
          knowledge_scope: input.knowledgeScope ?? 'brand',
          project_id: input.projectId ?? null,
        })
        .select()
        .single<KBDocumentRow>()

      if (insertError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: insertError.message })

      // 2. Extract text from file (fire-and-forget style, but we await to update status)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const extractResponse = await fetch(`${baseUrl}/api/ai/extract-document-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: input.fileUrl, mimeType: input.mimeType }),
        })

        if (!extractResponse.ok) {
          const errBody = await extractResponse.json().catch(() => ({}))
          throw new Error((errBody as { error?: string }).error || 'Text extraction failed')
        }

        const { text, wordCount } = (await extractResponse.json()) as {
          text: string
          wordCount: number
        }

        if (!text || !text.trim()) {
          // No text could be extracted
          await ctx.supabase
            .from('knowledge_base_documents')
            .update({
              embedding_status: 'no_text',
              word_count: 0,
            })
            .eq('id', doc.id)

          return { ...doc, embedding_status: 'no_text' as const, word_count: 0 }
        }

        // 3. Update document with extracted text
        await ctx.supabase
          .from('knowledge_base_documents')
          .update({
            extracted_text: text,
            word_count: wordCount,
            embedding_status: 'ready',
          })
          .eq('id', doc.id)

        // 4. Trigger embedding for RAG
        triggerEmbedding(ctx.orgId, 'document', doc.id, text)

        return { ...doc, extracted_text: text, word_count: wordCount, embedding_status: 'ready' as const }
      } catch (err) {
        // Update status to failed
        const errorMessage = err instanceof Error ? err.message : 'Unknown extraction error'
        await ctx.supabase
          .from('knowledge_base_documents')
          .update({
            embedding_status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', doc.id)

        return { ...doc, embedding_status: 'failed' as const, error_message: errorMessage }
      }
    }),

  createFromText: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        text: z.string().min(1),
        sourceType: z
          .enum(['pasted_text', 'brand_guidelines', 'sop', 'text_note'])
          .optional(),
        category: categoryEnum.optional(),
        knowledgeScope: knowledgeScopeEnum.optional(),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const wordCount = input.text.split(/\s+/).filter(Boolean).length

      const { data, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId ?? null,
          title: input.title,
          description: input.description ?? null,
          extracted_text: input.text,
          word_count: wordCount,
          source_type: input.sourceType ?? 'pasted_text',
          embedding_status: 'ready',
          uploaded_by: ctx.user.id,
          category: input.category ?? 'general',
          knowledge_scope: input.knowledgeScope ?? 'brand',
          project_id: input.projectId ?? null,
        })
        .select()
        .single<KBDocumentRow>()

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Trigger embedding for RAG
      triggerEmbedding(ctx.orgId, 'document', data.id, input.text)

      return data
    }),

  createStructured: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        contentType: z.enum(['persona', 'strategy', 'competitor', 'campaign', 'sop']),
        structuredData: z.record(z.string(), z.unknown()),
        category: categoryEnum.optional(),
        knowledgeScope: knowledgeScopeEnum.optional(),
        projectId: z.string().uuid().optional(),
        autoFillSource: z.string().optional(),
        autoFillSourceUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-map category from content type
      const categoryMap: Record<string, string> = {
        persona: 'customer_personas',
        strategy: 'marketing_strategy',
        competitor: 'competitor_analysis',
        campaign: 'campaign_history',
        sop: 'sop',
      }
      const autoCategory = categoryMap[input.contentType] ?? 'general'

      // Build readable text for extracted_text column
      const extractedText = stringifyForEmbedding(input.structuredData)
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length

      const { data, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId ?? null,
          title: input.title,
          description: input.description ?? null,
          extracted_text: extractedText,
          word_count: wordCount,
          source_type: 'pasted_text',
          embedding_status: 'ready',
          uploaded_by: ctx.user.id,
          category: input.category ?? autoCategory,
          knowledge_scope: input.knowledgeScope ?? 'brand',
          project_id: input.projectId ?? null,
          content_type: input.contentType,
          structured_data: input.structuredData as unknown as Json,
          auto_fill_source: input.autoFillSource ?? null,
          auto_fill_source_url: input.autoFillSourceUrl ?? null,
        })
        .select()
        .single<KBDocumentRow>()

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Per-field embedding for precise RAG retrieval
      triggerStructuredEmbedding(ctx.orgId, data.id, input.title, input.structuredData)

      return data
    }),

  importFromUrl: orgProcedure
    .input(
      z.object({
        brandId: z.string().uuid().optional(),
        title: z.string().min(1),
        description: z.string().optional(),
        url: z.string().url(),
        category: categoryEnum.optional(),
        knowledgeScope: knowledgeScopeEnum.optional(),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Extract text from URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const extractResponse = await fetch(`${baseUrl}/api/ai/extract-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input.url }),
      })

      if (!extractResponse.ok) {
        const errBody = await extractResponse.json().catch(() => ({}))
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: (errBody as { error?: string }).error || 'URL extraction failed',
        })
      }

      const { text, wordCount, pageTitle } = (await extractResponse.json()) as {
        text: string
        wordCount: number
        pageTitle: string
      }

      if (!text?.trim()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No text content could be extracted from this URL',
        })
      }

      // 2. Insert document
      const { data: doc, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId ?? null,
          title: input.title || pageTitle || 'Imported URL',
          description: input.description ?? null,
          extracted_text: text,
          word_count: wordCount,
          source_type: 'url_import',
          source_url: input.url,
          embedding_status: 'ready',
          uploaded_by: ctx.user.id,
          category: input.category ?? 'general',
          knowledge_scope: input.knowledgeScope ?? 'brand',
          project_id: input.projectId ?? null,
        })
        .select()
        .single<KBDocumentRow>()

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // 3. Trigger embedding
      triggerEmbedding(ctx.orgId, 'document', doc.id, text)

      return doc
    }),

  retry: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get the document
      const { data: doc, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .single<KBDocumentRow>()

      if (error || !doc)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      if (doc.embedding_status !== 'failed')
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only failed documents can be retried',
        })

      // Reset status to processing
      await ctx.supabase
        .from('knowledge_base_documents')
        .update({ embedding_status: 'processing', error_message: null })
        .eq('id', doc.id)

      // If pasted text, just re-embed
      if (doc.source_type === 'pasted_text' && doc.extracted_text) {
        triggerEmbedding(ctx.orgId, 'document', doc.id, doc.extracted_text)
        await ctx.supabase
          .from('knowledge_base_documents')
          .update({ embedding_status: 'ready' })
          .eq('id', doc.id)
        return { ...doc, embedding_status: 'ready' as const }
      }

      // For uploaded files, re-extract
      if (doc.file_url && doc.mime_type) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const extractResponse = await fetch(`${baseUrl}/api/ai/extract-document-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: doc.file_url, mimeType: doc.mime_type }),
          })

          if (!extractResponse.ok) {
            const errBody = await extractResponse.json().catch(() => ({}))
            throw new Error((errBody as { error?: string }).error || 'Text extraction failed')
          }

          const { text, wordCount } = (await extractResponse.json()) as {
            text: string
            wordCount: number
          }

          if (!text?.trim()) {
            await ctx.supabase
              .from('knowledge_base_documents')
              .update({ embedding_status: 'no_text', word_count: 0 })
              .eq('id', doc.id)
            return { ...doc, embedding_status: 'no_text' as const }
          }

          await ctx.supabase
            .from('knowledge_base_documents')
            .update({
              extracted_text: text,
              word_count: wordCount,
              embedding_status: 'ready',
            })
            .eq('id', doc.id)

          triggerEmbedding(ctx.orgId, 'document', doc.id, text)
          return { ...doc, embedding_status: 'ready' as const, extracted_text: text, word_count: wordCount }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown extraction error'
          await ctx.supabase
            .from('knowledge_base_documents')
            .update({ embedding_status: 'failed', error_message: errorMessage })
            .eq('id', doc.id)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: errorMessage })
        }
      }

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Document has no file URL or text to retry',
      })
    }),

  // ── Feature 3: Update with version snapshot ─────────────────────
  updateStructured: orgProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        structuredData: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch current doc
      const { data: doc, error: fetchError } = await ctx.supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('id', input.documentId)
        .eq('organization_id', ctx.orgId)
        .single<KBDocumentRow>()

      if (fetchError || !doc)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      // 2. Snapshot current state into versions table
      await ctx.supabase.from('knowledge_document_versions').insert({
        document_id: doc.id,
        organization_id: ctx.orgId,
        version_number: doc.current_version,
        title: doc.title,
        structured_data: doc.structured_data as unknown as Json,
        extracted_text: doc.extracted_text,
        changed_by: ctx.user.id,
        change_summary: generateChangeSummary(
          (doc.structured_data ?? {}) as Record<string, unknown>,
          (input.structuredData ?? doc.structured_data ?? {}) as Record<string, unknown>
        ),
      })

      // 3. Build updated text for embedding
      const newStructuredData = input.structuredData ?? (doc.structured_data as Record<string, unknown>)
      const extractedText = stringifyForEmbedding(newStructuredData as Record<string, unknown>)
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length

      // 4. Update the document
      const { data: updated, error: updateError } = await ctx.supabase
        .from('knowledge_base_documents')
        .update({
          title: input.title ?? doc.title,
          description: input.description ?? doc.description,
          structured_data: newStructuredData as unknown as Json,
          extracted_text: extractedText,
          word_count: wordCount,
          current_version: doc.current_version + 1,
          last_edited_by: ctx.user.id,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', doc.id)
        .select()
        .single<KBDocumentRow>()

      if (updateError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })

      // 5. Re-trigger embedding
      if (input.structuredData && doc.content_type) {
        triggerStructuredEmbedding(ctx.orgId, doc.id, updated.title, input.structuredData)
      }

      return updated
    }),

  // ── Feature 3: Version history ─────────────────────────────────
  getVersionHistory: orgProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('knowledge_document_versions')
        .select('*')
        .eq('document_id', input.documentId)
        .eq('organization_id', ctx.orgId)
        .order('version_number', { ascending: false })
        .returns<KBVersionRow[]>()

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return data ?? []
    }),

  restoreVersion: orgProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        versionNumber: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get the version to restore
      const { data: version, error: versionError } = await ctx.supabase
        .from('knowledge_document_versions')
        .select('*')
        .eq('document_id', input.documentId)
        .eq('organization_id', ctx.orgId)
        .eq('version_number', input.versionNumber)
        .single<KBVersionRow>()

      if (versionError || !version)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' })

      // 2. Get current document
      const { data: doc, error: docError } = await ctx.supabase
        .from('knowledge_base_documents')
        .select('*')
        .eq('id', input.documentId)
        .eq('organization_id', ctx.orgId)
        .single<KBDocumentRow>()

      if (docError || !doc)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      // 3. Snapshot current state before restoring
      await ctx.supabase.from('knowledge_document_versions').insert({
        document_id: doc.id,
        organization_id: ctx.orgId,
        version_number: doc.current_version,
        title: doc.title,
        structured_data: doc.structured_data as unknown as Json,
        extracted_text: doc.extracted_text,
        changed_by: ctx.user.id,
        change_summary: `Restored from version ${input.versionNumber}`,
      })

      // 4. Restore the old version's content
      const restoredData = (version.structured_data ?? {}) as Record<string, unknown>
      const extractedText = stringifyForEmbedding(restoredData)
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length

      const { data: updated, error: updateError } = await ctx.supabase
        .from('knowledge_base_documents')
        .update({
          title: version.title,
          structured_data: version.structured_data as unknown as Json,
          extracted_text: extractedText,
          word_count: wordCount,
          current_version: doc.current_version + 1,
          last_edited_by: ctx.user.id,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', doc.id)
        .select()
        .single<KBDocumentRow>()

      if (updateError)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: updateError.message })

      // 5. Re-trigger embedding
      if (doc.content_type) {
        triggerStructuredEmbedding(ctx.orgId, doc.id, version.title, restoredData)
      }

      return updated
    }),

  // ── Feature 5: Public sharing ──────────────────────────────────
  createShareLink: orgProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        expiresAt: z.string().datetime().optional(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = nanoid(12)
      const passwordHash = input.password
        ? createHash('sha256').update(input.password).digest('hex')
        : null

      const { data, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .update({
          is_public: true,
          public_slug: slug,
          public_expires_at: input.expiresAt ?? null,
          public_password_hash: passwordHash,
          public_view_count: 0,
        })
        .eq('id', input.documentId)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<KBDocumentRow>()

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      return { slug: data.public_slug, url: `/kb/share/${slug}` }
    }),

  revokeShareLink: orgProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('knowledge_base_documents')
        .update({
          is_public: false,
          public_slug: null,
          public_expires_at: null,
          public_password_hash: null,
        })
        .eq('id', input.documentId)
        .eq('organization_id', ctx.orgId)

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  getPublicDocument: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        password: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: doc, error } = await ctx.supabase
        .from('knowledge_base_documents')
        .select('id, title, description, content_type, structured_data, is_public, public_slug, public_expires_at, public_password_hash, public_view_count, created_at')
        .eq('public_slug', input.slug)
        .eq('is_public', true)
        .single()

      if (error || !doc)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found' })

      // Check expiry
      if (doc.public_expires_at && new Date(doc.public_expires_at) < new Date()) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This shared link has expired' })
      }

      // Check password
      if (doc.public_password_hash) {
        if (!input.password) {
          return { requiresPassword: true as const, title: doc.title }
        }
        const hash = createHash('sha256').update(input.password).digest('hex')
        if (hash !== doc.public_password_hash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Incorrect password' })
        }
      }

      // Increment view count (fire-and-forget)
      ctx.supabase
        .from('knowledge_base_documents')
        .update({ public_view_count: (doc.public_view_count ?? 0) + 1 })
        .eq('id', doc.id)
        .then(() => {})

      // STAGE_B: Per-view analytics with timestamps and geo data

      return {
        requiresPassword: false as const,
        title: doc.title,
        description: doc.description,
        contentType: doc.content_type,
        structuredData: doc.structured_data,
        viewCount: (doc.public_view_count ?? 0) + 1,
        createdAt: doc.created_at,
      }
    }),

  // ── Existing delete procedure ──────────────────────────────────
  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Clean up embeddings
      triggerEmbeddingDeletion('document', input.id)

      const { error } = await ctx.supabase
        .from('knowledge_base_documents')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})

// ── Helper: Generate change summary ──────────────────────────────
function generateChangeSummary(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): string {
  const changed: string[] = []
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  for (const key of allKeys) {
    if (key.startsWith('_')) continue
    const oldVal = JSON.stringify(oldData[key])
    const newVal = JSON.stringify(newData[key])
    if (oldVal !== newVal) {
      changed.push(formatFieldLabel(key))
    }
  }

  if (changed.length === 0) return 'No changes'
  if (changed.length <= 3) return `Updated: ${changed.join(', ')}`
  return `Updated ${changed.length} fields`
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}
