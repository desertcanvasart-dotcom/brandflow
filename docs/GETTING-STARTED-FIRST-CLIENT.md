# Getting Started With Your First Client

**Scenario this document covers:** you have signed up, created a brand and a project, and you are
looking at a mostly empty screen wondering what to do next. Your client has hired you to run their
social media accounts and produce content for their website.

This is a setup and verification runbook. Each step says what to put into the system, where to put
it, and how to confirm it took effect. Work top to bottom — later steps depend on earlier ones.

> Read [USER-WALKTHROUGH.md](USER-WALKTHROUGH.md) if you want a screen-by-screen reference of every
> feature. This document is the opposite: the shortest path from empty to operating.

---

## Table of contents

1. [The mental model](#1-the-mental-model)
2. [Before you start: what the platform needs from your admin](#2-before-you-start-what-the-platform-needs-from-your-admin)
3. [Step 1 — Finish the brand](#step-1--finish-the-brand)
4. [Step 2 — Teach the system the client's voice](#step-2--teach-the-system-the-clients-voice)
5. [Step 3 — Load the reference material](#step-3--load-the-reference-material)
6. [Step 4 — Set the project up correctly](#step-4--set-the-project-up-correctly)
7. [Step 5 — Fill the project with tasks](#step-5--fill-the-project-with-tasks)
8. [Step 6 — Bring your team in](#step-6--bring-your-team-in)
9. [Step 7 — Give the client a way in](#step-7--give-the-client-a-way-in)
10. [Step 8 — Run one post all the way through](#step-8--run-one-post-all-the-way-through)
11. [The weekly rhythm once you are live](#the-weekly-rhythm-once-you-are-live)
12. [Verification checklist](#verification-checklist)
13. [Known gaps as of this document](#known-gaps-as-of-this-document)

---

## 1. The mental model

Four objects carry everything. Get these straight and the rest of the app explains itself.

| Object | What it represents | Where it lives |
| --- | --- | --- |
| **Brand** | The client themselves — one brand per client company. Holds identity, voice, assets, social connections, and who from the client side can log in. | `/brands` |
| **Project** | One engagement for that brand. Has a type that decides which tabs and workflows appear. | `/projects` |
| **Task** | One unit of work. Carries an assignee, a due date, a status, and — on content projects — the actual post. | Project → Tasks / Board |
| **Content item** | The post itself: body, hashtags, media, platform, schedule. Always attached to a task. | Task detail → Content tab |

The chain is always the same: **Brand → Project → Task → Content item → published post.**

Everything a task does is driven by its **status**, which is also the approval workflow:

```
Backlog → To Do → In Progress → Internal Review → Client Review
       → Approved → Scheduled → Publishing → Published
```

`Blocked` and `Done` sit outside that line. Three of these transitions are not manual — the system
moves the task for you:

- Scheduling a content item moves its task to **Scheduled**.
- The publish cron claims **Scheduled** tasks and moves them to **Publishing**, then **Published**.
- A client approving in the portal moves the task from **Client Review** to **Approved**; requesting
  changes moves it back to **In Progress**.

That is the machine. The rest of this document is about giving it the inputs it needs.

---

## 2. Before you start: what the platform needs from your admin

These are organization-wide and set once. If you are on the hosted version at agencybeats.com most
are already done, but every one of them is a silent failure if missing — the feature simply does
nothing rather than showing an error.

| Capability | Requirement | Symptom when missing |
| --- | --- | --- |
| AI features (briefs, ad copy, SEO, reports) | `ANTHROPIC_API_KEY` | AI tools error or return nothing |
| Semantic search + knowledge base recall | `OPENAI_API_KEY` (embeddings) | Documents upload but never become searchable |
| **Scheduled publishing** | `CRON_SECRET` **and** an external scheduler hitting `/api/cron/publish-scheduled` | Posts sit in Scheduled forever and never go out |
| Notification delivery + digests | Scheduler hitting `/api/cron/process-queue` and `/api/cron/digest` | Queued notifications never arrive |
| Social publishing | `META_APP_ID`/`SECRET`, `TWITTER_CLIENT_ID`/`SECRET`, `LINKEDIN_CLIENT_ID`/`SECRET` | The connect buttons fail at the OAuth step |
| Email in the project Emails tab | `GOOGLE_CLIENT_ID`/`SECRET` or `MICROSOFT_CLIENT_ID`/`SECRET`, plus `EMAIL_ENCRYPTION_KEY` | No mailbox can be connected |
| Meeting recording → transcript | `DEEPGRAM_API_KEY`, `LIVEKIT_*` | Meetings work, transcripts never appear |

> **The cron one matters most for your use case.** Deployment here is Railway, and `railway.toml`
> does not define any scheduled jobs. Scheduling a post writes a row and waits for
> `/api/cron/publish-scheduled` to come along. If nothing is calling that endpoint on a timer,
> nothing will ever publish. Confirm this before you promise a client a posting calendar.

---

## Step 1 — Finish the brand

**Where:** `/brands/{brand}/edit`, then the tabs on `/brands/{brand}`.

The brand is the single most load-bearing record in the system. A thin brand produces thin AI output
and blocks publishing outright.

### 1a. Brand basics — required

Go to **Edit** and fill in:

- **Name** and **description** — the description is fed to the AI tools as context.
- **Website URL** — needed for competitor and SEO analysis, and it is where the website content
  work points.
- **Platforms** — ✅ **this is the one people miss.** Tick every platform this client publishes on:
  Instagram, Facebook, X (Twitter), LinkedIn. **A platform that is not ticked here cannot be
  connected and cannot be published to.** The social connection cards are generated from this list.

### 1b. Contacts

**Brand → Contacts.** Add the client's real people — who approves content, who to chase for assets.
This is your record of who is who; it is separate from portal login access (Step 7).

### 1c. Guidelines

**Brand → Guidelines.** Add brand colors (name, hex, usage) and fonts (name, usage). This tab also
collects notes you save out of the AI tools, so it becomes the accumulated brand knowledge over time.

### 1d. Assets

**Brand → Assets.** Upload the logo, product photography, and any recurring creative. These are what
your team attaches to posts; without them every task stalls waiting on a file from the client.

### 1e. Connect the social accounts

This is what turns the platform from a planner into a publisher.

**Brand → Social.** You get one card per platform you ticked in step 1a. Each is a normal OAuth
handshake: click Connect and authorize on the platform.

- **Facebook / Instagram** — if your Meta account manages one Page it is selected automatically. If
  it manages several, you are returned to this tab with a picker listing them; choose the Page for
  this brand. A linked Instagram business account is connected at the same time.
- **X (Twitter)** — connects directly.
- **LinkedIn** — connects directly for a single company page, and falls back to personal-profile
  posting if you administer none. **If you administer more than one company page the connection
  cannot currently be completed** — see [section 13](#known-gaps-as-of-this-document).

**Verify:** `/settings?section=social-media` lists every brand with a green dot against each
connected platform. Anything grey is not connected and will not publish.

---

## Step 2 — Teach the system the client's voice

**Where:** `/ai` → **Brand Strategy**.

This is the highest-leverage twenty minutes in the whole setup, and it is easy to skip because
nothing forces you into it. Every AI tool reads this. Define:

- **Content pillars** — the 3–5 themes this client posts about, each with keywords.
- **Audience personas** — demographics, pain points, goals, preferred platforms.
- **Tone profile** — voice, tone, a do list, a don't list, and sample phrases. The sample phrases do
  most of the work in making generated copy sound like the client.
- **Objectives and KPIs** — what this engagement is being measured on.

**Verify:** open any AI tool (Ad Copy Generator, CTA Suggestions) and select the brand. A blue
**"Context loaded"** banner appears listing your pillars, personas, and tone. **No banner means the
AI is writing with no knowledge of your client** — it is not an error, just generic output.

---

## Step 3 — Load the reference material

**Where:** **Brand → Knowledge Base**, or the global `/knowledge-base`.

Put in whatever you would otherwise have to re-explain every week: the client's existing brand book,
past campaign results, product one-pagers, tone examples, FAQs. You can upload files, paste text, or
import from a URL.

Documents are embedded for retrieval, which powers semantic search and lets the AI answer from the
client's own material rather than from general knowledge.

**Verify:** the document's status turns to processed and it comes back when you search for a phrase
that appears inside it. If it uploads but never becomes searchable, `OPENAI_API_KEY` is missing.

---

## Step 4 — Set the project up correctly

**Where:** `/projects/{project}` → **Settings**, or `/projects/new` for the next one.

**Project type decides which tabs exist, and it is the decision most worth getting right.**

| Type | Gives you | Right when |
| --- | --- | --- |
| **Content Operations** | Kanban board, task **Content** tab, publishing queue | Social and content only |
| **Web Build** | Phase tracker, task **Deliverable** tab | Website only |
| **Full Service** | Both — board, phases, content, and deliverables | Social **and** website work in one project |

Your client is social media **plus** website content. That means either:

- **Full Service** — one project covering both, or
- **two projects** on the same brand — one Content Operations for social, one Web Build for the site.

Two projects keeps reporting clean and lets the website work finish and close while social runs on.
One Full Service project keeps everything in a single room. Either works; pick one deliberately,
because switching later means re-homing tasks.

> If your project is currently Content Operations and the website work needs deliverables and
> phases, change the type now — before you have tasks to move.

Also set, in the same dialog: **description**, **status** (`Active` — not `Draft`, which is the state
that makes a project look inert), and **start / end dates**, which is what the Timeline view draws.

---

## Step 5 — Fill the project with tasks

**Where:** project → **Tasks** tab.

An empty project is why the Overview reads 0/0/0/0. Three ways to fill it, in order of usefulness:

### From the task library (start here)

The system ships with a library of task templates across ten service types — social, content,
website, SEO, paid ads, email, branding, CRO, analytics, and strategy. Open the task drawer from the
Tasks tab, pick **Social** and **Content** (and **Website** if this project covers the site), and add
the templates that fit. Each template carries a phase, a type, and an estimated hours figure, so your
capacity numbers work from day one.

This is the reliable path. Use it.

### Manual tasks

**Create Custom Task** for anything the library does not cover — recurring monthly reporting, a
one-off campaign, client-specific rituals.

### From an AI-generated brief

There is a designed chain — meeting transcript → extracted intake → per-service briefs → generated
tasks — reachable from the project's **Intake & Briefs** tab. It needs a completed meeting that has a
transcript attached. **See [section 13](#known-gaps-as-of-this-document): there is currently no way
to get a transcript onto a meeting through the UI**, so treat this path as unavailable and use the
task library.

### Then, for every task

- **Assign it.** Unassigned tasks do not appear in anyone's workload and generate no notifications.
- **Give it a due date.** Due dates drive the calendar, the timeline, the overdue counter, and the
  reminder cron.
- **Estimate hours** if you want the Team Workload panel to mean anything.

**Verify:** the project Overview now shows a real task count, the Status Breakdown has bars, and Team
Workload lists people rather than "No tasks assigned yet."

---

## Step 6 — Bring your team in

**Where:** `/team` → **Invite**.

Invite by email with a role. The hierarchy is `admin > manager > creator > developer > viewer`.
**Inviting, changing roles, and removing members are admin-only** — a manager can run projects but
cannot grow the team.

| Role | Can |
| --- | --- |
| **Admin** | Everything, including org settings, integrations, and social disconnects |
| **Manager** | Create and edit projects, meetings, briefs; grant client portal access |
| **Creator** | Work tasks and content; cannot change project settings |
| **Developer** | Same working access, oriented to build work |
| **Viewer** | Read only |

Project settings, deletion, and client access grants are manager-and-above — a creator will not see
the **Settings** button on a project at all.

Pending invitations are listed on the same page, and can be cancelled there.

---

## Step 7 — Give the client a way in

**Where:** **Brand → Client Access**.

The portal is what makes approvals stop happening in email. Your client signs in, sees only their own
brand, reviews what is waiting, and approves or asks for changes — and those actions move the task
in your board automatically.

**The client must already have an account before you can grant access.** There is no client
invitation flow: `Grant Access` looks up an existing user by email address and fails with "No user
found with that email" otherwise. So the sequence is:

1. The client creates an account at `/signup`.
2. You grant that email access under **Brand → Client Access**.
3. They land on the portal at `/portal` and see the brand.

Note that `/signup` also creates an organization for whoever signs up. Portal access is granted per
brand and works regardless, but it does mean your client's account is not a member of your agency
organization — which is what you want, and also why they cannot be invited through `/team`.

**What the client sees:** content sitting in **Client Review** for their brand, with Approve and
Request Changes on each item, plus project milestones for active projects. Nothing else. They cannot
see other brands, your internal comments, or your board.

---

## Step 8 — Run one post all the way through

Do this once, end to end, before you onboard the client. It exercises every dependency above and
tells you exactly where your setup is thin.

1. **Create or pick a task** in the project. On a Content Operations or Full Service project the task
   detail panel has a **Content** tab.
2. **Open the Content tab and add a content item.** Choose the platform, write the body, add hashtags
   and media. Edits are versioned, so you can add a change note and roll back.
3. **Move the task to Internal Review.** Your team reviews on the board or in `/queue`.
4. **Move it to Client Review.** It now appears in the client's portal.
5. **Have the client approve.** The task flips to **Approved** and lands in the Approved column of
   `/queue`. If they request changes instead, it drops back to **In Progress** with their comment
   attached.
6. **Schedule it.** In `/queue`, drag from Approved to Scheduled and pick a time — or set the
   schedule on the content item directly. The task moves to **Scheduled** automatically.
7. **Publish.** Either wait for `/api/cron/publish-scheduled` to fire, or use **Publish Now** to push
   it immediately.

**Verify:** the item reaches the Published column, and the publish log on the item shows a success
with the platform's post ID. A failure is recorded there too, with a retry action — that log is the
first place to look whenever a post does not appear.

---

## The weekly rhythm once you are live

Once the above is in place, the app is designed around a weekly loop:

| Cadence | Where | What |
| --- | --- | --- |
| Daily | `/dashboard` | What is due, what is overdue, what needs review |
| Daily | `/queue` | Move approved work into scheduled slots |
| Weekly | `/calendar` | Look at the coming fortnight of content across platforms |
| Weekly | Project → **Chat** | Decisions logged in chat surface on the project Overview |
| Monthly | `/analytics` | Throughput, workload, content by platform and status |
| Monthly | `/ai` → Performance Report | AI narrative over that analytics data |

One expectation to set now: **`/analytics` reports on your delivery, not on the client's social
performance.** It counts tasks, projects, and content items in this system. It does not pull
impressions, reach, or engagement back from Instagram or LinkedIn. For those numbers you still go to
the platforms' own dashboards.

---

## Verification checklist

Walk this before you tell the client you are live. Every line is something that silently does
nothing if it is missing.

**Brand**

- [ ] Brand has a description and website URL
- [ ] **Platforms are ticked** for every network you will post to
- [ ] Client contacts added
- [ ] Colors, fonts, and logo/assets uploaded
- [ ] Social accounts connected — green dots at `/settings?section=social-media`

**Voice and knowledge**

- [ ] Brand Strategy has pillars, at least one persona, and a tone profile
- [ ] "Context loaded" banner appears in the AI tools for this brand
- [ ] Key client documents uploaded to the Knowledge Base and searchable

**Project**

- [ ] Project type matches the work (Full Service, or two projects)
- [ ] Status is **Active**, with start and end dates set
- [ ] Tasks added from the library, not an empty board
- [ ] Every task has an assignee and a due date
- [ ] Overview shows real numbers and a populated Team Workload

**People**

- [ ] Team invited with correct roles
- [ ] Client has an account and appears under Brand → Client Access
- [ ] Client has logged into `/portal` once and can see the brand

**The loop**

- [ ] One content item taken from draft to Published
- [ ] Publish log shows a success with a platform post ID
- [ ] A scheduled item published on its own — proving the cron is actually running

---

## Known gaps as of this document

Verified against the codebase on 2026-07-24. These are not configuration mistakes on your side —
they are missing wiring, and each has a working backend behind it.

### 1. ~~The social connection screen is unreachable~~ — fixed

`/settings?section=social-media` offered a **Manage** link to `/brands/{id}?tab=social`, but the
brand detail page had no `social` tab and ignored the `tab` parameter entirely, so the link landed on
Overview. The component rendering the connect buttons was not imported anywhere.

**Fixed:** the brand detail page now has a **Social** tab and honours `?tab=`, so both the Manage
link and a direct URL land in the right place.

### 2. ~~Meta accounts with multiple Pages cannot finish connecting~~ — fixed

When the Meta OAuth callback found several Pages it stored them in an `httpOnly` cookie and redirected
with `meta=select_page`, expecting a picker. The picker (`MetaPageSelector`) was imported nowhere, and
the cookie could not be read by any client component — the route exposed only a `POST` to submit a
choice, with no `GET` to read the list. The flow dead-ended with nothing to click.

**Fixed:** the route now has a `GET` returning the Page list (display fields only — never the access
tokens stored alongside them), the callback returns you to the brand's Social tab, and the picker
opens there. Choosing a Page completes the connection, including any linked Instagram business
account.

### 3. LinkedIn accounts with multiple company pages cannot finish connecting

The same dead end as item 2, in the LinkedIn files, and **not yet fixed**. One company page connects
cleanly and zero falls back to personal-profile posting; more than one stores a `linkedin_orgs_data`
cookie, redirects with `linkedin=select_org`, and has no reachable picker — `LinkedInOrgSelector` is
imported nowhere and `/api/auth/linkedin/organizations` exposes only `POST`.

Workaround: connect with an account administering a single company page.

*Fix: mirror what was done for Meta — add a `GET`, redirect to the brand Social tab, mount the
selector.*

### 4. The intake → brief → task chain cannot be started

The **Intake & Briefs** tab extracts structured intake from a **completed meeting that has a
transcript**, generates a brief per service, and generates tasks from the approved brief. That whole
chain is implemented.

But nothing in the UI writes a transcript to a meeting. `/api/transcribe` does exactly that using
Deepgram — and no component calls it. The transcript import feature writes to meeting *sessions*, a
separate table the intake extractor does not read. The meeting edit dialog does not expose a
transcript field.

So the Intake tab will always say "No completed meetings with transcripts available." **Use the task
library instead** — it reaches the same destination.

### 5. The AI content drafter is not mounted

`ContentDrafter` — draft a post from a brief, with brand voice, per platform — is fully built and is
imported by nothing. The `/ai` workspace exposes six tools and this is not among them. Ad Copy
Generator is the nearest reachable substitute.

### 6. Analytics is internal delivery data only

Covered above, and worth repeating because it shapes what you can promise: no social platform metrics
are pulled back into the system.

---

*Item 3 is a direct copy of the fix already applied for Meta. Item 5 is wiring an existing component
into a page. Item 4 needs a transcript input added to the meeting UI.*
