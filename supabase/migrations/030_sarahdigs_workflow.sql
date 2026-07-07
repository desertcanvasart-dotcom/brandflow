-- ============================================================
-- 030_sarahdigs_workflow.sql
-- Replaces the default web_build workflow with the sarahdigs
-- methodology (Onboarding → Dig → Design → Build → Launch →
-- Optimize) and auto-seeds each phase with its task checklist.
--
-- Works with the existing project.create logic: web_build and
-- full_service projects auto-create phases from stages[]; the
-- trigger below then fills each phase with its default tasks.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Update the system default web_build template
-- ------------------------------------------------------------
UPDATE workflow_templates
SET
  name = 'sarahdigs Website Studio',
  stages = '[
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
  transitions = '[
    {"from": "not_started", "to": "in_progress", "requires_role": ["manager", "admin"]},
    {"from": "in_progress", "to": "completed",   "requires_role": ["manager", "admin"]},
    {"from": "completed",   "to": "in_progress", "requires_role": ["manager", "admin"]}
  ]'::jsonb,
  updated_at = NOW()
WHERE project_type = 'web_build'
  AND is_default = TRUE
  AND organization_id IS NULL;

-- ------------------------------------------------------------
-- 2. Default task checklists per phase (editable reference table)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phase_task_templates (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_name  TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_gate     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Idempotent seed
TRUNCATE phase_task_templates;

INSERT INTO phase_task_templates (phase_name, title, description, sort_order, is_gate) VALUES
-- ONBOARDING ---------------------------------------------------
('Onboarding', 'Send welcome email + process roadmap',
 'Templated email: process overview, communication rules (portal only), revision policy (2 rounds/phase), links to questionnaire and asset folder.', 0, FALSE),
('Onboarding', 'Client: complete onboarding questionnaire',
 'Brand, audience, competitors, goals, likes/dislikes, must-have features. Kickoff call is not scheduled until this is submitted.', 1, FALSE),
('Onboarding', 'Client: upload brand assets',
 'Logo files, brand guide, photos, existing copy — into the pre-made client folder.', 2, FALSE),
('Onboarding', 'Collect access credentials',
 'Domain registrar, current hosting, Google Analytics / Search Console if they exist.', 3, FALSE),
('Onboarding', 'Hold kickoff call (record in BrandFlow)',
 'Record via Meetings so the transcript + AI summary can seed the Dig Brief.', 4, FALSE),
('Onboarding', 'GATE — Questionnaire + assets received, kickoff held',
 'If the client stalls here, the project timeline pauses automatically (stated in the welcome email).', 5, TRUE),

-- DIG ----------------------------------------------------------
('Dig', 'Competitor scan (3-5 competitors)',
 'Positioning, messaging, and site structure notes.', 0, FALSE),
('Dig', 'Search landscape review (Google + AI search)',
 'What the audience searches for; how the business currently appears in Google and AI answers. Feeds the AEO/GEO promise.', 1, FALSE),
('Dig', 'Define conversion goals',
 'One primary conversion goal, 2-3 secondary goals.', 2, FALSE),
('Dig', 'Draft the Dig Brief',
 'Use AI brief generator from the kickoff meeting summary, then edit. Contents: positioning, audience, sitemap, page-by-page content outline, keyword/topic targets.', 3, FALSE),
('Dig', 'Present Dig Brief (call or Loom)', NULL, 4, FALSE),
('Dig', 'GATE — Written approval of Dig Brief in portal',
 'Approved sitemap = frozen scope. Any page added later is a change order.', 5, TRUE),

-- DESIGN -------------------------------------------------------
('Design', 'Moodboard / style direction',
 'One page: typography, color, imagery mood. Client approves before any layout work.', 0, FALSE),
('Design', 'Homepage design → present → approve',
 'Homepage first and alone; it sets the design language for everything else.', 1, FALSE),
('Design', 'Design remaining pages (one batch)', NULL, 2, FALSE),
('Design', 'Revision round 1',
 'Feedback via portal annotations only, consolidated into one round.', 3, FALSE),
('Design', 'Revision round 2 (final included round)',
 'Additional rounds are billed at the contract hourly rate.', 4, FALSE),
('Design', 'GATE — Written approval of all page designs in portal',
 'After this, design changes are change orders.', 5, TRUE),

-- BUILD --------------------------------------------------------
('Build', 'Develop from approved designs',
 'No design decisions happen in this phase.', 0, FALSE),
('Build', 'Load final content and imagery', NULL, 1, FALSE),
('Build', 'SEO/AEO technical checklist',
 'Metadata, schema/structured data, heading structure, alt text, page speed pass, mobile pass, analytics + Search Console connected, AI-search-friendly content structure.', 2, FALSE),
('Build', 'Internal QA checklist',
 'Links, forms, responsiveness on 3 breakpoints, cross-browser.', 3, FALSE),
('Build', 'Client staging review — round 1', 'Comments in the portal only.', 4, FALSE),
('Build', 'Client staging review — round 2 (final included round)', NULL, 5, FALSE),
('Build', 'GATE — Written launch approval + final invoice paid',
 'The site does not go live before the final payment clears (stated in the contract).', 6, TRUE),

-- LAUNCH -------------------------------------------------------
('Launch', 'Pre-launch checklist',
 'DNS/domain, SSL, redirects from old URLs, forms tested live, analytics verified, sitemap submitted.', 0, FALSE),
('Launch', 'Go live (Tue-Thu morning only)',
 'Never launch on a Friday — leave calm time to monitor.', 1, FALSE),
('Launch', 'Send "we''re live" email',
 'Templated, same day, includes the post-launch monitoring plan.', 2, FALSE),

-- OPTIMIZE -----------------------------------------------------
('Optimize', '30-day monitoring window',
 'Indexing, search appearance, form submissions, post-launch bug fixes.', 0, FALSE),
('Optimize', 'Handoff package',
 'Loom walkthrough of how to edit the site, credentials document, included-vs-not going forward.', 1, FALSE),
('Optimize', 'Day-30 close-out email',
 'Results snapshot + testimonial/review request + care plan offer (monthly retainer: updates, optimization, AEO monitoring).', 2, FALSE),
('Optimize', 'Retro: log actuals vs estimates',
 'Note what took longer than planned so the template improves each cycle.', 3, FALSE),
('Optimize', 'Archive project', NULL, 4, TRUE);

-- ------------------------------------------------------------
-- 3. Trigger: when a phase is created, seed its default tasks
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION seed_phase_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by UUID;
BEGIN
  SELECT created_by INTO v_created_by
  FROM projects
  WHERE id = NEW.project_id;

  IF v_created_by IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO tasks (project_id, phase_id, title, description, status, priority, sort_order, created_by)
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
  WHERE t.phase_name = NEW.name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_phase_tasks ON phases;
CREATE TRIGGER trg_seed_phase_tasks
  AFTER INSERT ON phases
  FOR EACH ROW
  EXECUTE FUNCTION seed_phase_tasks();

-- ------------------------------------------------------------
-- 4. Lock down the reference table (read-only RLS)
-- ------------------------------------------------------------
ALTER TABLE phase_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phase_task_templates_read"
  ON phase_task_templates FOR SELECT
  TO authenticated
  USING (TRUE);
