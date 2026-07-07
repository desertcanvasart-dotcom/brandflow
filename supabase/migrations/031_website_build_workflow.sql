-- ============================================================
-- 031_website_build_workflow.sql
--
-- Adds a website-build workflow with auto-seeded phase task
-- checklists, scoped to ONE organization (multi-tenant safe).
--
-- WHY ORG-SCOPED (do not "simplify" this away):
--   BrandFlow is a single deployment serving many tenants. The
--   shared system-default web_build template (organization_id IS
--   NULL) must remain generic and UNTOUCHED so other tenants keep
--   using it. This migration therefore:
--     * INSERTs an ORG-OWNED template (never UPDATEs the default),
--     * stores checklists in a table keyed by organization_id,
--     * seeds tasks via a TENANT-AWARE trigger (org-filtered),
--     * restricts reads with org-scoped RLS.
--
--   This is EXAMPLE ORGANIZATION CONFIGURATION. The row content
--   below is one customer's (a website studio's) six-phase
--   methodology. Onboarding a *new* tenant means re-running this
--   pattern with THAT tenant's org id and their own stages/
--   checklists — i.e. copy the seed data, never rename the
--   machinery (phase_task_templates / seed_phase_tasks are generic).
--
-- ------------------------------------------------------------
-- HOW TO SUPPLY THE TARGET ORG (resolved at runtime, never hardcoded)
--   Pass the organization's slug as a psql variable:
--
--     psql "$DATABASE_URL" \
--          -v org_slug='sarahdigs' \
--          -f supabase/migrations/031_website_build_workflow.sql
--
--   The migration looks up organizations.slug = :org_slug and
--   RAISES if the slug is missing or unknown — it will NEVER fall
--   back to the shared default. (Supabase CLI note: `supabase db
--   push` cannot pass -v; run this file directly with psql, or set
--   the slug via  SELECT set_config('app.target_org_slug','<slug>')
--   in the same session before \i-ing it.)
-- ============================================================

\set ON_ERROR_STOP on

-- Default the variable to empty if the operator forgot -v org_slug,
-- so we can raise a friendly error instead of a psql parse failure.
\if :{?org_slug}
\else
  \set org_slug ''
\endif

BEGIN;

-- Stash the slug in a session GUC so the DO block below can read it
-- without psql variable interpolation inside the dollar-quoted body.
SELECT set_config('app.target_org_slug', :'org_slug', false);

-- ------------------------------------------------------------
-- Section 0 — remediate any prior SINGLE-TENANT draft (migration
-- 030), if it was ever applied to this database.
--
-- 030 was superseded by this migration and removed from history.
-- On a database that NEVER ran 030 every check below is a no-op,
-- so a clean shared default is left BYTE-FOR-BYTE UNTOUCHED. On a
-- database where 030 HAD been applied, this reverses its three
-- single-tenant changes so the end state is identical either way:
--   1. an org-less phase_task_templates table (wrong shape),
--   2. its global "read all" RLS policy (cross-tenant leak),
--   3. the mutated shared system-default web_build template.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_restored INTEGER;
BEGIN
  -- (1)+(2) Old table / permissive policy from 030
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'phase_task_templates') THEN
    DROP POLICY IF EXISTS "phase_task_templates_read" ON public.phase_task_templates;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'phase_task_templates'
                     AND column_name = 'organization_id') THEN
      DROP TABLE public.phase_task_templates CASCADE;
      RAISE NOTICE '030 remediation: dropped single-tenant phase_task_templates (no organization_id).';
    END IF;
  END IF;

  -- (3) Restore the shared system-default web_build row to canonical
  -- 004 content, but ONLY if it carries 030's fingerprint. On a clean
  -- default (name = 'Web Build Default') this matches 0 rows and the
  -- row is never touched.
  UPDATE workflow_templates
     SET name = 'Web Build Default',
         stages = '[
           {"name": "Discovery",    "order": 0, "color": "#6B7280", "status": "not_started"},
           {"name": "Wireframe",    "order": 1, "color": "#3B82F6", "status": "not_started"},
           {"name": "Design",       "order": 2, "color": "#8B5CF6", "status": "not_started"},
           {"name": "Development",  "order": 3, "color": "#F59E0B", "status": "not_started"},
           {"name": "Testing",      "order": 4, "color": "#EF4444", "status": "not_started"},
           {"name": "Launch",       "order": 5, "color": "#10B981", "status": "not_started"}
         ]'::jsonb,
         transitions = '[
           {"from": "not_started",  "to": "in_progress", "requires_role": ["manager","admin"]},
           {"from": "in_progress",  "to": "completed",   "requires_role": ["manager","admin"]},
           {"from": "completed",    "to": "in_progress",  "requires_role": ["manager","admin"]}
         ]'::jsonb,
         updated_at = NOW()
   WHERE project_type = 'web_build'
     AND is_default = TRUE
     AND organization_id IS NULL
     AND name = 'sarahdigs Website Studio';   -- 030's fingerprint
  GET DIAGNOSTICS v_restored = ROW_COUNT;
  IF v_restored > 0 THEN
    RAISE NOTICE '030 remediation: restored shared system-default web_build template to canonical content.';
  END IF;
