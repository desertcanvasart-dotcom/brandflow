-- ============================================================
-- 024: Chat Stage B — Emoji Reactions + Aggregate Unread
-- ============================================================

-- ── MESSAGE REACTIONS TABLE ──────────────────────────────────
CREATE TABLE message_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES channel_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One reaction per user per emoji per message
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user    ON message_reactions(user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Org members can view reactions (via message → channel → org)
CREATE POLICY "Org members can view reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channel_messages cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.id = message_reactions.message_id
        AND c.organization_id = public.org_id()
    )
  );

-- Org members can add reactions to messages in their org
CREATE POLICY "Org members can insert reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM channel_messages cm
      JOIN channels c ON c.id = cm.channel_id
      WHERE cm.id = message_reactions.message_id
        AND c.organization_id = public.org_id()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ── REALTIME ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ── AGGREGATE UNREAD FUNCTION ────────────────────────────────
-- Returns total unread chat message count across all project
-- channels for the current user.
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
      AND (uc.last_read_at IS NULL OR cm.created_at > uc.last_read_at)
  ) sub;
$$;
