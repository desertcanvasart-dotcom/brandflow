---
name: website-seo-aeo-qa
description: Step 6, the final step of the website creation pipeline. Runs the pre-launch SEO/AEO and quality-assurance audit against the built site, producing a filled-in checklist with pass/fail and fixes. Use when the project's pipeline state shows current_step is 06-seo-aeo-qa and step 05-build-spec is approved AND the site has been built to staging. Approval of this step means the site is launch-ready.
---

# SEO/AEO + QA (Pipeline Step 6)

Audit the built (staging) site against a fixed standard before launch. This is the last gate — approval here means launch-ready. Unlike steps 1–5, this needs the actual built site to inspect, not just upstream artifacts.

## Before you start
1. Read `state.json`. Confirm `current_step` = `06-seo-aeo-qa` and step 5 is `approved`.
2. Confirm a **staging URL** exists in `pipeline/inputs/` or is provided. If the site isn't built yet, stop — this step audits a real site, it doesn't build one.
3. Read `sitemap-and-plan.md` and the Dig Brief's AEO targets — you're checking the built site delivers on them.
4. Read `references/qa-checklist.md` for the full standard.
5. If `status` is `needs_revision`, re-audit after fixes.

## What to produce
Write `pipeline/artifacts/launch-qa-report.md` — the checklist from `references/qa-checklist.md`, each item marked Pass / Fail / N/A with a note and, for fails, the specific fix. Group by:

1. **Technical SEO** — metadata per page, heading structure, canonicals, sitemap.xml, robots, redirects from old URLs.
2. **AEO / structured data** — schema markup, entity clarity, answer-shaped content for each AEO target from the Dig Brief, llms-friendly structure.
3. **Performance** — page speed pass, image optimization, mobile performance.
4. **Functional QA** — every link, every form (test a real submission), responsiveness across 3 breakpoints, cross-browser.
5. **Content QA** — no [CONFIRM]/[DECISION NEEDED]/placeholder text left, alt text on images, no lorem ipsum.

End with a **Launch-readiness verdict**: Ready / Not ready + the blocking items.

## Rules
- Actually inspect the staging site; don't assume. Where you can't verify something programmatically, say so and tell the operator how to check it manually.
- Tie AEO checks back to the specific target questions from the Dig Brief — did the site end up owning them?
- Be strict on the blocking list. A clean launch is the promise.

## When done
1. Update `state.json`: artifact path + `status` = `awaiting_review`.
2. This is the last step — do not advance past it.
3. Review prompt, e.g.:
   > Launch QA report ready. Verdict at the top, blocking items listed with fixes. Once these clear and you approve, the site is launch-ready and the creation pipeline is complete — handoff moves to Launch. Approve, or send it back for a re-audit after fixes.
