# Claude Code Task Brief: Wire the "Let Us Deliver & Create" Pipeline

## Context
The website studio (one tenant) runs projects through six phases (Onboarding → Dig → Design → Build → Launch → Optimize) inside BrandFlow. That's the *management* layer — it tracks that work happens.

This task builds the *execution* layer: an **assisted creation pipeline** that does the first-draft creation work when the operator clicks **"let us deliver and create"** on a website project. It's a chain of six Claude Code skills, each producing one artifact, each gated on the operator's review before the next runs.

The six skills are already written (see the `website-build/skills/` folder in this package). Your job is to wire them into a working, gated, resumable pipeline and connect it to BrandFlow's phase/gate records.

## The model (read these first, in order)
1. `website-build/README.md` — the pipeline concept and the six stations
2. `website-build/orchestrator/README.md` — the controller and the BrandFlow sync contract
3. `website-build/shared/state-schema.md` — the `state.json` handoff contract
4. Each `website-build/skills/NN-*/SKILL.md` — the six skills, already authored

## Non-negotiable behaviors
- **Assisted, not autonomous.** Skills produce drafts/specs; humans build the site. Never auto-publish or auto-advance.
- **Gate after every step.** A skill sets `awaiting_review` and stops. Only the operator's explicit approval moves the pipeline forward. Approve / Revise / Stop are the only transitions.
- **One step live at a time.** Never run two skills at once.
- **State file is the source of truth** — never infer pipeline position from the conversation; always read `state.json` fresh.
- **Revision accounting** — `max_revisions` is 2 per step; a 3rd triggers a confirm ("this is a billable extra round") before proceeding.

## What to build

### 1. The orchestrator (start here)
Implement the controller described in `orchestrator/README.md`:
- **start action**: given a project, create the `pipeline/` working dir, seed `state.json` (six steps, step 1 `in_progress`, rest `pending`), copy onboarding inputs into `pipeline/inputs/`, then invoke skill 1.
- **advance action**: on approval, mark current step `approved`, set next `in_progress`, update `current_step`, invoke next skill.
- **revise action**: on notes, set current step `needs_revision`, attach notes, re-invoke same skill.
- **stop action**: persist state, halt.
Keep the orchestrator dumb: routing + state only, zero content generation.

### 2. The trigger
Make "let us deliver and create" run the orchestrator's start action for the selected project. For v1, a Claude Code entry point (a command the operator runs in the project folder, or a phrase they say) is fine — don't over-engineer a UI button yet unless wiring it into BrandFlow is trivial.

### 3. BrandFlow sync
Implement the sync table in `orchestrator/README.md` (step → phase/gate updates). **For v1, make sync a clearly-logged manual step the operator confirms** (the orchestrator prints "mark Dig gate done in BrandFlow?"), unless you can cleanly call the existing tRPC task/phase mutations — if so, wire it, but keep it behind a flag so a sync failure never blocks the creative work.

### 4. Resumability test
Prove the operator can stop mid-pipeline, close everything, reopen the project folder days later, and the orchestrator resumes at the exact step with revision counts intact. This is the whole point of the state file — test it explicitly.

## Out of scope
- The social-media pipeline (this is website-first; design so a second pipeline can be added as a sibling folder later).
- Building or deploying actual websites.
- Client-facing portal changes — these skills produce internal artifacts only.
- Editing the six SKILL.md files unless you find a real bug; they're the spec, not a draft to rewrite.

## Definition of done
1. Running the start action on a test project creates the working dir, seeds state, and produces the Dig Brief, then stops for review.
2. Approving advances exactly one step; revising re-runs the same step and increments the count; a 3rd revision prompts the billable-round confirm.
3. The pipeline runs end to end through all six artifacts with a human approving each gate.
4. Stop + resume works across sessions from `state.json` alone.
5. BrandFlow sync fires (or prompts) at each transition per the contract.
6. Short summary at the end: how to trigger it, how the state file works, and anything in the skills/orchestrator docs that didn't match reality when you implemented it.