END $$;

-- ------------------------------------------------------------
-- A2 — checklist reference table, keyed by organization
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phase_task_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phase_name      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_gate         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_phase_task_templates_org
  ON phase_task_templates(organization_id);

-- ------------------------------------------------------------
-- A3 — tenant-aware seeding trigger
--   When a phase is created, seed its tasks ONLY from the owning
--   project's organization's checklist. A phase in org A can never
--   be seeded from org B's rows.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_phase_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id     UUID;
  v_created_by UUID;
BEGIN
  SELECT organization_id, created_by
    INTO v_org_id, v_created_by
  FROM projects
  WHERE id = NEW.project_id;

  -- Defensive: no creator → cannot satisfy tasks.created_by NOT NULL.
  IF v_created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO tasks (project_id, phase_id, title, description,
                     status, priority, sort_order, created_by)
  SELECT
    NEW.project_id,
    NEW.id,
    t.title,
    t.description,
    'todo',
    CASE WHEN t.is_gate THEN 1 ELSE 0 END,
    t.sort_order,
    v_created_by
  FROM phase_task_templates t
  WHERE t.phase_name      = NEW.name
    AND t.organization_id = v_org_id;   -- tenant boundary

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_phase_tasks ON phases;
CREATE TRIGGER trg_seed_phase_tasks
  AFTER INSERT ON phases
  FOR EACH ROW
  EXECUTE FUNCTION seed_phase_tasks();

-- ------------------------------------------------------------
-- A4 — org-scoped RLS (mirrors 002_rls_policies.sql pattern:
--      USING (organization_id = public.org_id()))
-- ------------------------------------------------------------
ALTER TABLE phase_task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phase_task_templates_org_read" ON phase_task_templates;
CREATE POLICY "phase_task_templates_org_read"
  ON phase_task_templates FOR SELECT
  TO authenticated
  USING (organization_id = public.org_id());

-- ------------------------------------------------------------
-- A1 + seed — org-specific data. Resolve the target org at
-- runtime; INSERT an org-owned template; seed the checklist.
-- Everything here is scoped to v_org_id — the shared default and
-- every other tenant are left completely untouched.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_org_slug TEXT := current_setting('app.target_org_slug', true);
  v_org_id   UUID;
