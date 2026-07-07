-- ============================================================
-- 011: Departments & Job Titles
-- ============================================================

-- ── departments table ─────────────────────────────────────────
CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT NOT NULL DEFAULT '#6B7280',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

CREATE INDEX idx_departments_org ON departments(organization_id);
CREATE INDEX idx_departments_sort ON departments(organization_id, sort_order);

-- Reuse existing update_updated_at() trigger function from 001
CREATE TRIGGER set_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Extend organization_members ───────────────────────────────
ALTER TABLE organization_members
  ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN job_title TEXT;

CREATE INDEX idx_org_members_department ON organization_members(department_id);

-- ── Extend invitations (dept+title flow through invite → accept)
ALTER TABLE invitations
  ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ADD COLUMN job_title TEXT;

-- ── RLS for departments ───────────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- All org members can view departments
CREATE POLICY "Org members can view departments"
  ON departments FOR SELECT
  USING (organization_id = public.org_id());

-- Admins can create departments
CREATE POLICY "Admins can create departments"
  ON departments FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('admin'));

-- Admins can update departments
CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- Admins can delete departments
CREATE POLICY "Admins can delete departments"
  ON departments FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('admin'));
