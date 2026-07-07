-- ============================================================
-- 025_chat_stage_c.sql
-- Stage C: DMs, Org-wide Channels, Threaded Replies
-- ============================================================

-- ── 1. channel_members table (DM participants) ─────────────
CREATE TABLE IF NOT EXISTS channel_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user    ON channel_members(user_id);

-- ── 2. Thread columns on channel_messages ──────────────────
ALTER TABLE channel_messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES channel_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reply_at     TIMESTAMPTZ;

CREATE INDEX idx_channel_messages_parent
  ON channel_messages(parent_message_id)
  WHERE parent_message_id IS NOT NULL;

-- ── 3. Unique indexes for org-wide channels ────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_general_unique
  ON channels (organization_id, type) WHERE type = 'general';

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_announcement_unique
  ON channels (organization_id, type) WHERE type = 'announcement';

-- ── 4. Trigger for reply_count / last_reply_at ─────────────
CREATE OR REPLACE FUNCTION update_thread_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    UPDATE channel_messages
    SET reply_count  = reply_count + 1,
        last_reply_at = NEW.created_at
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    UPDATE channel_messages
    SET reply_count  = GREATEST(reply_count - 1, 0),
        last_reply_at = (
          SELECT MAX(created_at) FROM channel_messages
          WHERE parent_message_id = OLD.parent_message_id
            AND id != OLD.id
        )
    WHERE id = OLD.parent_message_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_thread_counts
  AFTER INSERT OR DELETE ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_thread_counts();

-- ── 5. RLS for channel_members ─────────────────────────────
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view channel members"
  ON channel_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
        AND channels.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can insert channel members"
  ON channel_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
        AND channels.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can delete channel members"
  ON channel_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = channel_members.channel_id
        AND channels.organization_id = public.org_id()
    )
  );

-- ── 6. SQL function: get_messages_unread_count() ───────────
CREATE OR REPLACE FUNCTION public.get_messages_unread_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cnt), 0)::int
  FROM (
    SELECT COUNT(*) AS cnt
    FROM channels ch
    JOIN channel_messages cm ON cm.channel_id = ch.id
    LEFT JOIN unread_cursors uc
      ON uc.channel_id = ch.id AND uc.user_id = auth.uid()
    WHERE ch.organization_id = org_id()
      AND ch.type IN ('direct', 'general', 'announcement')
      AND cm.user_id IS DISTINCT FROM auth.uid()
      AND cm.parent_message_id IS NULL
      AND (uc.last_read_at IS NULL OR cm.created_at > uc.last_read_at)
      AND (
        ch.type != 'direct'
        OR EXISTS (
          SELECT 1 FROM channel_members
          WHERE channel_id = ch.id AND user_id = auth.uid()
        )
      )
  ) sub;
$$;

-- ── 7. Update get_total_unread_chat_count() ────────────────
-- Exclude thread replies from project-level unread count
CREATE OR REPLACE FUNCTION public.get_total_unread_chat_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cnt), 0)::int
  FROM (
    SELECT COUNT(*) AS cnt
    FROM channels ch
    JOIN channel_messages cm ON cm.channel_id = ch.id
    LEFT JOIN unread_cursors uc
      ON uc.channel_id = ch.id AND uc.user_id = auth.uid()
    WHERE ch.organization_id = org_id()
      AND ch.type = 'project'
      AND cm.user_id IS DISTINCT FROM auth.uid()
      AND cm.parent_message_id IS NULL
      AND (uc.last_read_at IS NULL OR cm.created_at > uc.last_read_at)
  ) sub;
$$;

-- ── 8. Realtime publication ────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE channel_members;
