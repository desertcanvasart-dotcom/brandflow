-- ============================================================
-- 029_social_connections.sql
-- Phase 3: Social Media Publishing - OAuth connections per brand
-- ============================================================

-- ── Add 'publishing' to task_status enum (transient lock state for cron) ──
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'publishing' AFTER 'scheduled';

-- ── social_connections ──
CREATE TABLE social_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id          UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform          content_platform NOT NULL,
  -- OAuth credentials
  access_token      TEXT NOT NULL,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  -- Platform-specific identifiers
  platform_user_id    TEXT NOT NULL,
  platform_user_name  TEXT,
  platform_page_id    TEXT,
  platform_page_name  TEXT,
  platform_page_url   TEXT,
  -- Meta-specific: page access token (different from user token)
  page_access_token   TEXT,
  -- Connection metadata
  scopes            TEXT[] DEFAULT '{}',
  connected_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata          JSONB DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  -- One connection per brand per platform
  UNIQUE(brand_id, platform)
);

-- Indexes
CREATE INDEX idx_social_connections_brand ON social_connections(brand_id);
CREATE INDEX idx_social_connections_org ON social_connections(organization_id);
CREATE INDEX idx_social_connections_platform ON social_connections(platform);
CREATE INDEX idx_social_connections_active ON social_connections(brand_id, platform) WHERE is_active = TRUE;

-- Updated at trigger
CREATE TRIGGER set_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── publish_log (audit trail for every publish attempt) ──
CREATE TABLE publish_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content_item_id      UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  social_connection_id UUID REFERENCES social_connections(id) ON DELETE SET NULL,
  platform             content_platform NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending',
  platform_post_id     TEXT,
  platform_post_url    TEXT,
  error_message        TEXT,
  error_code           TEXT,
  retry_count          INT NOT NULL DEFAULT 0,
  metadata             JSONB DEFAULT '{}',
  attempted_at         TIMESTAMPTZ DEFAULT now(),
  completed_at         TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_publish_log_content ON publish_log(content_item_id);
CREATE INDEX idx_publish_log_org ON publish_log(organization_id);
CREATE INDEX idx_publish_log_status ON publish_log(status);
CREATE INDEX idx_publish_log_pending ON publish_log(content_item_id, status) WHERE status = 'failed';

-- ── RLS ──
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_log ENABLE ROW LEVEL SECURITY;

-- social_connections: org members can read, admins can write
CREATE POLICY social_connections_select ON social_connections
  FOR SELECT USING (organization_id = public.org_id());

CREATE POLICY social_connections_insert ON social_connections
  FOR INSERT WITH CHECK (organization_id = public.org_id());

CREATE POLICY social_connections_update ON social_connections
  FOR UPDATE USING (organization_id = public.org_id());

CREATE POLICY social_connections_delete ON social_connections
  FOR DELETE USING (organization_id = public.org_id());

-- Super admins can view all social connections
CREATE POLICY social_connections_super_admin ON social_connections
  FOR SELECT USING (public.is_super_admin());

-- publish_log: org members can read and insert
CREATE POLICY publish_log_select ON publish_log
  FOR SELECT USING (organization_id = public.org_id());

CREATE POLICY publish_log_insert ON publish_log
  FOR INSERT WITH CHECK (organization_id = public.org_id());

CREATE POLICY publish_log_update ON publish_log
  FOR UPDATE USING (organization_id = public.org_id());
