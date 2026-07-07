-- ============================================================
-- TEAM CHAT: Project-Scoped Channels (Stage A)
-- ============================================================

-- Channel type enum
-- Only 'project' is used in Stage A
CREATE TYPE channel_type AS ENUM (
  'project',
  'direct',       -- Direct messages between two users
  'general',      -- Org-wide general channel
  'announcement'  -- Org-wide announcements (admin-only posting)
);

-- ============================================================
-- CHANNELS: One per project (Stage A), expandable later
-- ============================================================
CREATE TABLE channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            channel_type NOT NULL DEFAULT 'project',
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure one project channel per project
CREATE UNIQUE INDEX idx_channels_project_unique
  ON channels (project_id, type) WHERE type = 'project';

CREATE INDEX idx_channels_org ON channels(organization_id);
CREATE INDEX idx_channels_project ON channels(project_id);

-- ============================================================
-- CHANNEL MESSAGES: Chat messages within a channel
-- ============================================================
CREATE TABLE channel_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]',
  mentions    UUID[] NOT NULL DEFAULT '{}',
  is_edited   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_channel_messages_channel_time
  ON channel_messages (channel_id, created_at DESC);

CREATE INDEX idx_channel_messages_mentions
  ON channel_messages USING GIN (mentions);

-- ============================================================
-- UNREAD CURSORS: Per-user read position in each channel
-- ============================================================
CREATE TABLE unread_cursors (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id   UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- channels: org-scoped access
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view channels"
  ON channels FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Org members can insert channels"
  ON channels FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "Managers can update channels"
  ON channels FOR UPDATE
  USING (organization_id = public.org_id());

CREATE POLICY "Admins can delete channels"
  ON channels FOR DELETE
  USING (organization_id = public.org_id());

-- channel_messages: inherit access from channel's org
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view channel messages"
  ON channel_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_messages.channel_id
      AND channels.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can insert channel messages"
  ON channel_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_messages.channel_id
      AND channels.organization_id = public.org_id()
    )
  );

CREATE POLICY "Users can update own messages"
  ON channel_messages FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_messages.channel_id
      AND channels.organization_id = public.org_id()
    )
  );

CREATE POLICY "Users can delete own messages"
  ON channel_messages FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_messages.channel_id
      AND channels.organization_id = public.org_id()
    )
  );

-- unread_cursors: users can only manage their own
ALTER TABLE unread_cursors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cursors"
  ON unread_cursors FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- REALTIME: Enable for live message delivery
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE channel_messages;
