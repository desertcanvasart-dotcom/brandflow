# Architecture Decisions — Website Build Workflow & Creation Pipeline

This document records the *why* behind the website-build workflow and the creation pipeline added in PRs #4 and #5. PR comments capture the *what*; this captures the reasoning, so whoever onboards the next tenant or enables automated sync has the context and doesn't reintroduce the risks these decisions were made to avoid.

---

## Context

BrandFlow is a **multi-tenant** platform: one deployment, many organizations (tenants). A customer — a website studio, referred to in seed data by the org slug `sarahdigs` — needed two things:

1. Her project methodology (a six-phase workflow with per-phase task checklists) encoded so a new project arrives ready to run instead of being reassembled by hand each time.
2. An **assisted creation pipeline** that does the first-draft creative work (research → sitemap → content → design → build spec → QA) when she starts a project, with a human approval gate after every step.

The overarching constraint on everything below: **nothing may cause one tenant's configuration to leak into another's.**

---

## Decision 1 — Two layers, loosely coupled

The work splits into a **management layer** (inside the app) and an **execution layer** (skills run via Claude Code), joined by one thin sync.

- **Management layer** = the app itself: projects, phases, gates, task checklists, client portal. Lives in `src/` + `supabase/`, deploys to Vercel/Supabase. This is the *record* of work.
- **Execution layer** = the creation pipeline: Markdown skill folders under `/pipeline/` that Claude Code reads and follows. This is the *doing* of work. It is **not** application source and is excluded from the Vercel build (`.vercelignore`).

**Why separate:** skills are the natural unit Claude Code understands; they're trivial to edit without redeploying the app; and a bad edit to a skill can never take the app down. The tradeoff is that the pipeline is triggered by a command in the project folder, not a button in the app (see Decision 6).

---

## Decision 2 — The workflow is a *product*; the customer is *data*

All reusable machinery is named neutrally as product features:
- Table: `phase_task_templates` (not customer-named)
- Function/trigger: `seed_phase_tasks` / `trg_seed_phase_tasks`
- Template row name: `'Website Studio Workflow'`
- Skills: `website-dig-research`, `website-strategy-sitemap`, `website-content`, `website-design-direction`, `website-build-spec`, `website-seo-aeo-qa`

The customer appears **only as org-scoped seed data** — her specific six phases and checklist content, owned by her `organization_id`. "sarahdigs" survives in the codebase only as (a) the example org **slug** passed at runtime and (b) the methodology content of her seed rows.

**Why:** if a second tenant could use it, it gets a neutral name. Onboarding the next tenant is then a copy of the seed pattern with a different org id and their own stages/checklists — not a rename job. **Do not** blind-find-and-replace the customer name; that would rename the seed content too and you'd lose which template belongs to whom.

---

## Decision 3 — Tenant scoping via org-owned templates (never touch the shared default)

The app's `project.create` mutation already resolves templates with
`.or('organization_id.eq.<orgId>,organization_id.is.null').order('organization_id', desc, nullsFirst:false).limit(1)`
— i.e. it **prefers an org-owned template over the system default.** The migration leans on this existing mechanism:

- The workflow is added as an **org-owned `workflow_templates` row** (`organization_id = <target org>`, `is_default = TRUE`) via **INSERT**.
- The shared system-default row (`organization_id IS NULL`) is **never modified**.

Result: the target org resolves its own template; every other tenant keeps the untouched generic default. There is no unique constraint on `(project_type, is_default)`, so the org row and the default coexist cleanly — this was verified, not assumed.

**Rejected alternative:** an earlier draft (`030`) UPDATE-d the shared default and used a global (org-less) checklist table. That would have silently pushed one customer's methodology onto every tenant. It was the mistake this work exists to correct.

---

## Decision 4 — The seed trigger filters on org AND phase name

