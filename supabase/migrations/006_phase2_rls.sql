-- ============================================================
-- PHASE 2: RLS POLICIES
-- ============================================================

-- Enable RLS on all Phase 2 tables
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MEETINGS
-- ============================================================
CREATE POLICY "Org members can view meetings"
  ON meetings FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Clients can view client meetings for their brands"
  ON meetings FOR SELECT
  USING (
    meeting_type = 'client'
    AND brand_id IN (SELECT public.client_brand_ids())
  );

CREATE POLICY "Managers+ can create meetings"
  ON meetings FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Managers+ can update meetings"
  ON meetings FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Admins can delete meetings"
  ON meetings FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- MEETING PARTICIPANTS
-- ============================================================
CREATE POLICY "Org members can view meeting participants"
  ON meeting_participants FOR SELECT
  USING (
    meeting_id IN (SELECT id FROM meetings WHERE organization_id = public.org_id())
  );

CREATE POLICY "Managers+ can add participants"
  ON meeting_participants FOR INSERT
  WITH CHECK (
    meeting_id IN (SELECT id FROM meetings WHERE organization_id = public.org_id())
    AND public.has_role('manager')
  );

CREATE POLICY "Participants can update own record"
  ON meeting_participants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Managers+ can remove participants"
  ON meeting_participants FOR DELETE
  USING (
    meeting_id IN (SELECT id FROM meetings WHERE organization_id = public.org_id())
    AND public.has_role('manager')
  );

-- ============================================================
-- BRIEFS
-- ============================================================
CREATE POLICY "Org members can view briefs"
  ON briefs FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Creators+ can create briefs"
  ON briefs FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('creator'));

CREATE POLICY "Creators+ can update briefs"
  ON briefs FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('creator'));

CREATE POLICY "Managers+ can delete briefs"
  ON briefs FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('manager'));

-- ============================================================
-- ANNOTATIONS
-- ============================================================
CREATE POLICY "Org members can view annotations"
  ON annotations FOR SELECT
  USING (
    deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Clients can view annotations for their brands"
  ON annotations FOR SELECT
  USING (
    deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.brand_id IN (SELECT public.client_brand_ids())
    )
  );

CREATE POLICY "Creators+ can create annotations"
  ON annotations FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND public.has_role('creator')
  );

CREATE POLICY "Clients can create annotations for their brands"
  ON annotations FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.brand_id IN (SELECT public.client_brand_ids())
    )
  );

CREATE POLICY "Authors can update own annotations"
  ON annotations FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors and Managers+ can delete annotations"
  ON annotations FOR DELETE
  USING (
    deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND (author_id = auth.uid() OR public.has_role('manager'))
  );

-- ============================================================
-- EMBEDDINGS
-- ============================================================
CREATE POLICY "Org members can view embeddings"
  ON embeddings FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Creators+ can create embeddings"
  ON embeddings FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('creator'));

CREATE POLICY "Creators+ can delete embeddings"
  ON embeddings FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('creator'));