BEGIN
  IF v_org_slug IS NULL OR v_org_slug = '' THEN
    RAISE EXCEPTION
      'Target org not supplied. Re-run with:  psql ... -v org_slug=''<your-org-slug>'' -f 031_website_build_workflow.sql';
  END IF;

  SELECT id INTO v_org_id FROM organizations WHERE slug = v_org_slug;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found with slug "%". Refusing to fall back to the system default.', v_org_slug;
  END IF;

  -- A1: org-owned web_build template (INSERT, never UPDATE the default).
  -- Idempotent + org-scoped: clear only THIS org's prior web_build default.
  DELETE FROM workflow_templates
   WHERE organization_id = v_org_id
     AND project_type = 'web_build'
     AND is_default = TRUE;

  INSERT INTO workflow_templates
    (organization_id, name, project_type, is_default, stages, transitions)
  VALUES (
    v_org_id,
    'Website Studio Workflow',        -- neutral product name; content below is the example org's methodology
    'web_build',
    TRUE,
    '[
      {"name": "Onboarding", "order": 0, "color": "#6B7280", "status": "not_started",
       "description": "Gate to Dig: questionnaire submitted + assets received + kickoff call held."},
      {"name": "Dig",        "order": 1, "color": "#8B5A2B", "status": "not_started",
       "description": "Research & strategy. Gate to Design: written approval of the Dig Brief (sitemap + content outline). Approved sitemap = frozen scope."},
      {"name": "Design",     "order": 2, "color": "#8B5CF6", "status": "not_started",
       "description": "Two revision rounds included. Gate to Build: written approval of all page designs. Later changes are change orders."},
      {"name": "Build",      "order": 3, "color": "#F59E0B", "status": "not_started",
       "description": "No design decisions in this phase. Gate to Launch: written launch approval + final invoice paid."},
      {"name": "Launch",     "order": 4, "color": "#10B981", "status": "not_started",
       "description": "Single scheduled day, Tue-Thu morning only. Never launch on a Friday."},
      {"name": "Optimize",   "order": 5, "color": "#06B6D4", "status": "not_started",
       "description": "30-day post-launch window: monitoring, handoff, testimonial ask, care plan offer."}
    ]'::jsonb,
    '[
      {"from": "not_started", "to": "in_progress", "requires_role": ["manager", "admin"]},
      {"from": "in_progress", "to": "completed",   "requires_role": ["manager", "admin"]},
      {"from": "completed",   "to": "in_progress", "requires_role": ["manager", "admin"]}
    ]'::jsonb
  );

  -- A2 seed: org-scoped idempotency — DELETE this org's rows only, never TRUNCATE.
  DELETE FROM phase_task_templates WHERE organization_id = v_org_id;

  INSERT INTO phase_task_templates
    (organization_id, phase_name, title, description, sort_order, is_gate)
  SELECT v_org_id, x.phase_name, x.title, x.description, x.sort_order, x.is_gate
  FROM (VALUES
    -- ONBOARDING ------------------------------------------------
    ('Onboarding','Send welcome email + process roadmap','Templated: process overview, communication rules (portal only), revision policy (2 rounds/phase), links to questionnaire + asset folder.',0,FALSE),
    ('Onboarding','Client: complete onboarding questionnaire','Brand, audience, competitors, goals, likes/dislikes, must-haves. Kickoff not scheduled until submitted.',1,FALSE),
    ('Onboarding','Client: upload brand assets','Logo files, brand guide, photos, existing copy.',2,FALSE),
    ('Onboarding','Collect access credentials','Domain registrar, hosting, Analytics/Search Console if they exist.',3,FALSE),
    ('Onboarding','Hold kickoff call (record in app)','Recording feeds the Dig Brief later.',4,FALSE),
    ('Onboarding','GATE — questionnaire + assets received, kickoff held','Client stall here auto-pauses the timeline.',5,TRUE),
    -- DIG -------------------------------------------------------
    ('Dig','Competitor scan (3-5)','Positioning, messaging, site structure.',0,FALSE),
    ('Dig','Search landscape review (Google + AI search)','Feeds the AEO/GEO promise.',1,FALSE),
    ('Dig','Define conversion goals','1 primary, 2-3 secondary.',2,FALSE),
    ('Dig','Draft the Dig Brief','From kickoff summary; positioning, audience, sitemap, page-by-page outline, keyword/topic targets.',3,FALSE),
    ('Dig','Present Dig Brief (call or Loom)',NULL,4,FALSE),
    ('Dig','GATE — written approval of Dig Brief in portal','Approved sitemap freezes scope; new pages are change orders.',5,TRUE),
    -- DESIGN ----------------------------------------------------
    ('Design','Moodboard / style direction','One page: type, color, imagery mood. Approve before layout.',0,FALSE),
    ('Design','Homepage design → present → approve','Homepage first and alone; it sets the language.',1,FALSE),
    ('Design','Design remaining pages (one batch)',NULL,2,FALSE),
    ('Design','Revision round 1','Portal annotations only, consolidated.',3,FALSE),
    ('Design','Revision round 2 (final included round)','Extra rounds billed hourly.',4,FALSE),
    ('Design','GATE — written approval of all page designs','Later changes are change orders.',5,TRUE),
    -- BUILD -----------------------------------------------------
    ('Build','Develop from approved designs','No design decisions here.',0,FALSE),
    ('Build','Load final content and imagery',NULL,1,FALSE),
    ('Build','SEO/AEO technical checklist','Metadata, schema, headings, alt text, speed, mobile, analytics + Search Console, AI-search-friendly structure.',2,FALSE),
    ('Build','Internal QA','Links, forms, 3 breakpoints, cross-browser.',3,FALSE),
    ('Build','Client staging review — round 1','Portal only.',4,FALSE),
    ('Build','Client staging review — round 2 (final included round)',NULL,5,FALSE),
    ('Build','GATE — written launch approval + final invoice paid','No launch before payment clears.',6,TRUE),
    -- LAUNCH ----------------------------------------------------
    ('Launch','Pre-launch checklist','DNS/domain, SSL, redirects, forms live, analytics verified, sitemap submitted.',0,FALSE),
    ('Launch','Go live (Tue-Thu morning only)','Never Friday.',1,FALSE),
    ('Launch','Send "we''re live" email','Same day, includes monitoring plan.',2,FALSE),
    -- OPTIMIZE --------------------------------------------------
    ('Optimize','30-day monitoring window','Indexing, search appearance, form submissions, bug fixes.',0,FALSE),
    ('Optimize','Handoff package','Loom walkthrough, credentials doc, included-vs-not.',1,FALSE),
    ('Optimize','Day-30 close-out email','Results snapshot + testimonial request + care-plan offer.',2,FALSE),
    ('Optimize','Retro: log actuals vs estimates','Improve the template each cycle.',3,FALSE),
    ('Optimize','GATE — archive project',NULL,4,TRUE)
  ) AS x(phase_name, title, description, sort_order, is_gate);

  RAISE NOTICE 'Website-build workflow seeded for org "%" (%): 1 template + % checklist rows.',
    v_org_slug, v_org_id,
    (SELECT count(*) FROM phase_task_templates WHERE organization_id = v_org_id);
END $$;

COMMIT;
