#!/usr/bin/env bash
# ============================================================
# Regression test — 031_website_build_workflow.sql
#
# WHY THIS EXISTS: migration 031 is multi-tenant-critical. Its
# Section-0 self-healing logic only fires against a corrupted
# state that is hard to reproduce by hand, and its whole value is
# that ONE org gets a custom workflow while every OTHER org keeps
# the shared system default. This test locks that behavior down so
# a future migration can't silently break tenant isolation.
#
# WHAT IT DOES: boots a throwaway PostgreSQL 17 cluster, applies
# the real 001 + 004 + 031 migrations, and asserts every category:
#   A. Section-0 no-op proof on a clean DB (shared default untouched)
#   B. org-scoping of template + checklist
#   C. template resolution mirrors project.create's ordering
#   D. trigger seeding (web_build + full_service; other org = default, 0 tasks)
#   E. RLS: members read only their own org's checklist rows
#   F. heal path: a DB corrupted like the old single-tenant draft is repaired
# Any failed assertion aborts non-zero (ON_ERROR_STOP / RAISE EXCEPTION).
#
# REQUIREMENTS: a local PostgreSQL 17 server (initdb/postgres/pg_ctl).
#   macOS:  brew install postgresql@17
# RUN:  bash scripts/test_website_build_workflow_isolation.sh
# ============================================================
set -euo pipefail
export LC_ALL=C LANG=C TZ=UTC

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIG="$REPO_ROOT/supabase/migrations"

# ---- locate a PostgreSQL 17 SERVER (not just the libpq client) ----
if ! command -v postgres >/dev/null 2>&1; then
  for c in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin \
           /usr/lib/postgresql/17/bin /opt/homebrew/opt/postgresql/bin; do
    [ -x "$c/postgres" ] && export PATH="$c:$PATH" && break
  done
fi
command -v postgres >/dev/null 2>&1 || { echo "SKIP: PostgreSQL 17 server binary not found (brew install postgresql@17)"; exit 2; }

WORK="$(mktemp -d)"; PGDATA="$WORK/pgdata"; PORT="${PGPORT_TEST:-5459}"
cleanup() { pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$PGDATA" -U postgres --auth=trust --locale=C >/dev/null 2>&1
pg_ctl -D "$PGDATA" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=$WORK" -l "$WORK/pg.log" -w start >/dev/null
export PGHOST="$WORK" PGPORT="$PORT" PGUSER=postgres
pg() { psql -v ON_ERROR_STOP=1 -X -q "$@"; }

# minimal Supabase-compatible base shared by both DBs
base() {
  local db="$1"; createdb "$db"
  pg -d "$db" <<'SQL'
DO $$ BEGIN CREATE ROLE anon;          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid primary key, email text);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $f$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $f$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb,'{}'::jsonb) $f$;
SQL
  pg -d "$db" -f "$MIG/001_initial_schema.sql" >/dev/null
  pg -d "$db" -f "$MIG/004_seed_workflow_templates.sql" >/dev/null
  # org_id() mirrored from 002_rls_policies.sql
  pg -d "$db" <<'SQL'
CREATE OR REPLACE FUNCTION public.org_id() RETURNS uuid AS $f$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'organization_id')::uuid,
    (SELECT organization_id FROM public.organization_members WHERE user_id=auth.uid() AND is_active=TRUE LIMIT 1));
$f$ LANGUAGE sql STABLE SECURITY DEFINER;
SQL
}

OA='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'   # target org (gets custom workflow)
OB='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'   # other org  (keeps system default)
UA='a1111111-1111-1111-1111-111111111111'
UB='b1111111-1111-1111-1111-111111111111'

