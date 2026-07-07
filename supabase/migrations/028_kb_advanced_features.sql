-- =====================================================================
-- Migration 028: Knowledge Base Advanced Features
-- Adds: AI auto-fill audit, HubSpot connections, version history,
--        collaborative editing locks, public sharing
-- =====================================================================

-- ── Feature 1: AI Auto-Fill audit columns ─────────────────────────────
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS auto_fill_source TEXT,
  ADD COLUMN IF NOT EXISTS auto_fill_source_url TEXT;

-- ── Feature 2: HubSpot connections ────────────────────────────────────
CREATE TABLE IF NOT EXISTS hubspot_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  portal_id TEXT NOT NULL,
  connected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id)
);

ALTER TABLE hubspot_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON hubspot_connections
  USING (organization_id = public.org_id());

-- ── Feature 3: Version history ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  structured_data JSONB DEFAULT '{}',
  extracted_text TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (document_id, version_number)
);

ALTER TABLE knowledge_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON knowledge_document_versions
  USING (organization_id = public.org_id());

CREATE INDEX IF NOT EXISTS idx_doc_versions_document
  ON knowledge_document_versions(document_id, version_number DESC);

ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- ── Feature 4: Collaborative editing locks ────────────────────────────
CREATE TABLE IF NOT EXISTS kb_document_locks (
  document_id UUID REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  locked_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 seconds'),
  PRIMARY KEY (document_id, field_name)
);

ALTER TABLE kb_document_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_locks" ON kb_document_locks
  USING (
    document_id IN (
      SELECT id FROM knowledge_base_documents
      WHERE organization_id = public.org_id()
    )
  );

-- ── Feature 5: Public sharing ─────────────────────────────────────────
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS public_view_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_kb_docs_public_slug
  ON knowledge_base_documents(public_slug)
  WHERE is_public = TRUE;
