# Studio Profile — sarahdigs

> **What this is:** the standing preferences of the studio — everything that is
> true for EVERY project. Every pipeline skill reads this file before working,
> so anything written here never has to be repeated in a questionnaire, a
> revision note, or a chat message again. Edit it only when the methodology
> evolves.
>
> Filled in by Sara Debs. A few ✏️ items are still open — see below — answer
> those and delete the flag when ready.

## 1. Studio identity & voice

sarahdigs is a website studio. we build websites as business assets — things
that make people feel something, trust the business, and buy from it. one
studio principal speaking, always. confident, dry, plainspoken.

everything is lowercase. brand name, headlines, nav, buttons, ctas. the only
uppercase is tiny mono meta-tags — eyebrows, page numbers, dates.

say it the way you'd say it on a call. if a sentence couldn't survive being
said out loud, cut it. no exclamation points, no emoji, no decorative stats.
light wit, never jokes. specific always beats vague — "+35x organic traffic"
beats "drives results."

first-person plural ("we") — small studio, not solo freelancer. start with what
we do, not what we don't ("not just a pretty site" framing is banned).

**never use:** growth hacks · synergy · unlock · transform · elevate · leverage ·
cutting-edge · full-service · end-to-end · seamless · empower · digital
solutions · world-class · passionate about · take your brand to the next level ·
"in today's digital landscape"

**verified proof points (the only stats we cite):** 8 years experience ·
35x organic traffic growth · 3x inbound leads after launch · 8 weeks strategy
to live. no other numbers unless a client can stand behind them.

## 2. Design taste & patterns

editorial, classy, chic. magazine-spread energy — asymmetric layouts, generous
whitespace, type-driven composition. never a page that reads as a stack of
generic "website sections." this is the signal that we're targeting high-value
clients.

**layout:** left-aligned everything. 1200px max width, 48px desktop gutter,
4px baseline grid. 8px spacing scale (8/16/24/32/48/64). section gaps 48–72px.
card padding 24px. if a layout feels balanced, take something out.

**type:** syne for display (400/500/700/800, always lowercase), inter for body
(300/400/500), jetbrains mono for meta only — eyebrows, page numbers, dates,
file ids, uppercase 0.10–0.18em, 9–13px. never mono for paragraphs. one display
step per layout; supporting headlines drop a full step. never mix syne weights
mid-line — colour does emphasis, not weight.

**colour:** bone #F4F1EA (primary canvas) · stone #E7E2D6 · ink #181612 ·
ink-mid #6F6A5F · oxblood #6B1421 (sole accent). on ink canvases: oxblood-tint
#C58A92, warm-gray #9B948A. oxblood is punctuation — one word per headline,
eyebrows, stat numerals. never a wash, never a background for body copy. if a
design feels colourful, it's wrong.

**details:** 6px radius everywhere (pills 999px for status tags only). 1px
strokes, never 2px+ — the one exception is the 2px oxblood left-rail on pull
quotes. hairlines at rgba(24,22,18,0.12) on light, rgba(244,241,234,0.18) on
ink. film grain on by default — 6% multiply on bone/stone, 4% screen on ink.
off for thumbnails <48px, email signature, and third-party cms.

**the signature beat:** tiny oxblood eyebrow → big lowercase headline → one
oxblood word. eyebrow = 3px oxblood left bar, mono 11px, 0.06em tracking. no
brackets, no numbering.

**buttons:** three styles — dark fill, oxblood fill, outlined. always visible
without hover, always with an arrow.

**recurring patterns:** top rail (wordmark left, mono meta right, 1px hairline) ·
oversized stat (one number, one sentence, whole layout) · numbered rows (mono
numerals in oxblood, hairlines top & bottom) · image with floating semi-
transparent ink text plate — never text directly on photo · pull quote (syne 500
sentence case, curly quotes, 2px oxblood rail, mono attribution).

**imagery:** still lifes and textures only. never faces, never ai subjects,
never stock people. oxblood velvet, cream linen, fountain pens, espresso,
hand-bound notebooks. medium-format feel, subtle grain, slightly desaturated,
graded to oxblood / cream / stone / warm near-black.

**off-brand / dated:** drop shadows · gradients · glassy buttons · neon glow ·
title case in sales copy · oxblood-wash backgrounds · centred body layouts ·
pure black backgrounds · anything that fills every corner.

✏️ *open: 2–3 named live reference sites with one line each on why. fastest way
to sharpen every downstream skill.*

## 3. Tech stack & build preferences

- **build:** react / next.js (app router) + typescript. vite for standalone 3D
  or experimental builds.
- **editor / agent:** vs code + claude code. sonnet as the workhorse for
  iterative component building, opus for architecture and complex 3D/animation,
  haiku for trivial edits and file ops.
- **motion / 3D:** gsap + scrolltrigger, lenis for smooth scroll, react three
  fiber + drei, @react-three/postprocessing. framer motion for ui transitions.
- **deployment:** railway. github repo sarahislam1711/sarahdigs, deployment
  branch `rebuild` — never push straight to `main`.
