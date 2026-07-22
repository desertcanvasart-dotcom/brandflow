-- Knowledge Base v2: Add categories, scoping, URL imports, chunk tracking
-- Extends the knowledge_base_documents table from 017_knowledge_base.sql

-- 1. Add category column
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- 2. Add knowledge_scope column
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS knowledge_scope text NOT NULL DEFAULT 'brand';

-- 3. Add project_id for project-scoped knowledge
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- 4. Add source_url for URL imports
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS source_url text;

-- 5. Add chunk_count (computed when embeddings are created)
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS chunk_count integer NOT NULL DEFAULT 0;

-- 6. Expand source_type CHECK constraint to include new types
ALTER TABLE knowledge_base_documents
  DROP CONSTRAINT IF EXISTS knowledge_base_documents_source_type_check;

ALTER TABLE knowledge_base_documents
  ADD CONSTRAINT knowledge_base_documents_source_type_check
  CHECK (source_type IN ('uploaded_file', 'pasted_text', 'url_import', 'brand_guidelines', 'sop', 'text_note'));

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_kb_docs_category ON knowledge_base_documents(category);
CREATE INDEX IF NOT EXISTS idx_kb_docs_scope ON knowledge_base_documents(knowledge_scope);
CREATE INDEX IF NOT EXISTS idx_kb_docs_project ON knowledge_base_documents(project_id) WHERE project_id IS NOT NULL;

-- 8. Backfill chunk_count for existing documents
UPDATE knowledge_base_documents
  SET chunk_count = (
    SELECT count(*)
    FROM embeddings
    WHERE embeddings.source_type = 'document'
      AND embeddings.source_id = knowledge_base_documents.id
  )
  WHERE embedding_status = 'ready';
