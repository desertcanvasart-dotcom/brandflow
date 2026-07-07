-- ============================================================
-- 026_chat_enhancements.sql
-- Stage D: Create Task from Message, Decision Logging,
--          AI Slash Commands, Pinned Messages, Enhanced Chat Header
-- ============================================================

-- ── 1. project_decisions table ───────────────────────────────
CREATE TABLE IF NOT EXISTS project_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message_id      UUID NOT NULL REFERENCES channel_messages(id) ON DELETE CASCADE,
  channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  marked_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent double-marking the same message
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_decisions_message
  ON project_decisions(message_id);

CREATE INDEX idx_project_decisions_project ON project_decisions(project_id);
CREATE INDEX idx_project_decisions_org     ON project_decisions(organization_id);

-- ── 2. Pinned messages column on channels ────────────────────
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS pinned_message_ids UUID[] NOT NULL DEFAULT '{}';

-- ── 3. RLS for project_decisions ─────────────────────────────
ALTER TABLE project_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view decisions"
  ON project_decisions FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Org members can insert decisions"
  ON project_decisions FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "Org members can delete decisions"
  ON project_decisions FOR DELETE
  USING (organization_id = public.org_id());

-- ── 4. Realtime publication ──────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE project_decisions;