# =====================================================================
# DB 1 (iso): clean apply -> no-op proof + isolation + resolution + RLS
# =====================================================================
base iso
pg -d iso <<SQL
INSERT INTO auth.users(id,email) VALUES ('$UA','a@x.com'),('$UB','b@x.com');
INSERT INTO organizations(id,name,slug) VALUES ('$OA','Target Org','sarahdigs'),('$OB','Other Org','acme');
INSERT INTO organization_members(organization_id,user_id,role,is_active) VALUES ('$OA','$UA','admin',TRUE),('$OB','$UB','admin',TRUE);
INSERT INTO brands(id,organization_id,name,slug) VALUES ('a2222222-2222-2222-2222-222222222222','$OA','A','a'),('b2222222-2222-2222-2222-222222222222','$OB','B','b');
SQL

SNAP_BEFORE=$(pg -d iso -tAc "SELECT md5(name||stages::text||transitions::text||coalesce(updated_at::text,'')) FROM workflow_templates WHERE project_type='web_build' AND is_default AND organization_id IS NULL")
TBL_BEFORE=$(pg -d iso -tAc "SELECT to_regclass('public.phase_task_templates') IS NOT NULL")

psql -v ON_ERROR_STOP=1 -X -v org_slug='sarahdigs' -d iso -f "$MIG/031_website_build_workflow.sql" > "$WORK/iso_out.txt" 2>&1
SNAP_AFTER=$(pg -d iso -tAc "SELECT md5(name||stages::text||transitions::text||coalesce(updated_at::text,'')) FROM workflow_templates WHERE project_type='web_build' AND is_default AND organization_id IS NULL")

echo "== A. Section-0 no-op proof (clean DB) =="
[ "$SNAP_BEFORE" = "$SNAP_AFTER" ] && echo "PASS: shared default byte-identical (restore matched 0 rows)" || { echo "FAIL: default changed"; exit 1; }
[ "$TBL_BEFORE" = "f" ] && echo "PASS: no pre-existing phase_task_templates (drop-branch precondition absent)" || { echo "FAIL"; exit 1; }
grep -q "dropped single-tenant" "$WORK/iso_out.txt" && { echo "FAIL: drop branch fired"; exit 1; } || echo "PASS: drop branch never fired"
grep -q "restored shared system-default" "$WORK/iso_out.txt" && { echo "FAIL: restore fired"; exit 1; } || echo "PASS: restore branch never fired"

