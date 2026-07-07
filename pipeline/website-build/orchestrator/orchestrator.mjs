#!/usr/bin/env node
// orchestrator.mjs — the thin controller that turns six skills into one
// gated, resumable chain. Routing + state.json ONLY; zero content generation.
//
// State is the source of truth: every invocation reads state.json FRESH
// from disk (a new process each time), so stop-and-resume across sessions
// is automatic — nothing is remembered in conversation.
//
// Usage (run inside the project's working directory, or pass --dir):
//   node orchestrator.mjs start   --project-id <uuid> --brand-id <uuid> --name "Acme" [--type website] [--dir .]
//   node orchestrator.mjs status  [--dir .]
//   node orchestrator.mjs submit  --artifact artifacts/dig-brief.md [--dir .]   (a skill calls this when its draft is ready)
//   node orchestrator.mjs advance [--dir .]                                     (operator APPROVES the awaiting_review step)
//   node orchestrator.mjs revise  --note "tighten the positioning" [--confirm-billable] [--dir .]
//   node orchestrator.mjs stop    [--dir .]
//
// Trigger: "let us deliver and create" ≙ `orchestrator.mjs start` for the project.

import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { sync, SYNC_MODE } from './brandflow-sync.mjs'

// Six stations, in order. `gate` = this step's approval closes its phase's gate.
const STEPS = [
  { id: '01-dig-research',     phase: 'Dig',    gate: false },
  { id: '02-strategy-sitemap', phase: 'Dig',    gate: true  }, // sitemap approval freezes scope
  { id: '03-content',          phase: 'Design', gate: false },
  { id: '04-design-direction', phase: 'Design', gate: true  }, // design approval
  { id: '05-build-spec',       phase: 'Build',  gate: false },
  { id: '06-seo-aeo-qa',       phase: 'Build',  gate: true  }, // launch-ready
]
const MAX_REVISIONS = 2

// ---- tiny arg parser ----
function parseArgs(argv) {
  const a = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i]
    if (t.startsWith('--')) {
      const k = t.slice(2)
      if (k === 'confirm-billable') { a[k] = true; continue }
      a[k] = argv[++i]
    } else a._.push(t)
  }
  return a
}

const args = parseArgs(process.argv.slice(2))
const action = args._[0]
const dir = args.dir || '.'
const stateDir = join(dir, 'pipeline')
const statePath = join(stateDir, 'state.json')

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1) }

function readState() {
  if (!existsSync(statePath)) fail(`no pipeline at ${statePath} — run "start" first.`)
  return JSON.parse(readFileSync(statePath, 'utf8'))
}
function writeState(state) {
  const tmp = statePath + '.tmp'
  writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n')
  renameSync(tmp, statePath) // atomic
}
function stepMeta(id) { return STEPS.find(s => s.id === id) }
function currentStep(state) {
  const cur = state.pipeline.steps.find(s => s.id === state.pipeline.current_step)
  return { ...cur, ...stepMeta(cur.id) }
}
// Sync is behind a flag AND wrapped so a failure never blocks the pipeline.
function safeSync(event, step) {
  try { sync(event, step, dir) }
  catch (e) { console.warn(`  ⚠ sync skipped (${SYNC_MODE}): ${e.message}`) }
}

function printStatus(state) {
  console.log(`\nPipeline for "${state.project.name}"  (sync mode: ${SYNC_MODE})`)
  console.log(`current_step: ${state.pipeline.current_step}`)
  for (const s of state.pipeline.steps) {
    const mark = s.id === state.pipeline.current_step ? '▶' : ' '
    console.log(`  ${mark} ${s.id.padEnd(20)} ${s.status.padEnd(16)} rev ${s.revision_count}/${s.max_revisions}` +
                (s.artifact ? `  ${s.artifact}` : ''))
  }
  console.log('')
}