- **database:** postgresql.
- **cms:** headless wordpress (phase two). until then, content ships in-repo.
- **forms:** tally.
- **design:** canva for collateral (brand kit `kAG5-bN_N0Y`). logo files
  uploaded directly — never generate the mark.

build specs are written in next.js vocabulary. mobile fallback is specced at
the same time as the desktop 3D build, never after.

✏️ *open: analytics choice (ga4 / plausible / fathom?), and anything flatly
refused as a build target. also confirm "webflow development" is retired from
the positioning doc's build phase — treat as dead until confirmed otherwise.*

## 4. Writing & content rules

- copy communicates **outcomes**, never tasks or deliverables. deliverable
  lists live on the dedicated service page, never in marketing copy.
- lowercase everything. sentence-case ctas: "book a call →" not "Book A
  Strategy Call."
- short sentences. cut three lines before adding one. every word does a job.
- no repetition across sections — if the hero says it, the about section
  doesn't. each section has one job.
- no ai-sounding copy. if it reads like chatgpt wrote it, rewrite it.
- ctas are plain and direct, always paired with an arrow.
- client copy carries the client's brand voice; these rules govern structure,
  specificity, and the ban on filler — not their tone.

✏️ *open: us or uk english as the default — source docs mix "colour" and
"optimisation" inconsistently.*

## 5. SEO / AEO standards

the bar: pasting any url into chatgpt, claude, perplexity, gemini, or google
ai overviews returns an accurate, specific summary. all five platforms get
named in any content about ai search.

on top of the generic baseline:

- **json-ld is the load-bearing layer.** reusable `JsonLd` component. root
  entity with a stable `@id`; every page links back via
  provider/publisher/author instead of duplicating. schema must match visible
  content — mismatches read as manipulation.
- **`/llms.txt` is hand-written in the editor's voice.** never generated from
  the sitemap. `/llms-full.txt` optional for depth.
- **robots.txt explicitly allows** gptbot, claudebot, perplexitybot,
  google-extended, ccbot, googlebot, bingbot. opting out is a flagged decision,
  never silent.
- **metadata via a `buildPageMetadata()` utility** — titles 50–60 chars
  `"[page] | [brand]"`, descriptions 150–160, canonical, hreflang + x-default,
  og image 1200×630 absolute, twitter summary_large_image.
- **ssr or static-generate anything discoverable.** nothing that matters lives
  behind client-side rendering. (sarahdigs.com currently fails this — js-
  rendered, returns near-empty to crawlers. fix before launch.)
- **semantic html, no div-soup.** one descriptive h1, no skipped heading levels,
  `<time datetime>` in iso 8601, real `<article>` / `<nav>` / `<figure>`.
- faqs in real q&a format with FAQPage schema. author + updated-date on all
  editorial.
- validate with rich results test + schema.org validator before every deploy.
- **internal links:** natural inline anchor text only. no bracketed url
  references, no "read more" callouts outside body copy.
- **blog:** each post owns one angle. overlapping concepts get a one-line
  mention plus an anchor link — never a duplicated section. formats vary across
  a cluster (listicle, how-to, guide, opinion, diagnostic).
- **featured images:** webp, 1200×630, under 150kb, descriptive filename,
  keyword-rich alt. two-word or short punchy copy only — never the full title.
  layouts alternate across a cluster.

## 6. QA & launch bar

- lighthouse 90+ across all four categories.
- core web vitals in "good": lcp <2.5s, cls <0.1, inp <200ms. fcp <1.5s on
  mid-range mobile.
- wcag aa: alt text everywhere, 4.5:1 / 3:1 contrast, full keyboard nav,
  visible focus, `prefers-reduced-motion` respected, labelled forms, screen-
  reader passed (voiceover + nvda).
- 3D specifically: 50fps floor, mobile fallback verified, no missing useEffect
  cleanup on scroll/mouse listeners, geometry and materials memoised.
- share cards render correctly in whatsapp, slack, imessage, linkedin.
- rich results test clean on every page type.
- usable on slow 3G.
- the small stuff: favicon set, 404 page, thank-you page, form success states,
  legal pages, redirects from old urls.

✏️ *open: device/browser matrix actually tested on, and any recurring catches
not already listed above — this section was drafted from other docs and needs
sign-off.*

## 7. Deliverable formats

- sequential, one thing at a time. no large structured dump up front.
- explain **why** before executing — rationale first, then the artifact.
- paste-ready output. no horizontal dividers between sections (breaks cms
  paste). clean markdown.
- prose for reasoning, tables only when comparing across the same criteria.
- when handed an existing document or system: **edit surgically.** minimal
  targeted intervention, structure and prose preserved. never rebuild.
- open questions get asked one at a time, not as a batch.

✏️ *open: do build specs carry time estimates? roughly how long should a dig
brief feel — 2 pages or 10?*

## 8. Business rules

- max ~4 active clients. quality over volume.
- no execution without clarity. no strategy that can't be implemented.
- retainers are never shown on the website. introduced post-booking, in the
  proposal.
- pricing is never on the website. proposals and calls only.
- **walk away from:** wants immediate results · shifting or unclear goals ·
  expects "just content" without strategy · no internal resources to support
  implementation · low budget, high demand.
