---
name: website-design-direction
description: Step 4 of the website creation pipeline. Produces the visual style direction and a section-by-section layout/wireframe spec for every page, based on approved content. Use when the project's pipeline state shows current_step is 04-design-direction and step 03-content is approved. Produces a design spec the operator designs from — it does not generate the final visual design files.
---

# Design Direction (Pipeline Step 4)

Define how the site looks and how each page is laid out, so the operator (or their design tool) can execute quickly with decisions already made. Style direction first, then layout — cheap to change direction here, expensive later.

## Before you start
0. Read `../../shared/studio-profile.md` (relative to THIS skill file — it lives in the pipeline repo, not the project folder). It holds the studio's standing preferences — voice, design taste, tech stack, writing rules, QA bar. Apply them to everything you produce; they override generic defaults but never override this client's own brand guidelines.
1. Read `state.json`. Confirm `current_step` = `04-design-direction` and step 3 is `approved`.
2. Read `content-drafts.md` (the actual content that must be laid out), `sitemap-and-plan.md` (page jobs, section order), and brand guidelines in `pipeline/inputs/` (colors, fonts, logo, any visual rules).
3. If `status` is `needs_revision`, apply `review_notes`.

## What to produce
Write `pipeline/artifacts/design-direction.md`:

1. **Style direction** (one coherent choice, not a menu):
   - Typography: heading + body typefaces and the reasoning.
   - Color: primary, secondary, accent, neutrals — respecting brand guidelines.
   - Imagery mood: photography/illustration style, do's and don'ts.
   - Overall feeling in 3 adjectives, tied to the positioning from the Dig Brief.
2. **Layout / wireframe spec, page by page** — for each page, a section-by-section description of the layout: what block sits where, hierarchy, where the content from step 3 goes, where CTAs sit, responsive behavior notes. Describe it precisely enough to build from without a picture, but this is a spec, not a rendered mockup.
3. **Homepage first** — lead with the homepage; it sets the design language for the rest. Call out the design decisions it establishes that the other pages inherit.
4. **Component inventory** — the reusable pieces the layouts imply (nav, cards, CTA band, testimonial block, footer, etc.). This feeds the build-spec.

## Rules
- One clear direction, chosen and justified — don't hand the operator three options to decide between; that's their review's job if they disagree.
- Honor brand guidelines strictly; only extend them where they're silent, and say where you did.
- Keep accessibility in mind (contrast, hierarchy, tap targets) — it also helps AEO.
- This is a spec to design/build from, not final art.

## When done
1. Update `state.json`: artifact path + `status` = `awaiting_review`.
2. Do not start step 5.
3. Review prompt, e.g.:
   > Design direction + page layouts ready, homepage first. Check: (a) does the style match the positioning, (b) is the homepage layout right (everything else inherits from it), (c) any brand rules I extended that you want reeled in. Approve to unlock the Build Spec, or send notes.
