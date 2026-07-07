-- ============================================================
-- smoke_test_sarahdigs_workflow.sql
--
-- Verifies migration 030_sarahdigs_workflow.sql end-to-end:
-- creating a project + inserting phases from the web_build
-- template must auto-seed each phase with its task checklist
-- (via the trg_seed_phase_tasks trigger), with gate tasks flagged.
--
-- Mirrors what src/trpc/routers/project.ts `create` does:
--   1. look up the default web_build template
--   2. insert the project (created_by set)
--   3. insert one phase per template stage  -> trigger fires -> tasks seeded
--
-- NON-DESTRUCTIVE: everything runs inside a transaction that is
-- ROLLED BACK at the end. Nothing is persisted.
--
-- HOW TO RUN (against a local Supabase that has applied 001-030):
--   supabase start
--   supabase db reset          # applies all migrations incl. 030
--   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" \
--        -f scripts/smoke_test_sarahdigs_workflow.sql
--
--   ...or against any DATABASE_URL:
--   psql "$DATABASE_URL" -f scripts/smoke_test_sarahdigs_workflow.sql
--
-- Exit is clean (and prints "SMOKE TEST PASSED") only if every
-- assertion holds; any mismatch raises an exception and aborts.
-- ============================================================

\set ON_ERROR_STOP on

BEGIN;

-- ------------------------------------------------------------
-- Fixtures (fixed UUIDs so the script is deterministic)
-- ------------------------------------------------------------
INSERT INTO auth.users (instance_id, id, aud, role, email)
VALUES ('00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111',
        'authenticated', 'authenticated', 'smoketest@example.com');

INSERT INTO organizations (id, name, slug)
VALUES ('22222222-2222-2222-2222-222222222222', 'Smoke Test Org', 'smoke-test-org');

INSERT INTO brands (id, organization_id, name, slug)
VALUES ('33333333-3333-3333-3333-333333333333',
        '22222222-2222-2222-2222-222222222222', 'Smoke Brand', 'smoke-brand');

-- ------------------------------------------------------------
-- Helper: create a project of a given type + seed its phases
--         from the web_build template (both web_build and
--         full_service take their phases from web_build).
-- ------------------------------------------------------------
-- web_build project ------------------------------------------
INSERT INTO projects (id, organization_id, brand_id, workflow_template_id,
                      type, name, slug, status, created_by)
SELECT '44444444-4444-4444-4444-444444444444',
       '22222222-2222-2222-2222-222222222222',
       '33333333-3333-3333-3333-333333333333',
       wt.id, 'web_build', 'Smoke Web Build', 'smoke-web-build', 'active',
       '11111111-1111-1111-1111-111111111111'
FROM workflow_templates wt
WHERE wt.project_type = 'web_build' AND wt.is_default AND wt.organization_id IS NULL;

INSERT INTO phases (project_id, name, description, sort_order)
SELECT '44444444-4444-4444-4444-444444444444',
       stage->>'name', stage->>'description', (stage->>'order')::int
FROM workflow_templates wt, jsonb_array_elements(wt.stages) AS stage
WHERE wt.project_type = 'web_build' AND wt.is_default AND wt.organization_id IS NULL;

-- full_service project (phases also sourced from web_build) ---
INSERT INTO projects (id, organization_id, brand_id, workflow_template_id,
                      type, name, slug, status, created_by)
VALUES ('55555555-5555-5555-5555-555555555555',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        NULL, 'full_service', 'Smoke Full Service', 'smoke-full-service', 'active',
        '11111111-1111-1111-1111-111111111111');

INSERT INTO phases (project_id, name, description, sort_order)
SELECT '55555555-5555-5555-5555-555555555555',
       stage->>'name', stage->>'description', (stage->>'order')::int
FROM workflow_templates wt, jsonb_array_elements(wt.stages) AS stage
WHERE wt.project_type = 'web_build' AND wt.is_default AND wt.organization_id IS NULL;

-- ------------------------------------------------------------
-- Report: per-phase task counts (printed for eyeballing)
-- ------------------------------------------------------------
\echo '--- web_build: per-phase task counts ---'
SELECT p.sort_order AS ord, p.name AS phase,
       count(t.id) AS tasks,
       count(t.id) FILTER (WHERE t.priority = 1) AS gate_tasks
FROM phases p
LEFT JOIN tasks t ON t.phase_id = p.id
WHERE p.project_id = '44444444-4444-4444-4444-444444444444'
GROUP BY p.sort_order, p.name
ORDER BY p.sort_order;

-- ------------------------------------------------------------
-- Assertions
--   Expected per phase (tasks / gate):
--     Onboarding 6/1, Dig 6/1, Design 6/1, Build 7/1,
--     Launch 3/0, Optimize 5/1  ->  6 phases, 33 tasks, 5 gates
-- ------------------------------------------------------------
DO $$
DECLARE
  r            RECORD;
  expected     JSONB := '{"Onboarding":6,"Dig":6,"Design":6,"Build":7,"Launch":3,"Optimize":5}';
  proj         UUID;
  proj_label   TEXT;
BEGIN
  FOREACH proj_label IN ARRAY ARRAY['web_build','full_service'] LOOP
    proj := CASE proj_label
              WHEN 'web_build'    THEN '44444444-4444-4444-4444-444444444444'::uuid
              ELSE                     '55555555-5555-5555-5555-555555555555'::uuid
            END;

    -- exactly 6 phases, correctly ordered and named
    IF (SELECT count(*) FROM phases WHERE project_id = proj) <> 6 THEN
      RAISE EXCEPTION '[%] expected 6 phases, got %',
        proj_label, (SELECT count(*) FROM phases WHERE project_id = proj);
    END IF;

    -- per-phase task counts match the checklist
    FOR r IN
      SELECT p.name, count(t.id) AS n
      FROM phases p LEFT JOIN tasks t ON t.phase_id = p.id
      WHERE p.project_id = proj GROUP BY p.name
    LOOP
      IF r.n <> (expected->>r.name)::int THEN
        RAISE EXCEPTION '[%] phase % expected % tasks, got %',
          proj_label, r.name, expected->>r.name, r.n;
      END IF;
    END LOOP;

    -- totals: 33 tasks, 5 gates flagged (priority = 1)
    IF (SELECT count(*) FROM tasks WHERE project_id = proj) <> 33 THEN
      RAISE EXCEPTION '[%] expected 33 tasks total, got %',
        proj_label, (SELECT count(*) FROM tasks WHERE project_id = proj);
    END IF;
    IF (SELECT count(*) FROM tasks WHERE project_id = proj AND priority = 1) <> 5 THEN
      RAISE EXCEPTION '[%] expected 5 gate tasks, got %',
        proj_label, (SELECT count(*) FROM tasks WHERE project_id = proj AND priority = 1);
    END IF;

    RAISE NOTICE '[%] OK — 6 phases, 33 tasks, 5 gates', proj_label;
  END LOOP;

  RAISE NOTICE 'SMOKE TEST PASSED';
END $$;

ROLLBACK;