echo "== B/C/D. scoping, resolution, seeding =="
pg -d iso <<SQL
DO \$\$
DECLARE n int; a_name text; b_name text; p int; t int; g int; names text;
BEGIN
  -- B. org-scoping
  IF (SELECT count(*) FROM phase_task_templates WHERE organization_id='$OA')<>33 THEN RAISE EXCEPTION 'A checklist<>33'; END IF;
  IF (SELECT count(*) FROM phase_task_templates WHERE organization_id='$OB')<>0  THEN RAISE EXCEPTION 'B checklist<>0';  END IF;
  IF (SELECT count(*) FROM workflow_templates WHERE organization_id='$OA' AND project_type='web_build' AND is_default)<>1 THEN RAISE EXCEPTION 'A template<>1'; END IF;
  IF (SELECT count(*) FROM workflow_templates WHERE organization_id='$OB')<>0 THEN RAISE EXCEPTION 'B has org template'; END IF;

  -- C. template resolution — mirrors project.create:
  --    .eq('project_type','web_build').eq('is_default',true)
  --    .or('organization_id.eq.<org>,organization_id.is.null')
  --    .order('organization_id',{ascending:false,nullsFirst:false}).limit(1)
  SELECT name INTO a_name FROM workflow_templates
    WHERE project_type='web_build' AND is_default AND (organization_id='$OA' OR organization_id IS NULL)
    ORDER BY organization_id DESC NULLS LAST LIMIT 1;
  SELECT name INTO b_name FROM workflow_templates
    WHERE project_type='web_build' AND is_default AND (organization_id='$OB' OR organization_id IS NULL)
    ORDER BY organization_id DESC NULLS LAST LIMIT 1;
  IF a_name<>'Website Studio Workflow' THEN RAISE EXCEPTION 'A resolved wrong template: %', a_name; END IF;
  IF b_name<>'Web Build Default'       THEN RAISE EXCEPTION 'B resolved wrong template: %', b_name; END IF;

  -- D. seed via trigger through the resolved template, for 3 projects
  INSERT INTO projects(id,organization_id,brand_id,type,name,slug,status,created_by) VALUES
   ('a3333333-3333-3333-3333-333333333333','$OA','a2222222-2222-2222-2222-222222222222','web_build','AWB','awb','active','$UA'),
   ('a4444444-4444-4444-4444-444444444444','$OA','a2222222-2222-2222-2222-222222222222','full_service','AFS','afs','active','$UA'),
   ('b3333333-3333-3333-3333-333333333333','$OB','b2222222-2222-2222-2222-222222222222','web_build','BWB','bwb','active','$UB');
  DECLARE r record; s jsonb; v_stages jsonb;
  BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('a3333333-3333-3333-3333-333333333333'::uuid,'$OA'::uuid),
        ('a4444444-4444-4444-4444-444444444444'::uuid,'$OA'::uuid),
        ('b3333333-3333-3333-3333-333333333333'::uuid,'$OB'::uuid)) AS x(proj,org)
    LOOP
      SELECT stages INTO v_stages FROM workflow_templates
        WHERE project_type='web_build' AND is_default AND (organization_id=r.org OR organization_id IS NULL)
        ORDER BY organization_id DESC NULLS LAST LIMIT 1;
      FOR s IN SELECT * FROM jsonb_array_elements(v_stages) LOOP
        INSERT INTO phases(project_id,name,description,sort_order) VALUES (r.proj,s->>'name',s->>'description',(s->>'order')::int);
      END LOOP;
    END LOOP;
  END;

  SELECT count(*),count(*) FILTER (WHERE priority=1) INTO t,g FROM tasks WHERE project_id='a3333333-3333-3333-3333-333333333333';
  SELECT count(*) INTO p FROM phases WHERE project_id='a3333333-3333-3333-3333-333333333333';
  SELECT string_agg(name,',' ORDER BY sort_order) INTO names FROM phases WHERE project_id='a3333333-3333-3333-3333-333333333333';
  IF p<>6 OR t<>33 OR g<>5 THEN RAISE EXCEPTION 'A web_build %/%/% (want 6/33/5)',p,t,g; END IF;
  IF names<>'Onboarding,Dig,Design,Build,Launch,Optimize' THEN RAISE EXCEPTION 'A phases: %',names; END IF;

  IF (SELECT count(*) FROM tasks WHERE project_id='a4444444-4444-4444-4444-444444444444')<>33 THEN RAISE EXCEPTION 'A full_service<>33'; END IF;

  SELECT count(*) INTO t FROM tasks WHERE project_id='b3333333-3333-3333-3333-333333333333';
  SELECT string_agg(name,',' ORDER BY sort_order) INTO names FROM phases WHERE project_id='b3333333-3333-3333-3333-333333333333';
  IF t<>0 THEN RAISE EXCEPTION 'B seeded % tasks (want 0)',t; END IF;
  IF names<>'Discovery,Wireframe,Design,Development,Testing,Launch' THEN RAISE EXCEPTION 'B not system default: %',names; END IF;
  RAISE NOTICE 'PASS: scoping + resolution(A=own,B=default) + seeding(A wb 6/33/5, A fs 33, B 0/default)';
END \$\$;
SQL

