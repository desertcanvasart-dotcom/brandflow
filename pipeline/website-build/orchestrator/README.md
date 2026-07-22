# Pipeline Orchestrator

The orchestrator is the thin controller that turns six independent skills into one gated chain. It is deliberately simple: skills do the thinking, the orchestrator does the routing.

## Responsibilities

1. **Start the pipeline** when the operator triggers "let us deliver and create" on a project.
   - Create `pipeline/` working dir, seed `state.json` with the six steps (all `pending` except step 1 = `in_progress`), copy onboarding inputs into `pipeline/inputs/`.
2. **Run the current step** — invoke the skill named in `pipeline.current_step`.
3. **Pause at the gate** — when a skill sets its status to `awaiting_review`, stop and surface the artifact + review prompt to the operator.
4. **Handle the operator's decision:**
   - **Approve** → set step `approved`; mark the matching BrandFlow phase gate task complete; set the next step `in_progress`; update `current_step`.
   - **Revise** → set step `needs_revision`, attach their notes, re-invoke the same skill.
   - **Stop** → leave state as-is; the project simply pauses.
5. **Sync to BrandFlow** after every state change (see below).

## BrandFlow sync contract

The pipeline is the *doing*; BrandFlow is the *record*. Keep them in agreement:

| Pipeline event | BrandFlow update |
|---|---|
| Step set to `in_progress` | matching phase → `in_progress` |
| Step `awaiting_review` | phase's non-gate tasks → done; gate task → still open |
| Step `approved` | gate task → done; phase → `completed` |
| Revision round used | log a note on the phase (round N of 2) |

Mapping of steps → phases:
- `01-dig-research` → **Dig**
- `02-strategy-sitemap` → **Dig** (final gate: sitemap approval freezes scope)
- `03-content` → **Design**
- `04-design-direction` → **Design**
- `05-build-spec` → **Build**
- `06-seo-aeo-qa` → **Build** (final gate: launch-ready)

Sync can be done via the BrandFlow tRPC API (task/phase mutations already exist) or, in a first version, left as a manual checkbox the operator ticks — decide based on how automated you want v1. Recommended: start manual, automate once the pipeline itself is proven.

## The trigger

"Let us deliver and create" is just a button that runs the orchestrator's **start** action for the selected project. In practice that can be:
- A Claude Code command the operator runs in the project's working directory, or
- A button in BrandFlow that kicks off the orchestrator.

For v1, the simplest reliable version is a Claude Code entry point: the operator opens the project folder and says "start the creation pipeline" (or runs the start command), and the orchestrator + skill 1 take it from there.

## Design principles
- **One step live at a time.** Never run two skills concurrently — it breaks the review rhythm and the revision accounting.
- **The orchestrator never creates content.** If it's writing copy or making design calls, that logic belongs in a skill, not here.
- **State is the source of truth, not the conversation.** Always read `state.json` fresh; never assume where the pipeline is from memory.
