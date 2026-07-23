---
name: website-strategy-sitemap
description: Step 2 of the website creation pipeline. Turns the approved Dig Brief into a sitemap, page-by-page content plan, and defined conversion goals. Use when the project's pipeline state shows current_step is 02-strategy-sitemap and step 01-dig-research is approved. This step's output, once approved, FREEZES the site's scope — every page added later is a change order.
---

# Strategy & Sitemap (Pipeline Step 2)

Convert research into a plan: the exact pages the site will have, what each page must accomplish, and the conversion goals the whole site drives toward. Approval of this step freezes scope, so it must be complete and deliberate.

## Before you start
0. Read `../../shared/studio-profile.md` (relative to THIS skill file — it lives in the pipeline repo, not the project folder). It holds the studio's standing preferences — voice, design taste, tech stack, writing rules, QA bar. Apply them to everything you produce; they override generic defaults but never override this client's own brand guidelines.
1. Read `pipeline/state.json`. Confirm `current_step` = `02-strategy-sitemap` and step 1 is `approved`. If step 1 isn't approved, stop.
2. Read `pipeline/artifacts/dig-brief.md` in full. Everything here derives from it — especially the positioning statement and the AEO target questions.
3. If `status` is `needs_revision`, apply `review_notes` rather than restarting.

## What to produce
Write `pipeline/artifacts/sitemap-and-plan.md` containing:

1. **Conversion goals** — one primary goal (the single action the site exists to drive) and 2–3 secondary goals. Every page decision references these.
2. **Sitemap** — the full page list as a simple tree (top-level nav + sub-pages). Justify each page in one line: why it exists and which goal or AEO question it serves. Include the answer-owning pages identified in the Dig Brief.
3. **Page-by-page plan** — for each page: its single job, the key sections/blocks in order, the primary call-to-action, and any AEO question it's the definitive answer to.
4. **Global elements** — nav, footer, and any site-wide conversion elements (e.g. a recurring CTA band).
5. **Scope statement** — an explicit list of what's IN this build and what's explicitly OUT, so the freeze is unambiguous.

## Rules
- Every page must trace to either a conversion goal or an AEO target from the Dig Brief. If a page serves neither, cut it or justify it.
- Keep the site as small as it can be while doing its job. Solo-built sites die from scope bloat.
- The scope statement is what protects the operator later — make the OUT list real, not empty.

## When done
1. Update `state.json`: record the artifact path, set `status` to `awaiting_review`.
2. Do not start step 3.
3. Review prompt, e.g.:
   > Sitemap and content plan ready. This is the scope-freeze gate — once you approve, added pages become change orders. Check: (a) is every page earning its place, (b) is the primary conversion goal right, (c) is the OUT list honest. Approve to unlock Content, or send notes.