`trg_seed_phase_tasks` (AFTER INSERT on `phases`, SECURITY DEFINER) seeds a new phase's tasks from `phase_task_templates` filtered by **both** `phase_name = NEW.name` **AND** `organization_id = <the project's org>`.

**Why both:** phase-name alone would let one tenant's phases draw from another tenant's checklist. The org filter is the critical isolation guard. A project in an org with no checklist rows simply gets empty phases — correct and safe. Null `created_by` → return without inserting (defensive; `tasks.created_by` is NOT NULL).

RLS on `phase_task_templates` follows the platform pattern `USING (organization_id = public.org_id())` — members read only their own org's rows. No global-read policy.

---

## Decision 5 — `031` self-heals a possibly-applied `030`

The single-tenant `030` had been merged to `main` before this correction. Investigation showed it was **never applied to any deployed DB** (no CI/CD, no linked Supabase project, hosted DB was down during its only local run, which was `BEGIN…ROLLBACK` on a scratch cluster). The one thing unverifiable from the repo was a human manually running `db push` against staging/prod.

Rather than depend on that residual uncertainty, `031` includes a guarded **Section 0 remediation** that:
- On a **clean DB** (030 never applied): every check is a strict **no-op** — proven, not narrated. The shared default row is byte-identical before/after (md5 including `updated_at`); neither remediation branch fires.
- On a **030-applied DB**: drops the org-less table and 030's permissive `USING(true)` policy, and restores the default row to the canonical `004` content.

**On "don't modify the shared default":** the restore *can* write that row, but only when 030 already corrupted it, and only back to spec. On a valid default it never fires. This honors the brief's intent (protect the shared default) rather than violating it. The restore target is `004`'s content, verified correct because **`004` is the only legitimate writer of that row** — migrations 005–029 contain zero writes to `workflow_templates` (002 only defines RLS policies, not row writes).

---

## Decision 6 — Trigger is a CLI command for v1

"Let us deliver and create" is, for v1, `node orchestrator.mjs start …` run in the project folder — not an in-app button.

**Why:** it's the simplest reliable version and keeps the two layers decoupled. **Known tradeoff:** it doesn't feel like a native app action to the operator. A true in-app button is a real, separate piece of work — porting the orchestration logic to server-side API calls (the AI-in-artifacts pattern the app already uses) — not a quick wire-up. At that point the *logic* moves into the app and these skill files become the reference spec it was built from.

---

## Decision 7 — Pipeline↔app sync is org-scoped by construction

The sync is the only place the pipeline reaches toward the database, so it gets the same tenant-isolation discipline as the migration:

- **v1 default (`PIPELINE_BRANDFLOW_SYNC=manual`)**: **zero DB access.** It logs the intended phase/gate/task change for the operator to action inside the app, where they're already authenticated and org-scoped. No DB access ⇒ cross-tenant leakage is structurally impossible. Every call is try/caught so a sync failure never blocks creative work.
- **`api` mode**: specified but **guarded to throw** — not built in v1.

### ⚠️ Requirement for whoever enables `api` mode later
This is the exact place a future shortcut would reintroduce cross-tenant risk. When built, `api` sync MUST:
- Go through the operator's **authenticated session**, inheriting `ctx.orgId` + RLS on every call (use the existing `task.update` / `phase.update` tRPC mutations).
- **Never** use a raw or service-role client.
- **Never** take an org id as an argument (it comes from the session context, not the caller).

---

## Open items / pre-launch checklist

- [ ] **Run the manual staging smoke-test before any real tenant uses this.** The committed regression test proves the resolution *mechanism* at the SQL layer (mirroring the mutation's query clause-by-clause), but the true `project.create` tRPC path is only covered by a manual staging test because there's no test runner in-repo. That manual run is the one assertion that the path the operator actually touches resolves the right template. Don't let it stay theoretical.
- [ ] **Merge order:** merge Part A (#4) first, run the staging smoke-test against it, then merge Part B (#5) on top of a verified migration. Both PRs are independent and either order is *safe* (Part B does no DB access in manual mode), but this order verifies the higher-stakes layer end-to-end first.
- [ ] Supplying the target org id at runtime (never hardcoded):
  `psql "$DATABASE_URL" -v org_slug='sarahdigs' -f supabase/migrations/031_website_build_workflow.sql`
  Unknown/missing slug **raises and aborts** — never falls back to the default.

---

## Divergences from the original brief (for the record)

1. **Migration number** is `031`, not `011` — `main` already had `001–030` and `011_departments.sql` exists.
2. **The "earlier draft with the mistakes" was real and merged** as `030`. Never applied to a deployed DB; replaced by `031`, with self-healing added to cover the residual manual-push case.
3. Otherwise the brief's assumptions held: the org-preference ordering in `create`, the DDL, and the `USING (organization_id = public.org_id())` RLS pattern.
