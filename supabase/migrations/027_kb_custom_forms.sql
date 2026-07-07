-- 027_kb_custom_forms.sql
-- Adds structured form data support to knowledge_base_documents
-- content_type discriminates form type; structured_data stores JSONB fields

ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS structured_data JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_kb_docs_content_type
  ON knowledge_base_documents (content_type);
