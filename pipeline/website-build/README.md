# Website Creation Pipeline

A chain of Claude Code skills that runs the **creation work** for a website project — from research to a build-ready spec — with the operator reviewing and approving after every step. This is the *execution* layer that sits inside the *management* layer (the phases and gates already in BrandFlow).

## The core idea

When the operator clicks **"let us deliver and create"** on a project, they aren't launching a robot that builds the whole site unattended. They're starting an **assisted assembly line**. Each station (a skill) does the heavy first-draft work, hands them a finished artifact, and stops. They review, edit, and approve. Their approval is what releases the next station.

```
  [click: let us deliver and create]
            │
            ▼
   ┌─────────────────┐   gate    ┌─────────────────┐   gate    ┌──────────────┐
   │ 1. DIG /        │  ──────▶  │ 2. STRATEGY &   │  ──────▶  │ 3. CONTENT   │  ──▶ ...
   │    RESEARCH     │  approve  │    SITEMAP      │  approve  │              │
   └─────────────────┘           └─────────────────┘           └──────────────┘
   produces: Dig Brief          produces: Sitemap +           produces: page
                                content plan + goals          copy drafts
```

Each skill = one BrandFlow phase's core deliverable. Each gate = one BrandFlow phase gate. The pipeline and the phase board are two views of the same journey.

## The six stations

| # | Skill | Produces (the artifact the operator reviews) | Maps to phase |
|---|---|---|---|
| 1 | **dig-research** | Dig Brief: competitor scan, search/AEO landscape, audience, positioning | Dig |
| 2 | **strategy-sitemap** | Sitemap + page-by-page content plan + conversion goals | Dig → Design boundary |
| 3 | **content** | First-draft copy for every page, on-brand, AEO-structured | Design |
| 4 | **design-direction** | Style direction + section-by-section layout wireframe spec | Design |
| 5 | **build-spec** | Build-ready spec: components, pages, tech notes, asset list | Build |
| 6 | **seo-aeo-qa** | Pre-launch SEO/AEO + QA checklist, filled in against the built site | Build → Launch boundary |

Everything is **assisted, not autonomous**: skills 1–5 produce drafts and specs; a human (the operator or their builder) does the actual site construction. Skill 6 audits the result.

## How the gates work

After each skill runs, it writes its artifact to the project's working folder and **stops with a review prompt**. Nothing advances automatically. the operator does one of three things:

- **Approve** → the orchestrator marks that phase's gate task done in BrandFlow and unlocks the next skill.
- **Revise** → the operator gives notes; the same skill re-runs with their notes as input (this is a revision round — the pipeline counts them, matching the 2-rounds-per-phase rule).
- **Stop** → the project pauses; nothing is lost.

See `orchestrator/README.md` for how the chain is driven and how it reads/writes BrandFlow state.

## Inputs — say everything exactly once

Project inputs come in three layers so the operator never repeats herself:

| Layer | Lives in | Filled in | File |
|---|---|---|---|
| **Studio standards** — voice, design taste, tech stack, QA bar | `shared/studio-profile.md` | ONCE, ever | Every skill reads it automatically |
| **Client identity** — brand voice, colors, personas, competitors | BrandFlow (Brand page + Knowledge Base) | Once per client | Pasted into the questionnaire's brand-kit section at project start |
| **This project** — goals, must-haves, deadline | `pipeline/inputs/questionnaire.md` | Once per project | Copied from `shared/onboarding-questionnaire.md` |

Starting a project = copy `shared/onboarding-questionnaire.md` into
`pipeline/inputs/`, paste the client's brand kit from BrandFlow into section A,
answer section B fresh. If it's a brand-new client, fill section A by hand —
then enter it into BrandFlow so it's a paste next time.

## What this is NOT

- It does not send anything to clients automatically. Client-facing approval still happens in the BrandFlow portal; these skills produce the internal work that *becomes* what the client reviews.
- It does not build or deploy the live site. It produces the spec and copy a human builds from.
- It does not replace the phase/gate/task system — it plugs into it.

## Reading order for whoever builds this
1. This file (you're here)
2. `orchestrator/README.md` — the chain controller and state contract
3. `shared/state-schema.md` — the handoff file every skill reads and writes
4. Each `skills/NN-*/SKILL.md` in order
