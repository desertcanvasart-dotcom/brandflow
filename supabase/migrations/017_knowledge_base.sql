-- Knowledge Base: Document Upload & RAG Indexing
-- Adds support for uploading documents (PDF, TXT, MD) or pasting text
-- for RAG indexing via pgvector embeddings.

-- 1. Add 'document' to embedding_source_type enum
ALTER TYPE embedding_source_type ADD VALUE IF NOT EXISTS 'document';

-- 2. Create knowledge_base_documents table
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,             -- R2 URL (NULL for pasted text)
  file_name TEXT,            -- original filename (NULL for pasted text)
  file_size BIGINT,          -- bytes
  mime_type TEXT,             -- application/pdf, text/plain, text/markdown
  extracted_text TEXT,        -- full extracted text
  word_count INTEGER DEFAULT 0,
  embedding_status TEXT NOT NULL DEFAULT 'processing'
    CHECK (embedding_status IN ('processing', 'ready', 'failed', 'no_text')),
  source_type TEXT NOT NULL DEFAULT 'uploaded_file'
    CHECK (source_type IN ('uploaded_file', 'pasted_text')),
  error_message TEXT,         -- if extraction/embedding fails
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_kb_docs_org_brand
  ON knowledge_base_documents(organization_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_kb_docs_embedding_status
  ON knowledge_base_documents(embedding_status);
CREATE INDEX IF NOT EXISTS idx_kb_docs_created_at
  ON knowledge_base_documents(created_at DESC);

-- 4. Updated-at trigger function + trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Org members can SELECT documents in their org
CREATE POLICY "Org members can view knowledge base documents"
  ON knowledge_base_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Org members can INSERT documents (any member can upload)
CREATE POLICY "Org members can upload knowledge base documents"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Org members can UPDATE their own documents (or managers can update any)
CREATE POLICY "Org members can update knowledge base documents"
  ON knowledge_base_documents FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Managers+ can DELETE documents
CREATE POLICY "Managers can delete knowledge base documents"
  ON knowledge_base_documents FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
    )
  );
