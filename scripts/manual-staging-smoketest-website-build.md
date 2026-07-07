# Manual staging smoke-test — website-build workflow (tRPC path)

**Why manual:** the automated regression test
(`scripts/test_website_build_workflow_isolation.sh`) proves the SQL layer —
including that the exact ordering `project.create` uses
(`ORDER BY organization_id DESC NULLS LAST`) resolves the right template.
What it can't cover cheaply is the **real `project.create` tRPC path** end to
end: that needs a running app + Supabase (PostgREST + auth + RLS) to build
`ctx.supabase` / `ctx.orgId`, and this repo has no test runner. Run the steps
below against **staging** before shipping 031.

## Preconditions
- 031 applied to staging for the target org:
  `psql "$STAGING_DB_URL" -v org_slug='<target-org-slug>' -f supabase/migrations/031_website_build_workflow.sql`
- Two orgs available: the **target org** (got 031) and any **other org** (did not).
- A manager/admin login in each org.

## Test 1 — target org resolves its OWN workflow (the mechanism the design depends on)
1. Sign in to the **target org**. Create a new **web_build** project.
2. ✅ Expect 6 phases: **Onboarding → Dig → Design → Build → Launch → Optimize**.
3. Open each phase. ✅ Expect the checklist auto-populated (33 tasks total),
   with the **GATE** task flagged (raised priority) in every phase except Launch.
4. Repeat with a **full_service** project. ✅ Expect the same 6 phases + checklist.

## Test 2 — other org is UNAFFECTED (uses the system default)
1. Sign in to the **other org**. Create a new **web_build** project.
2. ✅ Expect the generic default phases: **Discovery → Wireframe → Design →
   Development → Testing → Launch**.
3. ✅ Expect **no auto-seeded tasks** (phases are empty).

## Test 3 — no cross-tenant leak
1. As the other org's user, confirm you cannot see the target org's
   `phase_task_templates` rows anywhere in the UI/API.
2. ✅ Expect only your own org's data (RLS: `organization_id = public.org_id()`).

## Pass criteria
All three tests pass → the tRPC resolution + trigger + RLS behave in the live
app exactly as the SQL-level regression test asserts. If Test 1 shows the
generic default instead of the custom workflow, the org-preference ordering
regressed — stop and investigate before shipping.
