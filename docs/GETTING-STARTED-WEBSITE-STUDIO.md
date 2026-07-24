# Getting Started As A Website Studio

**Scenario this document covers:** you build websites for clients. You have signed up, created a
brand and a project, and you want to know what to put into the system so it runs your builds —
discovery through launch — instead of just holding a to-do list.

This is a setup and verification runbook. Each step says what to bring in, where it goes, and how to
confirm it took. Work top to bottom; later steps depend on earlier ones.

> The sibling document [GETTING-STARTED-FIRST-CLIENT.md](GETTING-STARTED-FIRST-CLIENT.md) covers the
> social-media and content-operations path. If you do both, read that one too — brand setup is shared
> and is not repeated here in full.

---

## Table of contents

1. [The mental model](#1-the-mental-model)
2. [Before you start: the one-time setup that decides everything](#2-before-you-start-the-one-time-setup-that-decides-everything)
3. [Step 1 — Set the client up as a brand](#step-1--set-the-client-up-as-a-brand)
4. [Step 2 — Create the project and see what appears](#step-2--create-the-project-and-see-what-appears)
5. [Step 3 — Work the phase checklists](#step-3--work-the-phase-checklists)
6. [Step 4 — Deliverables: designs, files, and Figma](#step-4--deliverables-designs-files-and-figma)
7. [Step 5 — The client review loop](#step-5--the-client-review-loop)
8. [Step 6 — The creation pipeline](#step-6--the-creation-pipeline)
9. [Step 7 — Run one page all the way through](#step-7--run-one-page-all-the-way-through)
10. [The rhythm of a build](#the-rhythm-of-a-build)
11. [Verification checklist](#verification-checklist)
12. [Known gaps as of this document](#known-gaps-as-of-this-document)

---

## 1. The mental model

A website build uses a different spine than content work. Five objects:

| Object | What it represents | Where it lives |
| --- | --- | --- |
| **Brand** | The client company — identity, assets, contacts, knowledge, portal access | `/brands` |
| **Project** | One website build. Type **Web Build** is what turns on phases and deliverables. | `/projects` |
| **Phase** | A stage of the build. Created automatically from your workflow template when the project is created. | Project → **Phases** |
| **Task** | A checklist item inside a phase. Some are **gates** — the approvals that release the next stage. | Project → Phases / Tasks |
| **Deliverable** | The artifact attached to a task: a wireframe, mockup, prototype, code, document, or asset. Versioned. | Task detail → **Deliverable** tab |

The chain: **Brand → Project → Phase → Task (some are gates) → Deliverable → client approval.**

There are two layers, and it is worth being clear which one you are in at any moment:

- **The management layer** — this app. Phases, gate tasks, deliverables, approvals, the portal. It
  tracks *that* the work happened.
- **The creation layer** — the website pipeline (section 6). Six Claude Code skills that do the
  first-draft creation work: research, sitemap, copy, design direction, build spec, QA. It produces
  *what* you then build from.

They are deliberately loosely coupled. You can run the management layer alone. The pipeline plugs
into it, one skill per phase, one approval gate per phase.

---

## 2. Before you start: the one-time setup that decides everything

### 2a. Which phase template your organization gets

**This is the single most consequential setup decision, and it is invisible in the UI.**

When you create a Web Build project, the app looks for a default workflow template for your
organization, and falls back to the shared system default if you have none. The two give very
different results:

| | System default (what you get out of the box) | Studio template (org-owned) |
| --- | --- | --- |
| Phases | Discovery → Wireframe → Design → Development → Testing → Launch | Onboarding → Dig → Design → Build → Launch → Optimize |
| Tasks seeded | **None** — six empty phases | **Full checklist per phase**, auto-created |
| Gates | None | Explicit `GATE —` tasks at each phase boundary |

The studio template is installed by running the org-scoped migration against your organization:

```bash
psql "$DATABASE_URL" -v org_slug='your-org-slug' -f supabase/migrations/031_website_build_workflow.sql
```

It resolves your organization by slug and **aborts if the slug is missing or unknown** — it will
never silently fall back to the shared default, and it never modifies the shared default, so other
tenants on the same deployment are unaffected.

Once installed, creating a Web Build project seeds roughly thirty checklist tasks across the six
phases automatically, including the gate tasks. Without it you get six empty phases and you are
writing your own methodology from scratch every time.

> Decide this **before** creating real projects. Projects created under the system default keep the
> phases they were born with — installing the template later does not retrofit them.

### 2b. Platform capabilities

Org-wide, set once. Each is a silent failure if missing — the feature does nothing rather than
erroring.

| Capability | Requirement | Symptom when missing |
| --- | --- | --- |
| AI features (briefs, SEO research, competitor analysis) | `ANTHROPIC_API_KEY` | AI tools error or return nothing |
| Semantic search + knowledge base recall | `OPENAI_API_KEY` (embeddings) | Documents upload but never become searchable |
| **Figma import** | `FIGMA_CLIENT_ID` / `FIGMA_CLIENT_SECRET` | Connect button fails at OAuth |
| **File and image uploads** | `R2_*` credentials, **plus the bucket's CORS allowing your app origin**, plus a genuinely public `R2_PUBLIC_URL` | Uploads fail outright, or succeed and render as broken images |
| Kickoff call recording | `LIVEKIT_*`, `DEEPGRAM_API_KEY` | Meetings work, transcripts never appear |
| Notification delivery + digests | `CRON_SECRET` plus a scheduler on `/api/cron/process-queue` and `/api/cron/digest` | Queued notifications never arrive |
| Email in the project Emails tab | `GOOGLE_CLIENT_ID`/`SECRET` or `MICROSOFT_CLIENT_ID`/`SECRET`, plus `EMAIL_ENCRYPTION_KEY` | No mailbox can be connected |

Uploads deserve a note, because a website studio leans on them constantly — mockups, exports, brand
assets, handoff documents. Files go **browser → Cloudflare R2 directly** through a presigned URL, so
the bucket's CORS policy must list the origin the app is served from. A bucket that only allows
`localhost` works perfectly in development and fails for every real user. Separately, `R2_PUBLIC_URL`
must be a public bucket URL (an `r2.dev` address or a custom domain) — the S3 API endpoint will not
serve images to a browser.

Scheduled *publishing* and the social OAuth apps matter far less here than on the content side — you
are not posting to platforms. If you do no social work at all, you can ignore them.

### 2c. Connect Figma

**Settings → Apps & Integrations → Connect Figma** (admin only). This is what lets you pull a frame
straight into a task as a deliverable, with a live embed and a thumbnail, instead of exporting PNGs
by hand. Do it once for the organization.

---

## Step 1 — Set the client up as a brand

**Where:** `/brands/{brand}/edit`, then the tabs on `/brands/{brand}`.

For a website build the brand carries less weight than it does for social work — you are not
publishing to platforms — but four things matter a great deal.

- **Basics.** Name, description, and **website URL**. The URL is what competitor and SEO research
  point at, and for a redesign it is the thing being replaced.
- **Logo.** Upload it on the brand form. It appears on the brand and project headers.
- **Contacts.** Who signs off, who supplies content, who holds the domain and hosting credentials.
  Website projects stall on exactly these people.
- **Assets.** Logo files, brand guide, photography, existing copy. The Onboarding phase has a task
  for collecting these; this is where they live once collected.
- **Knowledge Base.** The client's brand book, existing site content, product one-pagers, past
  analytics. This is what the AI tools and the pipeline's research step read from.

You can skip **Platforms** and the **Social** tab entirely unless the same client also wants social
work. See the sibling document if they do.

---

## Step 2 — Create the project and see what appears

**Where:** `/projects/new`. Type: **Web Build**.

Creating it does more than make a row. In one shot the app also:

- **Creates the phases** from your workflow template, in order. With the studio template installed,
  a database trigger then seeds each phase's checklist tasks — including the `GATE —` tasks — as it
  goes.
- **Creates a meeting room** for the project, reachable from the **Room** button, with its own
  shareable `/meet/{slug}` link for client calls.
- **Creates a project chat channel**, so build discussion has a home and decisions marked in chat
  surface on the project Overview.

Set **start and end dates** — the Timeline view draws from them — and leave status **Active**.

**Choosing the type.** Web Build gives you phases and the task **Deliverable** tab. If this client
also wants ongoing social or blog content, use **Full Service** instead: it gives phases *and* the
kanban board, content items, and the publishing queue. You cannot add the content side later without
changing the project type, so decide now.

**Verify:** the project detail page shows a **Phases** tab. Open it — you should see your six phases,
each with its checklist underneath. If the phases are empty, you are on the system default template;
go back to [2a](#2a-which-phase-template-your-organization-gets).

---

## Step 3 — Work the phase checklists

**Where:** project → **Phases** (or the **Tasks** / **List** tabs for a flatter view).

With the studio template, the checklist already encodes the methodology. Onboarding collects the
questionnaire, assets, and credentials and holds the kickoff. Dig produces the competitor scan,
search landscape, conversion goals, and the Dig Brief. Design runs moodboard → homepage → remaining
pages → two revision rounds. Build develops, loads content, runs the SEO/AEO checklist and internal
QA, then two staging reviews. Launch is the pre-launch checklist and go-live. Optimize is the 30-day
window and handoff package.

Two things to do to every seeded task:

- **Assign it.** Unassigned tasks appear in nobody's workload and generate no notifications.
- **Date it.** Due dates drive the calendar, the timeline, the overdue counter, and reminders.

### The gate tasks

Tasks whose title starts with `GATE —` are the approval boundaries, and they are seeded at a higher
priority so they sort to the top. They are the commercial spine of the process:

| Phase | Gate | What it protects |
| --- | --- | --- |
| Onboarding | Questionnaire + assets received, kickoff held | Nothing starts on a client stall |
| Dig | Written approval of the Dig Brief | **Approved sitemap freezes scope** — new pages become change orders |
| Design | Written approval of all page designs | Later design changes become change orders |
| Build | Written launch approval + final invoice paid | No launch before payment clears |

Treat a gate as done only when the client's written approval exists — which, in this system, means
they approved it in the portal (Step 5).

### Moving a phase along

Each phase's status badge is a menu: click it and pick **Not started**, **In progress**,
**Completed**, or **Skipped**. Manager and admin only — everyone else sees a plain badge, matching
the permission on the underlying procedure.

Phase status is deliberately manual and does not follow task completion. The progress bar under each
phase fills automatically as its tasks are marked done or approved; the *status* is your declaration
that the stage is genuinely finished — normally when its gate task has the client's written approval.
Marking a phase completed does not start the next one; advance that one yourself when work actually
begins.

This is what your client sees as progress in the portal, so keep it current.

---

## Step 4 — Deliverables: designs, files, and Figma

**Where:** open a task → **Deliverable** tab. (This tab appears only on Web Build and Full Service
projects.)

A deliverable is the artifact the task produces. Types: wireframe, mockup, prototype, code, document,
asset, other. Each has a status — draft, in review, approved, rejected, final — and every upload
creates a **new version**, with a change note, so you can show what moved between revision rounds.

Two ways to attach one:

- **Upload a file** — the exported design, a PDF, a spec document, a zip.
- **Import from Figma** — browse your Figma teams, projects, and files in-app, and pull a file or a
  specific frame straight in. You get a live embed and a thumbnail that can be refreshed, so the task
  always shows the current state of the frame rather than a stale export.

For a design-led studio the Figma path is the point: the design lives where you designed it, and the
task points at it rather than duplicating it.

**Verify:** the Deliverable tab shows the embed or file, with a version number, and the version
history lists your change notes. If an upload fails, check the storage prerequisites in
[2b](#2b-platform-capabilities) before anything else — bucket CORS is the usual culprit.

---

## Step 5 — The client review loop

**Where:** **Brand → Client Access** to grant it; `/portal` is what they see.

The portal is where the gates actually get satisfied. Your client signs in, sees only their brand,
and approves or requests changes — and those actions move your tasks.

**Grant access:** the client must already have an account. `Grant Access` looks up an existing user
by email and fails with "No user found with that email" otherwise. There is no client invitation
flow. So: they sign up at `/signup`, then you grant that email under Brand → Client Access.

**How a review reaches them:** move the task to **Client Review**. Anything in that status, on a
project belonging to their brand, appears in their portal queue with Approve and Request Changes.

- **Approve** → the task moves to **Approved**, with their comment attached.
- **Request Changes** → the task moves back to **In Progress**, with their note attached. That is
  your revision round, recorded.

**What the client actually sees, and what to do about it.** The portal renders the task's **title and
description**. It does not render the deliverable — no Figma embed, no file, no annotation view. So
for design and staging reviews, **put the link in the task description**: the Figma prototype URL,
the staging URL, whatever they are meant to look at. Without it they will be approving a title.

The portal also shows a **milestones** view per project: your phases, in order, with a progress
figure driven by the phase statuses you set in Step 3.

---

## Step 6 — The creation pipeline

Everything above is the management layer. The pipeline is the creation layer: six Claude Code skills
that do the first-draft work of the build, each producing one artifact, each stopping for your
review.

It is **assisted, not autonomous**. Skills 1–5 produce drafts and specs; a human builds the site.
Skill 6 audits what was built. Nothing is sent to a client automatically and nothing advances without
your explicit approval.

### The six stations

| # | Skill | Produces | Phase |
| --- | --- | --- | --- |
| 1 | `dig-research` | Dig Brief — competitor scan, search/AEO landscape, audience, positioning | Dig |
| 2 | `strategy-sitemap` | Sitemap + page-by-page content plan + conversion goals | Dig → Design boundary |
| 3 | `content` | First-draft copy for every page, on-brand and AEO-structured | Design |
| 4 | `design-direction` | Style direction + section-by-section layout spec | Design |
| 5 | `build-spec` | Build-ready spec — components, pages, tech notes, asset list | Build |
| 6 | `seo-aeo-qa` | Pre-launch SEO/AEO and QA checklist, filled in against the built site | Build → Launch |

### Three layers of input — say everything exactly once

This is the part that saves the most time, and the part people get wrong by repeating themselves:

| Layer | Lives in | Filled in |
| --- | --- | --- |
| **Studio standards** — your voice, design taste, tech stack, QA bar | `shared/studio-profile.md` | **Once, ever.** Every skill reads it automatically. |
| **Client identity** — brand voice, colors, personas, competitors | This app — Brand page + Knowledge Base | Once per client, then pasted into the questionnaire's brand-kit section |
| **This project** — goals, must-haves, deadline | `pipeline/inputs/questionnaire.md` | Once per project |

Starting a project means copying the onboarding questionnaire into `pipeline/inputs/`, pasting the
client's brand kit from this app into section A, and answering section B fresh. For a brand-new
client, fill section A by hand — then enter it into the app so next time it is a paste.

### Running it

The operator runs the orchestrator from the project's working directory. It is plain Node with no
dependencies, and it does routing and state only — zero content generation.

```bash
node <path-to>/orchestrator.mjs start --project-id <project-uuid> --brand-id <brand-uuid> --name "Acme Co Website"
```

That seeds `pipeline/state.json` with the six steps, creates `pipeline/artifacts/` and
`pipeline/inputs/`, and tells you to run skill 1. From then on the loop is:

1. Run the current skill — it reads the state file and inputs, writes one artifact.
2. `orchestrator.mjs submit --artifact artifacts/<file>.md` → the step becomes `awaiting_review`.
3. Review the artifact, then one of:
   - `orchestrator.mjs advance` — approve; next step goes live.
   - `orchestrator.mjs revise --note "…"` — same skill re-runs with your notes; revision count goes up.
   - `orchestrator.mjs stop` — pause; state persisted.
4. `orchestrator.mjs status` shows exactly where you are.

**Revision accounting** matches the commercial rule: two rounds per step are included. A third is a
billable extra round — `revise` refuses it and prints a confirmation prompt you must re-run with
`--confirm-billable`. Counts live in the state file and survive stop/resume.

**Stop and resume** is the whole point of the state file. Close everything, come back days later,
`cd` into the project directory, run `status` — it resumes at the exact step with revision counts
intact. It never infers position from the conversation.

### How it talks back to this app

Sync is controlled by `PIPELINE_BRANDFLOW_SYNC`, and **the v1 default is `manual`, which performs
zero database access**. It prints the intended phase/gate/task update — also to
`pipeline/brandflow-sync.log` — for you to action inside the app, where you are already authenticated
and scoped to your organization. So expect to mirror approvals by hand: the pipeline tells you
"mark the Dig gate done," and you tick the gate task here.

`api` mode is specified but deliberately not built; it throws rather than falling back to an unsafe
write.

The mapping it follows:

| Step | Phase | Approval closes a gate? |
| --- | --- | --- |
| 01-dig-research | Dig | no |
| 02-strategy-sitemap | Dig | **yes** — sitemap approval freezes scope |
| 03-content | Design | no |
| 04-design-direction | Design | **yes** |
| 05-build-spec | Build | no |
| 06-seo-aeo-qa | Build | **yes** — launch-ready |

### Getting the pipeline onto your machine

The canonical source lives in this repo at `pipeline/website-build/`, where it evolves alongside the
app. Operators do **not** get the app's source: distribution is a separate private repo containing
only the pipeline folder, an `install.sh` that registers the six skills into `~/.claude/skills/`, and
a non-technical getting-started guide. Update with `git pull` and re-run `install.sh`.

If you are editing the pipeline, edit it here and sync outward — changes made directly in the
distribution repo get overwritten on the next sync.

---

## Step 7 — Run one page all the way through

Do this once on a test project before a real client is watching.

1. **Create a Web Build project** and confirm the phases and checklists appeared.
2. **Work an Onboarding task** — assign it, date it, mark it done.
3. **Attach a deliverable** to a Design task — import a Figma frame or upload a mockup.
4. **Put the deliverable's link in the task description**, then move the task to **Client Review**.
5. **Approve it from the portal** as the client. The task should land in **Approved**.
6. **Request changes on a second one** and confirm it returns to **In Progress** with the comment
   attached.
7. **Upload a revised version** of the deliverable with a change note, and confirm the version
   history shows both.
8. **Mark the phase completed** and confirm the portal's milestone progress moves.

**Verify:** every transition above happened without you touching the database, and the client account
never saw anything outside their own brand.

---

## The rhythm of a build

| Cadence | Where | What |
| --- | --- | --- |
| Daily | `/dashboard` | What is due, overdue, and awaiting review |
| Daily | Project → **Phases** | Where the build actually is |
| Per stage | Project → **Room** | Client calls, with a shareable guest link |
| Per stage | Portal | Gate approvals — the only place they count |
| Weekly | `/timeline` | Project dates across the book of work |
| Weekly | Project → **Chat** | Build discussion; decisions surface on the Overview |
| Monthly | `/analytics` | Throughput and workload across projects |

`/analytics` reports on your delivery — tasks, projects, phases. It is not website analytics: no
traffic, rankings, or Core Web Vitals come back into the system. The Optimize phase's monitoring
tasks are prompts to go look at Search Console yourself.

---

## Verification checklist

**Organization**

- [ ] Studio workflow template installed for your org (six phases with checklists, not six empty ones)
- [ ] Figma connected under Settings → Apps & Integrations
- [ ] `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` present if you want AI and knowledge base search
- [ ] A test file uploads successfully **from the deployed site**, not just localhost, and displays

**Client brand**

- [ ] Description and website URL set
- [ ] Logo uploaded
- [ ] Contacts added — approver, content supplier, credential holder
- [ ] Brand guide and photography uploaded to Assets
- [ ] Existing site content and brand book in the Knowledge Base, and searchable

**Project**

- [ ] Type is **Web Build** (or Full Service if they also want content)
- [ ] Phases tab shows your six phases with checklists underneath
- [ ] Gate tasks present at each phase boundary
- [ ] Every task assigned and dated
- [ ] Start and end dates set on the project

**Client**

- [ ] Client has an account and appears under Brand → Client Access
- [ ] Client has logged into `/portal` and sees only their brand
- [ ] One task taken through Client Review → Approved from the portal
- [ ] Review tasks carry the Figma or staging **link in the description**
- [ ] Portal milestone progress reflects the phase statuses you have set

**Pipeline** (if you are using it)

- [ ] Skills installed via `install.sh` into `~/.claude/skills/`
- [ ] `shared/studio-profile.md` filled in once
- [ ] `pipeline/inputs/questionnaire.md` filled per project, section A pasted from the brand
- [ ] `orchestrator.mjs status` reports the right step after a stop and resume
- [ ] You know that sync is `manual` and gates must be ticked here by hand

---

## Known gaps as of this document

Verified against the codebase on 2026-07-24. Each of these has a working backend behind it — the
wiring is what is missing.

### 1. ~~Phase status cannot be changed anywhere in the UI~~ — fixed

Phases were created as `not_started` with no control anywhere to advance one — the Phases view called
no phase mutation at all. Because the client portal computes project progress as
`completed phases ÷ total phases`, every client saw *"0 of 6 phases complete"* and 0% for the entire
build.

**Fixed:** the status badge in the Phases view is now a menu (manager and admin only) covering all
four statuses, wired to the existing `phase.update`. Portal progress now moves as you complete
phases.

Still unwired on the same procedure: **milestone name and date**. `phase.update` accepts both, and
the portal renders a milestone name when one is present, but no UI sets them — so the milestone line
stays empty. Phase create, reorder, and delete are also uncalled; phases remain whatever the workflow
template created.

### 2. Design annotations are built but unreachable

Pinned feedback on a deliverable — pin, rectangle, or arrow, placed at a percentage position so it
survives resizing, with a body and a version number — is fully implemented in the API, and
`AnnotationOverlay` and `AnnotationSidebar` are both written. Neither is imported anywhere.

This matters more here than anywhere else in the app: the seeded Design phase checklist explicitly
says revision rounds are *"portal annotations only, consolidated."* That workflow cannot currently
happen. Design feedback has to go in task comments as prose instead.

### 3. The client portal does not show deliverables

The portal review queue renders a task's title and description, and content items when present. It
has no deliverable rendering at all — no file, no Figma embed, no version history. A client reviewing
a design sees a task title.

Hence the instruction in Step 5 to put the Figma or staging link in the task description. It works,
but it is a workaround.

### 4. The intake → brief → task chain cannot be started

The **Intake & Briefs** tab extracts structured intake from a completed meeting that has a
transcript, generates a brief per service, then generates tasks from it. The chain is implemented,
but nothing in the UI ever writes a transcript to a meeting: `/api/transcribe` does exactly that and
has no caller, and the transcript import feature writes to meeting *sessions*, a different table the
extractor does not read.

For a website studio this matters less than elsewhere — the phase checklists already give you the
task list the intake chain would have generated, and the pipeline's Dig skill covers the research.
But it does mean the kickoff-recording-to-brief shortcut is unavailable.

### 5. Analytics is internal delivery data only

Covered above: no site traffic, rankings, or performance metrics flow back into the system.

---

*Item 2 is the one to fix next — it is wiring two existing components into the deliverable panel, and
it is what the Design phase checklist already assumes exists.*
