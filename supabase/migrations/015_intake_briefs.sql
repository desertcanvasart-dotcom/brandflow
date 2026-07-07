-- ============================================================
-- 015_intake_briefs.sql
-- Intake extraction & service briefs pipeline
-- ============================================================

-- ── 1A. project_intake ──────────────────────────────────────

CREATE TABLE project_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,

  client_name TEXT,
  company_name TEXT,
  industry TEXT,
  goals JSONB DEFAULT '[]'::jsonb,
  services_requested TEXT[] DEFAULT '{}',
  target_audience JSONB DEFAULT '{}'::jsonb,
  competitors JSONB DEFAULT '[]'::jsonb,
  budget_range TEXT,
  timeline TEXT,
  start_date DATE,
  pain_points JSONB DEFAULT '[]'::jsonb,
  existing_assets JSONB DEFAULT '[]'::jsonb,
  raw_extraction JSONB,

  confidence TEXT DEFAULT 'high' CHECK (confidence IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved')),
  extracted_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON project_intake
  USING (organization_id = public.org_id());

CREATE POLICY "org_insert" ON project_intake FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "org_update" ON project_intake FOR UPDATE
  USING (organization_id = public.org_id());

CREATE POLICY "org_delete" ON project_intake FOR DELETE
  USING (organization_id = public.org_id());

-- Super admin bypass
CREATE POLICY "super_admin_select_intake" ON project_intake FOR SELECT
  USING (public.is_super_admin());


-- ── 1B. service_briefs ──────────────────────────────────────

CREATE TABLE service_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID REFERENCES project_intake(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  service_type TEXT NOT NULL,
  title TEXT,
  overview TEXT,
  objectives JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '{}'::jsonb,
  requirements JSONB DEFAULT '{}'::jsonb,
  kpis JSONB DEFAULT '[]'::jsonb,
  notes TEXT,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'active')),
  generated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON service_briefs
  USING (organization_id = public.org_id());

CREATE POLICY "org_insert" ON service_briefs FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "org_update" ON service_briefs FOR UPDATE
  USING (organization_id = public.org_id());

CREATE POLICY "org_delete" ON service_briefs FOR DELETE
  USING (organization_id = public.org_id());

CREATE POLICY "super_admin_select_briefs" ON service_briefs FOR SELECT
  USING (public.is_super_admin());


-- ── 1C. task_generation_log (schema-only for Stage 2) ───────

CREATE TABLE task_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  brief_id UUID REFERENCES service_briefs(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  service_type TEXT,
  full_ai_response JSONB,
  included_tasks JSONB,
  excluded_tasks JSONB,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE task_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON task_generation_log
  USING (organization_id = public.org_id());


-- ── 1D. meeting_agenda_templates ────────────────────────────

CREATE TABLE meeting_agenda_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  service_types TEXT[] DEFAULT '{}',
  sections JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meeting_agenda_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON meeting_agenda_templates
  USING (organization_id = public.org_id());

CREATE POLICY "org_insert" ON meeting_agenda_templates FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "org_update" ON meeting_agenda_templates FOR UPDATE
  USING (organization_id = public.org_id());

CREATE POLICY "org_delete" ON meeting_agenda_templates FOR DELETE
  USING (organization_id = public.org_id());


-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_project_intake_project ON project_intake(project_id);
CREATE INDEX idx_project_intake_org ON project_intake(organization_id);
CREATE INDEX idx_service_briefs_project ON service_briefs(project_id);
CREATE INDEX idx_service_briefs_intake ON service_briefs(intake_id);
CREATE INDEX idx_service_briefs_org ON service_briefs(organization_id);
CREATE INDEX idx_task_gen_log_project ON task_generation_log(project_id);
CREATE INDEX idx_task_gen_log_brief ON task_generation_log(brief_id);
CREATE INDEX idx_agenda_templates_org ON meeting_agenda_templates(organization_id);
