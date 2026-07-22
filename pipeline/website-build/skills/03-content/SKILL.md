---
name: website-content
description: Step 3 of the website creation pipeline. Writes first-draft copy for every page in the approved sitemap — on-brand, conversion-focused, and structured for AI-search citability. Use when the project's pipeline state shows current_step is 03-content and step 02-strategy-sitemap is approved. Produces drafts for the operator to edit, never final published copy.
---

# Content (Pipeline Step 3)

Write the first-draft copy for every page. The operator edits and finalizes — your job is to get them 80% there in their client's voice, not to ship.

## Before you start
1. Read `state.json`. Confirm `current_step` = `03-content` and step 2 is `approved`.
2. Read `pipeline/artifacts/sitemap-and-plan.md` (page jobs, sections, CTAs, AEO targets) and `pipeline/artifacts/dig-brief.md` (voice, audience language, positioning).
3. Read brand guidelines in `pipeline/inputs/` for tone and any mandated terminology.
4. If `status` is `needs_revision`, apply `review_notes`.

## What to produce
Write `pipeline/artifacts/content-drafts.md`, organized page by page following the sitemap order. For each page:
- **Section-by-section copy** matching the blocks defined in the plan — headline, subhead, body, CTA text.
- Copy written in the **client's** voice and audience's language (from the Dig Brief), not generic marketing-speak.
- Where a page is an AEO answer target, structure the relevant section as a **clear, extractable answer** (a direct definition, a set of steps, a comparison, or an FAQ block) so AI engines can cite it.
- Note image/asset needs inline as `[IMAGE: description]` so the build-spec step can collect them.

## Rules
- These are DRAFTS. Flag anything you had to assume with `[CONFIRM: …]` so the operator can verify facts, claims, numbers, and names — never invent client facts, testimonials, or stats.
- Match brand voice. If no brand voice is documented, infer it from existing materials and state the read you took.
- Respect the conversion goal — every page should move toward its defined CTA.
- Keep AEO sections genuinely answer-shaped, not keyword-stuffed.

## When done
1. Update `state.json`: artifact path + `status` = `awaiting_review`.
2. Do not start step 4.
3. Review prompt, e.g.:
   > First-draft copy ready for all pages. Everything marked [CONFIRM] needs your fact-check; [IMAGE] tags flag assets we'll need. Check voice against the client and that each page drives its CTA. Approve to unlock Design Direction, or send notes for a revision round.
