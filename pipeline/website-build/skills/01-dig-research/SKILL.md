---
name: website-dig-research
description: Step 1 of the website creation pipeline. Produces the Dig Brief — competitor scan, search & AI-search (AEO/GEO) landscape, audience definition, and positioning — for a new website project. Use this the moment a website project's creation pipeline starts (the operator clicks "let us deliver and create"), or when the project's pipeline state shows current_step is 01-dig-research. Always run this before any strategy, sitemap, content, or design work — nothing downstream is allowed to start until the Dig Brief is approved.
---

# Dig / Research (Pipeline Step 1)

Produce the **Dig Brief**: the research foundation the entire website is built on. This is the namesake of the operator's method — it should feel substantial and specific, never generic.

## Before you start
0. Read `../../shared/studio-profile.md` (relative to THIS skill file — it lives in the pipeline repo, not the project folder). It holds the studio's standing preferences — voice, design taste, tech stack, writing rules, QA bar. Apply them to everything you produce; they override generic defaults but never override this client's own brand guidelines.
1. Read `pipeline/state.json`. Confirm you are `current_step` = `01-dig-research`. (This is step one, so upstream approval isn't required — but confirm the pipeline was actually started.)
2. Read everything in `pipeline/inputs/`: the onboarding questionnaire, brand assets, brand guidelines. If the questionnaire is missing, stop and tell the operator the pipeline can't dig without it.
3. If `status` is `needs_revision`, read `review_notes` and treat this as a revision pass — apply the notes, don't start over.

## What to produce
Write `pipeline/artifacts/dig-brief.md` containing, in this order:

1. **Business snapshot** — what they do, who they serve, what a win looks like for them. Pulled from the questionnaire, not invented.
2. **Audience** — 2–3 concrete audience segments with their goals, objections, and the language they actually use.
3. **Competitor scan** — 3–5 competitors. For each: positioning in one line, messaging angle, site structure notes, one thing they do well, one gap the studio can exploit. **Use web search** to look these up; don't rely on memory.
4. **Search & AI-search landscape (AEO/GEO)** — this is a differentiator, treat it seriously:
   - The topics/questions this audience searches for.
   - How the client currently appears (or doesn't) in Google and in AI-generated answers.
   - Which questions the site should be the best answer to, so it gets cited by AI search.
   - See `references/aeo-checklist.md` for what to assess.
5. **Positioning statement** — one paragraph: for [audience], [client] is the [category] that [differentiator], unlike [alternative]. This anchors every later step.
6. **Open questions for the operator** — anything the research surfaced that needs their judgment before strategy.

## Rules
- Ground every competitor and search claim in a real source (web search). Cite sources inline.
- Be specific to THIS business. If a sentence would be true of any client, cut it.
- Keep it to 2–3 pages of real substance, not padding.

## When done
1. Update `state.json`: set this step's `artifact` to the file path and `status` to `awaiting_review`.
2. Do **not** start step 2.
3. End with a tight review prompt, e.g.:
   > Dig Brief ready for your review. Check especially: (a) does the positioning statement sound like this client, (b) are the AEO target questions the right ones to win, (c) anything in "Open questions" you want to resolve before we map the site. Approve to unlock Strategy & Sitemap, or send notes to revise.
