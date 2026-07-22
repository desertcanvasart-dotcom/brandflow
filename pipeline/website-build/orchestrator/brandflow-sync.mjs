// brandflow-sync.mjs — the ONE place the pipeline touches BrandFlow's
// phase/gate/task records. Deliberately decoupled and tenant-safe.
//
// ─────────────────────────────────────────────────────────────────────
// MULTI-TENANT SAFETY (hard requirement)
// ─────────────────────────────────────────────────────────────────────
// The pipeline runs OUTSIDE the app's request context, so it must never
// issue a raw query or pass an organization_id as a parameter. Modes:
//
//   'manual' (v1 DEFAULT) — performs ZERO database access. It only
//        prints/logs the intended BrandFlow update for the operator to
//        action *inside the app*, where they are already authenticated
//        and org-scoped. No DB access ⇒ no possible cross-tenant read/write.
//
//   'off'  — no-op (sync disabled entirely).
//
//   'api'  — NOT ENABLED in v1. When enabled it MUST call the existing
//        tRPC mutations (task.update / phase.update) through the
//        operator's *authenticated session*, so every call inherits
//        `ctx.orgId` + RLS exactly like the app. It must NEVER use a
//        service-role/raw client or accept an org id argument. Until that
//        authenticated path is wired, this mode throws — it cannot fall
//        back to an unsafe write.
//
// Sync is called behind this flag and every call is wrapped in try/catch
// by the orchestrator, so a sync failure NEVER blocks creative work.
// ─────────────────────────────────────────────────────────────────────

import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

export const SYNC_MODE = process.env.PIPELINE_BRANDFLOW_SYNC || 'manual'

// Pipeline event → BrandFlow update intent (the contract in orchestrator/README.md)
export function intentsFor(event, step) {
  const phase = step.phase
  switch (event) {
    case 'step_in_progress':
      return [`Set phase "${phase}" → in_progress`]
    case 'step_awaiting_review':
      return [`Phase "${phase}": mark non-gate tasks done; leave the gate task OPEN`]
    case 'step_approved':
      return step.gate
        ? [`Phase "${phase}": mark GATE task done; set phase → completed`]
        : [`Phase "${phase}": mark step "${step.id}" tasks done (phase stays in_progress)`]
    case 'revision_used':
      return [`Phase "${phase}": log note — revision round ${step.revision_count} of ${step.max_revisions}` +
              (step.revision_count > step.max_revisions ? ' (BILLABLE extra round)' : '')]
    default:
      return [`(no mapping for event ${event})`]
  }
}

// Returns { mode, actions } and NEVER throws in manual/off mode.
export function sync(event, step, workingDir) {
  const actions = intentsFor(event, step)
  if (SYNC_MODE === 'off') return { mode: 'off', actions: [] }

  if (SYNC_MODE === 'manual') {
    const line = `[${new Date().toISOString()}] ${event} :: ${actions.join(' | ')}`
    // log only — no DB access whatsoever
    try { appendFileSync(join(workingDir, 'pipeline', 'brandflow-sync.log'), line + '\n') } catch { /* non-blocking */ }
    for (const a of actions) console.log(`  ↪ BrandFlow (confirm manually in-app): ${a}`)
    return { mode: 'manual', actions }
  }

  if (SYNC_MODE === 'api') {
    throw new Error(
      'PIPELINE_BRANDFLOW_SYNC=api is not enabled in v1. Enabling it requires calling ' +
      'task.update / phase.update through the operator\'s authenticated tRPC session ' +
      '(inherits ctx.orgId + RLS) — never a raw or service-role query. See orchestrator/USAGE.md.'
    )
  }

  throw new Error(`Unknown PIPELINE_BRANDFLOW_SYNC mode: ${SYNC_MODE}`)
}
