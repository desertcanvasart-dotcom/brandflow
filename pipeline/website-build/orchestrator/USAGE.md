# Orchestrator — usage

Reference implementation: `orchestrator.mjs` (routing + `state.json` only, zero
content generation) and `brandflow-sync.mjs` (the flagged, tenant-safe sync).
Node ≥ 18, no dependencies. This is pipeline reference material — it is **not**
part of the app build (see `/.vercelignore`).

## The trigger
> "let us deliver and create" ≙ the **start** action for the selected project.

The operator opens the project's working directory and runs:
```bash
node <path-to>/orchestrator.mjs start \
  --project-id <brandflow-project-uuid> \
  --brand-id   <brandflow-brand-uuid> \
  --name "Acme Co Website" [--type website]
```
That seeds `pipeline/state.json` (six steps, step 1 `in_progress`), creates
`pipeline/artifacts/` and `pipeline/inputs/`, and tells the operator to run skill 1.

## The loop (one step live at a time)
1. Run the current skill (it reads `pipeline/state.json` + `pipeline/inputs/`, writes one artifact).
2. The skill finishes → `node orchestrator.mjs submit --artifact artifacts/<file>.md` → step becomes `awaiting_review`.
3. Operator reviews the artifact, then either:
   - **Approve** → `node orchestrator.mjs advance` → step `approved`, next step `in_progress`.
   - **Revise** → `node orchestrator.mjs revise --note "…"` → step `needs_revision`, `revision_count++`.
   - **Stop** → `node orchestrator.mjs stop` → pauses; state persisted.
4. `node orchestrator.mjs status` shows exactly where the pipeline is.

## Revision accounting
`max_revisions = 2` per step. The 3rd revision is a **billable extra round**:
`revise` refuses it and prints a confirm prompt; re-run with `--confirm-billable`
to proceed. Counts persist in `state.json`, so they survive stop/resume.

## Stop & resume
State lives entirely in `pipeline/state.json`. Close everything, come back days
later, `cd` into the project dir, run `status` (or the next action) — the
orchestrator resumes at the exact step with revision counts intact. It never
infers position from the conversation.

## BrandFlow sync — and how it stays org-scoped
Controlled by `PIPELINE_BRANDFLOW_SYNC`:
- **`manual`** (default, v1): performs **zero database access**. It prints/logs
  the intended phase/gate/task update (also to `pipeline/brandflow-sync.log`) for
  the operator to action **inside the app**, where they are already authenticated
  and org-scoped. No DB access ⇒ no possible cross-tenant read/write.
- **`off`**: sync disabled.
- **`api`** (not enabled in v1): when wired, it must call the existing
  `task.update` / `phase.update` tRPC mutations through the operator's
  **authenticated session**, so every call inherits `ctx.orgId` + RLS — never a
  raw/service-role query, never an org id passed as an argument. Until then it
  throws (guarded; it cannot fall back to an unsafe write).

Sync runs behind this flag and every call is wrapped in try/catch, so a sync
failure never blocks the creative work.

### Step → phase/gate mapping (the sync contract)
| Step | Phase | Approval closes gate? |
|---|---|---|
| 01-dig-research | Dig | no |
| 02-strategy-sitemap | Dig | yes (sitemap approval freezes scope) |
| 03-content | Design | no |
| 04-design-direction | Design | yes |
| 05-build-spec | Build | no |
| 06-seo-aeo-qa | Build | yes (launch-ready) |