echo "== E. RLS isolation =="
pg -d iso <<SQL
INSERT INTO phase_task_templates(organization_id,phase_name,title,sort_order,is_gate) VALUES ('$OB','Dig','B-only',0,FALSE),('$OB','Dig','B-only2',1,FALSE);
GRANT SELECT ON public.phase_task_templates TO authenticated;
SQL
RA=$(psql -X -tAc "SELECT set_config('request.jwt.claim.sub','$UA',false); SET ROLE authenticated; SELECT count(*) FROM phase_task_templates;" iso | tail -1)
RAB=$(psql -X -tAc "SELECT set_config('request.jwt.claim.sub','$UA',false); SET ROLE authenticated; SELECT count(*) FROM phase_task_templates WHERE organization_id='$OB';" iso | tail -1)
RB=$(psql -X -tAc "SELECT set_config('request.jwt.claim.sub','$UB',false); SET ROLE authenticated; SELECT count(*) FROM phase_task_templates;" iso | tail -1)
[ "$RA" = "33" ] && echo "PASS: org A reads its own 33" || { echo "FAIL: A=$RA"; exit 1; }
[ "$RAB" = "0" ] && echo "PASS: org A reads 0 of org B (no cross-tenant read)" || { echo "FAIL: A saw $RAB of B"; exit 1; }
[ "$RB" = "2" ] && echo "PASS: org B reads its own 2" || { echo "FAIL: B=$RB"; exit 1; }

# =====================================================================
# DB 2 (heal): corrupt exactly like the old single-tenant draft, then
# prove 031's Section 0 repairs it.
# =====================================================================
base heal
pg -d heal <<SQL
-- reproduce the 3 single-tenant-draft corruptions (no dependency on the removed 030 file):
UPDATE workflow_templates SET name='sarahdigs Website Studio',
  stages='[{"name":"Onboarding","order":0}]'::jsonb
  WHERE project_type='web_build' AND is_default AND organization_id IS NULL;             -- (3) mutated default
CREATE TABLE phase_task_templates (id uuid primary key default uuid_generate_v4(),
  phase_name text, title text, description text, sort_order int, is_gate boolean);       -- (1) org-less table
ALTER TABLE phase_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase_task_templates_read" ON phase_task_templates FOR SELECT USING (TRUE); -- (2) permissive policy
INSERT INTO organizations(id,name,slug) VALUES ('$OA','Target Org','sarahdigs');
SQL
psql -v ON_ERROR_STOP=1 -X -v org_slug='sarahdigs' -d heal -f "$MIG/031_website_build_workflow.sql" > "$WORK/heal_out.txt" 2>&1

echo "== F. heal path (030-applied DB) =="
grep -q "dropped single-tenant" "$WORK/heal_out.txt" && echo "PASS: drop branch fired" || { echo "FAIL: drop branch silent"; exit 1; }
grep -q "restored shared system-default" "$WORK/heal_out.txt" && echo "PASS: restore branch fired" || { echo "FAIL: restore silent"; exit 1; }
pg -d heal <<SQL
DO \$\$
BEGIN
  IF (SELECT name FROM workflow_templates WHERE project_type='web_build' AND is_default AND organization_id IS NULL)<>'Web Build Default' THEN RAISE EXCEPTION 'default not restored'; END IF;
  IF (SELECT stages::text FROM workflow_templates WHERE project_type='web_build' AND is_default AND organization_id IS NULL) NOT LIKE '%Discovery%' THEN RAISE EXCEPTION 'stages not restored'; END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_name='phase_task_templates' AND column_name='organization_id')<>1 THEN RAISE EXCEPTION 'no organization_id col'; END IF;
  IF (SELECT count(*) FROM pg_policies WHERE tablename='phase_task_templates' AND policyname='phase_task_templates_read')<>0 THEN RAISE EXCEPTION 'permissive policy remains'; END IF;
  IF (SELECT count(*) FROM pg_policies WHERE tablename='phase_task_templates' AND policyname='phase_task_templates_org_read')<>1 THEN RAISE EXCEPTION 'org policy missing'; END IF;
  IF (SELECT count(*) FROM phase_task_templates WHERE organization_id='$OA')<>33 THEN RAISE EXCEPTION 'target not reseeded 33'; END IF;
  RAISE NOTICE 'PASS: default restored, table has organization_id, permissive policy gone, org policy present, org reseeded 33';
END \$\$;
SQL

echo ""; echo "ALL ASSERTIONS PASSED (A no-op, B scoping, C resolution, D seeding, E RLS, F heal)"
