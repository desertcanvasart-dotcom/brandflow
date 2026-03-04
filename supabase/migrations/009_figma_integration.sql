-- ============================================================
-- 009_figma_integration.sql
-- Phase 3, Feature 4: Figma Integration
-- ============================================================

-- ── figma_connections ──
CREATE TABLE figma_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  figma_user_id TEXT NOT NULL,
  figma_user_name TEXT,
  figma_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  figma_team_ids TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_figma_connections_user ON figma_connections(user_id);
CREATE INDEX idx_figma_connections_org ON figma_connections(organization_id);

-- Updated at trigger (reuse existing function)
CREATE TRIGGER set_figma_connections_updated_at
  BEFORE UPDATE ON figma_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──
ALTER TABLE figma_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connection
CREATE POLICY figma_connections_select ON figma_connections
  FOR SELECT USING (user_id = auth.uid() AND organization_id = public.org_id());

-- Users can insert their own connection
CREATE POLICY figma_connections_insert ON figma_connections
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.org_id());

-- Users can update their own connection
CREATE POLICY figma_connections_update ON figma_connections
  FOR UPDATE USING (user_id = auth.uid() AND organization_id = public.org_id());

-- Users can delete their own connection
CREATE POLICY figma_connections_delete ON figma_connections
  FOR DELETE USING (user_id = auth.uid() AND organization_id = public.org_id());