// ---- actions ----
function doStart() {
  if (existsSync(statePath)) fail('pipeline already started (state.json exists). Use "status".')
  if (!args['project-id'] || !args['brand-id'] || !args.name) fail('start needs --project-id, --brand-id, --name.')
  mkdirSync(join(stateDir, 'artifacts'), { recursive: true })
  mkdirSync(join(stateDir, 'inputs'), { recursive: true })
  const state = {
    project: { name: args.name, brand_id: args['brand-id'], project_id: args['project-id'], type: args.type || 'website' },
    brand: { guidelines: args.guidelines || '', audience: args.audience || '', assets_dir: 'pipeline/inputs/assets' },
    pipeline: {
      current_step: STEPS[0].id,
      steps: STEPS.map((s, i) => ({
        id: s.id,
        status: i === 0 ? 'in_progress' : 'pending',
        artifact: null,
        revision_count: 0,
        max_revisions: MAX_REVISIONS,
        review_notes: [],
      })),
    },
  }
  writeState(state)
  safeSync('step_in_progress', currentStep(state))
  console.log(`✓ Pipeline started. Copy onboarding inputs into ${join(stateDir, 'inputs')}/`)
  console.log(`  Next: run skill "website-${STEPS[0].id.replace(/^\d+-/, '')}" (step ${STEPS[0].id}).`)
  printStatus(state)
}

function doSubmit() {
  const state = readState()
  const cur = currentStep(state)
  if (!['in_progress', 'needs_revision'].includes(cur.status))
    fail(`current step ${cur.id} is "${cur.status}", not in_progress/needs_revision — nothing to submit.`)
  if (!args.artifact) fail('submit needs --artifact <path>.')
  const raw = state.pipeline.steps.find(s => s.id === cur.id)
  raw.status = 'awaiting_review'
  raw.artifact = args.artifact
  writeState(state)
  safeSync('step_awaiting_review', currentStep(state))
  console.log(`✓ ${cur.id} → awaiting_review (artifact: ${args.artifact}). Operator: approve or revise.`)
}

function doAdvance() {
  const state = readState()
  const cur = currentStep(state)
  if (cur.status !== 'awaiting_review')
    fail(`can only approve an awaiting_review step; ${cur.id} is "${cur.status}".`)
  const raw = state.pipeline.steps.find(s => s.id === cur.id)
  raw.status = 'approved'
  safeSync('step_approved', currentStep(state))

  const idx = STEPS.findIndex(s => s.id === cur.id)
  if (idx === STEPS.length - 1) {
    state.pipeline.current_step = cur.id // stays on last
    writeState(state)
    console.log('✓ Final step approved — pipeline COMPLETE. All six artifacts done.')
    return printStatus(state)
  }
  const next = STEPS[idx + 1]
  const nextRaw = state.pipeline.steps.find(s => s.id === next.id)
  nextRaw.status = 'in_progress'
  state.pipeline.current_step = next.id
  writeState(state)
  safeSync('step_in_progress', currentStep(state))
  console.log(`✓ ${cur.id} approved → ${next.id} now in_progress. Run skill "website-${next.id.replace(/^\d+-/, '')}".`)
  printStatus(state)
}

function doRevise() {
  const state = readState()
  const cur = currentStep(state)
  if (!['awaiting_review', 'in_progress'].includes(cur.status))
    fail(`can only revise an awaiting_review/in_progress step; ${cur.id} is "${cur.status}".`)
  if (!args.note) fail('revise needs --note "<what to change>".')
  const raw = state.pipeline.steps.find(s => s.id === cur.id)

  // Revision accounting: rounds 1..max are included; the next one is billable.
  const willBeBillable = raw.revision_count >= raw.max_revisions
  if (willBeBillable && !args['confirm-billable']) {
    console.log(`⚠ ${cur.id} has used ${raw.revision_count}/${raw.max_revisions} included revisions.`)
    console.log('  A further revision is a BILLABLE extra round per the contract.')
    console.log('  Re-run with --confirm-billable to proceed.')
    process.exit(2)
  }
  raw.revision_count += 1
  raw.status = 'needs_revision'
  raw.review_notes.push({ note: args.note, billable: willBeBillable })
  writeState(state)
  safeSync('revision_used', currentStep(state))
  console.log(`✓ ${cur.id} → needs_revision (round ${raw.revision_count}${willBeBillable ? ', BILLABLE' : ''}).`)
  console.log(`  Re-run skill "website-${cur.id.replace(/^\d+-/, '')}" with the notes, then "submit" again.`)
}

function doStop() {
  const state = readState() // persisted already; stop is a no-op on state
  console.log('✓ Stopped. State persisted — nothing lost.')
  console.log(`  Resume any time: cd ${dir} && node <orchestrator> status`)
  printStatus(state)
}

switch (action) {
  case 'start':   doStart(); break
  case 'status':  printStatus(readState()); break
  case 'submit':  doSubmit(); break
  case 'advance': doAdvance(); break
  case 'revise':  doRevise(); break
  case 'stop':    doStop(); break
  default:
    console.log('actions: start | status | submit | advance | revise | stop')
    process.exit(1)
}
