# Pipeline State — the handoff contract

Every skill in the pipeline reads and writes **one shared state file** so the chain has continuity and the operator can stop/resume at any point. This is what makes it a pipeline rather than six disconnected tools.

## Location
```
<project-working-dir>/pipeline/state.json
<project-working-dir>/pipeline/artifacts/     ← each skill's output document(s)
<project-working-dir>/pipeline/inputs/         ← onboarding questionnaire, brand assets, credentials
```

## state.json shape

```json
{
  "project": {
    "name": "Acme Co Website",
    "brand_id": "uuid-from-brandflow",
    "project_id": "uuid-from-brandflow",
    "type": "website"
  },
  "brand": {
    "guidelines": "path or inline summary of brand voice, colors, fonts",
    "audience": "who they serve",
    "assets_dir": "pipeline/inputs/assets"
  },
  "pipeline": {
    "current_step": "01-dig-research",
    "steps": [
      {
        "id": "01-dig-research",
        "status": "approved",          // pending | in_progress | awaiting_review | needs_revision | approved
        "artifact": "artifacts/dig-brief.md",
        "revision_count": 0,
        "max_revisions": 2,
        "review_notes": []
      },
      {
        "id": "02-strategy-sitemap",
        "status": "in_progress",
        "artifact": null,
        "revision_count": 0,
        "max_revisions": 2,
        "review_notes": []
      }
    ]
  }
}
```

## Rules every skill must follow

1. **Read state first.** On start, read `state.json`. Confirm the previous step's status is `approved` before doing anything. If it isn't, stop and say so.
2. **Consume upstream artifacts.** A skill reads the artifacts of the steps before it (e.g. content reads the sitemap; build-spec reads content + design). Never re-derive what an earlier step already decided.
3. **Write one artifact.** Produce a single primary document in `artifacts/`, path recorded in state.
4. **Set status to `awaiting_review` and stop.** Never advance the pipeline yourself. End with a short, specific review prompt telling the operator exactly what to check.
5. **Honor revisions.** If invoked with review notes and status `needs_revision`, increment `revision_count`, apply the notes, and re-emit. If `revision_count` would exceed `max_revisions`, flag it (this is a billable extra round per the contract) and ask the operator to confirm before proceeding.
6. **Never touch client-facing systems.** These skills work on internal artifacts only. Publishing to the client portal is a separate, human-initiated step.

## Why a shared file and not just conversation
The operator works in sessions across days. The state file means they can close everything, come back, and the pipeline knows exactly where they are — which step is live, what's approved, how many revision rounds each phase has used. It's also what the orchestrator syncs back to BrandFlow's phase/task/gate records.
