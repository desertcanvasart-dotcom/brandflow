-- ============================================================
-- RLS HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.org_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'organization_id')::UUID,
    (SELECT organization_id FROM public.organization_members
     WHERE user_id = auth.uid() AND is_active = TRUE
     LIMIT 1)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'user_role')::user_role,
    (SELECT role FROM public.organization_members
     WHERE user_id = auth.uid()
       AND organization_id = public.org_id()
       AND is_active = TRUE
     LIMIT 1)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(min_role user_role)
RETURNS BOOLEAN AS $$
  SELECT CASE public.user_role()
    WHEN 'admin'     THEN TRUE
    WHEN 'manager'   THEN min_role IN ('manager','creator','developer','viewer')
    WHEN 'creator'   THEN min_role IN ('creator','viewer')
    WHEN 'developer' THEN min_role IN ('developer','viewer')
    WHEN 'viewer'    THEN min_role = 'viewer'
    WHEN 'client'    THEN min_role = 'client'
    ELSE FALSE
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get brand IDs a client user has access to (bypasses RLS on client_access)
CREATE OR REPLACE FUNCTION public.client_brand_ids()
RETURNS SETOF UUID AS $$
  SELECT brand_id FROM public.client_access WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get brand IDs belonging to the current org (bypasses RLS on brands)
CREATE OR REPLACE FUNCTION public.org_brand_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM public.brands WHERE organization_id = public.org_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_access ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE POLICY "Members can view their org"
  ON organizations FOR SELECT
  USING (id = public.org_id());

CREATE POLICY "Admins can update their org"
  ON organizations FOR UPDATE
  USING (id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================
CREATE POLICY "Members can view org members"
  ON organization_members FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Admins can insert members"
  ON organization_members FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Admins can update members"
  ON organization_members FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Users can update own profile"
  ON organization_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete members"
  ON organization_members FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE POLICY "Admins/Managers can view invitations"
  ON invitations FOR SELECT
  USING (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Admins can update invitations"
  ON invitations FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- BRANDS
-- ============================================================
CREATE POLICY "Org members can view brands"
  ON brands FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Clients can view their brands"
  ON brands FOR SELECT
  USING (id IN (SELECT public.client_brand_ids()));

CREATE POLICY "Managers+ can create brands"
  ON brands FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Managers+ can update brands"
  ON brands FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Admins can delete brands"
  ON brands FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE POLICY "Org members can view projects"
  ON projects FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Clients can view projects for their brands"
  ON projects FOR SELECT
  USING (brand_id IN (SELECT public.client_brand_ids()));

CREATE POLICY "Managers+ can create projects"
  ON projects FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Managers+ can update projects"
  ON projects FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Admins can delete projects"
  ON projects FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- PHASES
-- ============================================================
CREATE POLICY "Users can view phases"
  ON phases FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
  );

CREATE POLICY "Managers+ can create phases"
  ON phases FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
    AND public.has_role('manager')
  );

CREATE POLICY "Managers+ can update phases"
  ON phases FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
    AND public.has_role('manager')
  );

CREATE POLICY "Admins can delete phases"
  ON phases FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
    AND public.has_role('admin')
  );

-- ============================================================
-- TASKS
-- ============================================================
CREATE POLICY "Org members can view tasks"
  ON tasks FOR SELECT
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
  );

CREATE POLICY "Clients can view tasks for their brands"
  ON tasks FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.brand_id IN (SELECT public.client_brand_ids())
    )
  );

CREATE POLICY "Creators+ can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
    AND public.has_role('creator')
  );

CREATE POLICY "Assignees and Managers+ can update tasks"
  ON tasks FOR UPDATE
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
    AND (public.has_role('manager') OR assignee_id = auth.uid())
  );

CREATE POLICY "Managers+ can delete tasks"
  ON tasks FOR DELETE
  USING (
    project_id IN (SELECT id FROM projects WHERE organization_id = public.org_id())
    AND public.has_role('manager')
  );

-- ============================================================
-- CONTENT ITEMS
-- ============================================================
CREATE POLICY "Users can view content items"
  ON content_items FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Creators+ can manage content items"
  ON content_items FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND public.has_role('creator')
  );

-- ============================================================
-- CONTENT VERSIONS
-- ============================================================
CREATE POLICY "Users can view content versions"
  ON content_versions FOR SELECT
  USING (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      JOIN tasks t ON t.id = ci.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Creators+ can create content versions"
  ON content_versions FOR INSERT
  WITH CHECK (
    content_item_id IN (
      SELECT ci.id FROM content_items ci
      JOIN tasks t ON t.id = ci.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND public.has_role('creator')
  );

-- ============================================================
-- DELIVERABLES
-- ============================================================
CREATE POLICY "Users can view deliverables"
  ON deliverables FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Creators+ can manage deliverables"
  ON deliverables FOR ALL
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND public.has_role('creator')
  );

-- ============================================================
-- DELIVERABLE VERSIONS
-- ============================================================
CREATE POLICY "Users can view deliverable versions"
  ON deliverable_versions FOR SELECT
  USING (
    deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Creators+ can create deliverable versions"
  ON deliverable_versions FOR INSERT
  WITH CHECK (
    deliverable_id IN (
      SELECT d.id FROM deliverables d
      JOIN tasks t ON t.id = d.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND public.has_role('creator')
  );

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE POLICY "Org members can view comments"
  ON comments FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Clients can view non-internal comments"
  ON comments FOR SELECT
  USING (
    is_internal = FALSE
    AND task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.brand_id IN (SELECT public.client_brand_ids())
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
  );

CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors and Managers+ can delete comments"
  ON comments FOR DELETE
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE p.organization_id = public.org_id()
    )
    AND (author_id = auth.uid() OR public.has_role('manager'))
  );

-- ============================================================
-- ASSETS
-- ============================================================
CREATE POLICY "Org members can view assets"
  ON assets FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Creators+ can upload assets"
  ON assets FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('creator'));

CREATE POLICY "Creators+ can update assets"
  ON assets FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('creator'));

CREATE POLICY "Managers+ can delete assets"
  ON assets FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('manager'));

-- ============================================================
-- WORKFLOW TEMPLATES
-- ============================================================
CREATE POLICY "Org members can view templates"
  ON workflow_templates FOR SELECT
  USING (
    organization_id IS NULL
    OR organization_id = public.org_id()
  );

CREATE POLICY "Admins can manage templates"
  ON workflow_templates FOR ALL
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ============================================================
-- CLIENT ACCESS
-- ============================================================
CREATE POLICY "Managers+ can view client access"
  ON client_access FOR SELECT
  USING (
    brand_id IN (SELECT public.org_brand_ids())
    AND public.has_role('manager')
  );

CREATE POLICY "Users can see own client access"
  ON client_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage client access"
  ON client_access FOR ALL
  USING (
    brand_id IN (SELECT public.org_brand_ids())
    AND public.has_role('admin')
  );
