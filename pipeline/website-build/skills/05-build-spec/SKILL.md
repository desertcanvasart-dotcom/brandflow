---
name: website-build-spec
description: Step 5 of the website creation pipeline. Assembles a build-ready specification — components, per-page assembly, tech notes, and a consolidated asset list — from approved content and design direction. Use when the project's pipeline state shows current_step is 05-build-spec and step 04-design-direction is approved. Produces the spec a human builds the site from; it does not build or deploy the site.
---

# Build Spec (Pipeline Step 5)

Package everything into a single document a builder can construct the site from without re-deciding anything. No design or content decisions happen here — those are locked. This is assembly instructions.

## Before you start
0. Read `../../shared/studio-profile.md` (relative to THIS skill file — it lives in the pipeline repo, not the project folder). It holds the studio's standing preferences — voice, design taste, tech stack, writing rules, QA bar. Apply them to everything you produce; they override generic defaults but never override this client's own brand guidelines.
1. Read `state.json`. Confirm `current_step` = `05-build-spec` and step 4 is `approved`.
2. Read `design-direction.md`, `content-drafts.md`, and `sitemap-and-plan.md`. Everything you need is already decided in those.
3. If `status` is `needs_revision`, apply `review_notes`.

## What to produce
Write `pipeline/artifacts/build-spec.md`:

1. **Tech notes** — the platform/stack assumption (confirm with the operator if unspecified), and any global setup: fonts to load, color tokens, breakpoints, forms and where submissions go.
2. **Component library** — each reusable component from the design's inventory: its purpose, variants, content it holds, and behavior. Builder builds these once.
3. **Page-by-page assembly** — for each page, the ordered list of components + which content block (from step 3) fills each, plus the page's meta title/description draft and its target AEO question.
4. **Asset list** — every `[IMAGE: …]` from the content, consolidated: what's needed, suggested source (client-provided / stock / to-shoot), and where it's used. This is the operator's shopping list.
5. **Build sequence** — the recommended order to build in (global setup → components → homepage → inner pages), so the build phase has a path.

## Rules
- Decide nothing new about content or visuals — if something's genuinely undecided, flag it as a `[DECISION NEEDED]`, don't silently invent it.
- The spec must be complete enough that a competent builder needs no further questions for the common cases.
- Keep the asset list exhaustive — missing assets are the #1 cause of build-phase stalls.

## When done
1. Update `state.json`: artifact path + `status` = `awaiting_review`.
2. Do not start step 6.
3. Review prompt, e.g.:
   > Build spec ready — components, page assembly, and the full asset list. Check: (a) the asset list is complete (this is what you'll gather/shoot), (b) any [DECISION NEEDED] flags, (c) the stack assumption is right. Approve to unlock SEO/AEO + QA, or send notes.
