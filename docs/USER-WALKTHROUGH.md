# Agency Beats - User Walkthrough

A step-by-step catalog of every feature and user flow in the Agency Beats platform.

---

## Table of Contents

1. [Marketing Site & Public Pages](#1-marketing-site--public-pages)
2. [Authentication & Onboarding](#2-authentication--onboarding)
3. [Dashboard Home](#3-dashboard-home)
4. [Brand Management](#4-brand-management)
5. [Project Management](#5-project-management)
6. [Task Workflow & Kanban Board](#6-task-workflow--kanban-board)
7. [Content Calendar](#7-content-calendar)
8. [Gantt Timeline](#8-gantt-timeline)
9. [Publishing Queue](#9-publishing-queue)
10. [Meetings & Video Conferencing](#10-meetings--video-conferencing)
11. [AI Agents](#11-ai-agents)
12. [Analytics Dashboard](#12-analytics-dashboard)
13. [Notifications](#13-notifications)
14. [Team Management](#14-team-management)
15. [Settings & Integrations](#15-settings--integrations)
16. [Billing & Subscription](#16-billing--subscription)
17. [Client Portal](#17-client-portal)
18. [User Roles & Permissions](#18-user-roles--permissions)

---

## 1. Marketing Site & Public Pages

**Route:** `/`

The public-facing website introduces Agency Beats to prospective users.

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage with hero, product preview, problem/solution, AI showcase, pricing, testimonials, CTA |
| `/about` | Company story timeline (Eye, Lightbulb, Build, Expand) and capabilities |
| `/contact` | Contact info (address, phone, email), support channels, contact form |
| `/docs` | Documentation hub: Getting Started, Brand Management, Content Ops, Web Projects, Meetings, Integrations, AI, Analytics |
| `/docs/api` | REST/tRPC API reference with endpoints and authentication |
| `/guide/client-portal` | Client portal setup guide: what it is, how to configure, feature walkthrough |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/cookies` | Cookie policy |

### Homepage Sections (top to bottom)

1. **Header** - Logo, navigation links, Sign In / Get Started buttons
2. **Hero** - Headline, subtitle, primary CTA
3. **Product Preview** - Screenshot/demo of the platform
4. **Problem Section** - Pain points for agencies
5. **Solution Section** - How Agency Beats solves them
6. **Workflow Section** - Visual flow of the content/project lifecycle
7. **AI Showcase** - AI-powered features highlight
8. **Analytics Preview** - Dashboard and reporting capabilities
9. **Portal Docs** - Client portal feature overview
10. **Integrations** - Supported integrations (Figma, Slack, etc.)
11. **Testimonials** - Customer quotes
12. **Pricing** - Plan comparison (Starter, Pro, Agency)
13. **CTA Section** - Final call to action
14. **Footer** - Links, legal, social

---

## 2. Authentication & Onboarding

### 2.1 Sign Up

**Route:** `/signup`

**Steps:**
1. Enter display name (e.g., "Jane Doe")
2. Enter organization name (e.g., "Acme Agency")
3. Enter email address
4. Set password (minimum 6 characters)
5. Click **Sign up**

**What happens behind the scenes:**
- A Supabase Auth user is created (auto-confirmed, no verification email)
- An organization record is created with a slug
- The user is added as the organization's **admin**
- JWT claims are set with `organization_id` and `user_role`
- User is automatically signed in and redirected to `/projects`

### 2.2 Sign In

**Route:** `/login`

**Option A - Email/Password:**
1. Enter email and password
2. Click **Sign in**
3. Redirected to `/dashboard` (or the page they originally requested)

**Option B - Google OAuth:**
1. Click **Continue with Google**
2. Complete Google consent screen
3. Redirected back via `/auth/callback`
4. Landed on `/dashboard`

**Redirect behavior:** If a user tries to access a protected page while logged out, they are sent to `/login?redirect=/original-page` and returned there after login.

### 2.3 Team Invitation

**Route:** `/invite/[token]`

**Admin side (sending the invite):**
1. Go to Team page
2. Click **+ New Member**
3. Enter email, select role, optionally set department and job title
4. Click **Send Invite**
5. An email is sent with a unique invite link

**Invitee side (accepting):**
1. Click the link in the invitation email
2. If not logged in, redirected to `/login` first
3. Invite page validates the token and shows organization details
4. Click **Accept Invitation**
5. User is added to the organization with the assigned role
6. JWT claims are updated
7. Redirected to `/projects`

---

## 3. Dashboard Home

**Route:** `/dashboard`

The central hub providing a real-time overview of agency activity.

### What You See

| Section | Content |
|---------|---------|
| **Digital Clock** | Live current time and full date display |
| **Stats Grid** (4 cards) | Total projects, Total team members, Total tasks, Overdue tasks (highlighted red if any) |
| **Task Breakdown** | Completed count, In-progress count, Overdue count |
| **Recent Tasks** | Last 6 tasks with name, status badge, and due date |
| **Upcoming Meetings** | Next meetings with time and attendees |
| **Activity Feed** | Chronological log of team actions (task updates, comments, status changes) |

### Actions Available
- Click any stat card to navigate to the relevant page
- Click a task to open it
- Click a meeting to join or view details

---

## 4. Brand Management

### 4.1 Brands List

**Route:** `/brands`

**What you see:** A responsive grid of brand cards (3 columns on desktop).

**Each card shows:**
- Brand logo (or initial letter fallback)
- Brand name
- Description (2-line clamp)
- Platform badges (Instagram, Twitter, TikTok, LinkedIn, etc.)
- Website URL indicator

**Actions:**
- **Search** - Type to filter brands by name (300ms debounce)
- **+ New Brand** - Navigate to brand creation form
- **Click card** - Open brand detail page

### 4.2 Create Brand

**Route:** `/brands/new`

**Form fields:**
1. Brand name
2. Description
3. Logo upload
4. Active platforms (multi-select: Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube, Blog, Newsletter)
5. Website URL
6. Brand guidelines (tone, colors, fonts)
7. Click **Create Brand**

### 4.3 Brand Detail

**Route:** `/brands/[id]`

**Header:** Brand logo, name, and description with an **Edit** button.

**5 Tabs:**

| Tab | Contents |
|-----|----------|
| **Overview** | General brand information, key metrics |
| **Contacts** | Brand point-of-contact list, add/edit contacts |
| **Guidelines** | Brand style guide: tone of voice, color palette, typography, do's and don'ts |
| **Assets** | Logo files, images, templates, fonts - upload and manage |
| **Client Access** | Control which external users can access this brand via the client portal |

### 4.4 Edit Brand

**Route:** `/brands/[id]/edit`

Same form as creation, pre-populated with current brand data.

---

## 5. Project Management

### 5.1 Projects List

**Route:** `/projects`

**What you see:** Grid of project cards.

**Each card shows:**
- Project name
- Brand association (logo)
- Project type badge (Content Ops / Web Build / Full Service)
- Status badge (Draft, Active, Paused, Completed, Archived)
- End date

**Filters & Actions:**
- **Search** - Filter by project name
- **Type filter** - Content Ops, Web Build, Full Service
- **Status filter** - Draft, Active, Paused, Completed, Archived
- **+ New Project** - Open creation form
- **Click card** - Open project detail

### 5.2 Create Project

**Route:** `/projects/new`

**Form fields:**
1. **Project name** - Text input
2. **Project type** - Visual card selector:
   - **Content Ops** - Social media & recurring content management
   - **Web Build** - Website design & development projects
   - **Full Service** - Combined content + web projects
3. **Brand** - Dropdown selector
4. **Description** - Text area
5. **Start date** and **End date** - Date pickers
6. Click **Create Project**

### 5.3 Project Detail

**Route:** `/projects/[id]`

**Header:** Project name, brand logo, type badge, settings button.

**Tabs** (vary by project type):

| Tab | Shown For | Purpose |
|-----|-----------|---------|
| **Overview** | All | Project summary, key dates, description |
| **Board** | Content Ops, Full Service | Kanban board with task cards (drag-and-drop columns) |
| **Phases** | Web Build, Full Service | Phase tracker with milestone progression |
| **List** | All | Flat task list with sorting and bulk actions |
| **Meetings** | All | Project-specific meetings list |
| **Team** | All | Assigned team members and their roles |

---

## 6. Task Workflow & Kanban Board

### Task Statuses (Pipeline)

Tasks flow through these statuses:

```
Backlog → To Do → In Progress → In Review → Client Review → Approved → Scheduled → Published → Done
                                                                                         ↕
                                                                                      Blocked
```

### Kanban Board (Content Ops)

**Columns:** Each status is a column. Tasks are cards that can be dragged between columns.

**Task Card shows:**
- Task title
- Assignee avatar
- Due date
- Priority indicator
- Platform badge (for content items)

**Task actions:**
- Click to open task detail
- Drag to change status
- Assign/reassign team members
- Set due dates
- Add comments (with @mentions)
- Attach files
- Link to deliverables

### Phase Tracker (Web Projects)

Web projects use a phased approach:

```
Discovery → Wireframing → Client Review (Structure) → Design → Client Review (Design) → Content Creation → Development → Testing → Client Review (Staging) → Launch → Post-Launch → Complete
```

Each phase shows:
- Phase name and description
- Milestone marker
- Completion status (Not Started / In Progress / Completed / Skipped)
- Associated tasks within the phase

---

## 7. Content Calendar

**Route:** `/calendar`

A monthly calendar view for content planning and scheduling.

### What You See
- **Month/Year header** with Previous/Next navigation and Today button
- **Calendar grid** with day cells
- **Content items** and **tasks** displayed on their scheduled dates
- Color-coded by status

### Actions
- **Brand filter** - Show all brands or filter to a specific one
- **Navigate months** - Previous / Next buttons, or jump to Today
- **Click item** - Open task detail

---

## 8. Gantt Timeline

**Route:** `/timeline`

A visual timeline of all tasks across projects using Frappe Gantt.

### What You See
- Horizontal Gantt bars representing task durations
- **Today marker** (blue vertical line)
- Status-colored bars:
  - Blue = In Progress
  - Orange = In Review
  - Purple = Client Review
  - Green = Done
  - Red = Blocked
  - Gray = Other

### Controls
- **Project filter** - All Projects or a specific one
- **View mode** - Day / Week / Month granularity toggle
- **Status legend** at top

---

## 9. Publishing Queue

**Route:** `/queue`

Manages the pipeline of approved content ready for publishing.

### What You See
- Table with columns: Platform, Status, Content preview, Scheduled date
- Status badges (Approved, Scheduled, Published)
- Total item count

### Filters
- **Brand** - Filter by brand
- **Platform** - Filter by social platform
- **Status** - Approved / Scheduled / Published

### Actions Per Item
| Button | Action |
|--------|--------|
| **Schedule** | Opens dialog to set publish date/time |
| **Mark Published** | Manually marks content as published |
| **Unschedule** | Removes scheduled date |
| **External Link** | Opens published content URL |

---

## 10. Meetings & Video Conferencing

### 10.1 Meetings List

**Route:** `/meetings`

**What you see:**
- **Upcoming meetings** highlighted in blue cards with date, time, and video icon
- **All meetings** listed as cards below
- Each card shows: title, type badge, status badge, duration, participant count

**Filters:**
- **Search** - Filter by meeting title
- **Status** - All / Scheduled / In Progress / Completed / Cancelled
- **Type** - Client call, Internal sync, Project kickoff, etc.

**Actions:**
- **Schedule Meeting** - Opens dialog: title, type, date, time, duration, project, brand, description
- **Click card** - Navigate to meeting detail

### 10.2 Meeting Room

**Route:** `/meetings/[meetingId]`

**Header:** Meeting title, status badge, type badge, date, time, duration, description.

**4 Tabs:**

| Tab | Features |
|-----|----------|
| **Details** | Meeting Type, Status, Duration info cards |
| **Transcript** | Full real-time transcript powered by Deepgram |
| **AI** | Meeting Summarizer (generates summary) + Brief Generator (creates action items) |
| **Participants** | Participant list with avatars, Add Participant button |

**Key Actions:**
- **Join Meeting** - Enters full-screen video room (LiveKit)
- **Leave Meeting** - Exits video, returns to detail view
- **Edit** - Opens edit dialog (title, type, date, time, duration)
- **Invite** - Opens invite participant dialog
- **Generate Summary** - AI creates meeting summary from transcript
- **Generate Brief** - AI creates structured action items/brief

### Video Room Features
- Real-time video/audio via LiveKit
- Screen sharing
- Participant grid
- Mute/unmute controls
- Camera on/off
- Live transcription sidebar (Deepgram)

---

## 11. AI Agents

**Route:** `/ai`

A hub of 5 AI-powered marketing intelligence tools.

### Available Agents

| Tab | Icon | What It Does |
|-----|------|-------------|
| **Ad Copy** | Megaphone | Generates ad copy variations for campaigns. Input: product/service, target audience, platform, tone. Output: multiple copy options with headlines and body text. |
| **SEO Research** | Search | Performs keyword research and SEO strategy. Input: topic/keyword, competitor URLs. Output: keyword suggestions, search volume estimates, content recommendations. |
| **Performance** | Bar Chart | Generates performance analysis reports. Input: metrics data, time period. Output: trend analysis, insights, recommendations. |
| **Competitor** | Target | Analyzes competitor marketing strategies. Input: competitor brand/URL. Output: positioning analysis, channel breakdown, strengths/weaknesses. |
| **Strategy** | Lightbulb | Creates marketing strategy recommendations. Input: brand goals, audience, budget. Output: channel mix, content themes, timeline suggestions. |

Each agent uses the Anthropic Claude API via Vercel AI SDK with streaming responses.

---

## 12. Analytics Dashboard

**Route:** `/analytics`

Comprehensive performance metrics for the agency.

### Filters
- **Brand** - All brands or specific brand
- **Date Range** - Last 7 days / Last 30 days / Last 90 days / All time

### Dashboard Sections

| Section | Metrics |
|---------|---------|
| **Overview Stats** | Total brands, Active projects, Tasks completed, Overdue tasks, Total tasks |
| **Task Charts** | Status distribution pie/bar chart, Tasks over time trend line |
| **Project Progress** | Per-project completion percentage bars |
| **Team Workload** | Per-member task distribution |
| **Content by Platform** | Breakdown of content across Instagram, Twitter, LinkedIn, etc. |
| **Content Pipeline** | Content items by workflow stage (Draft → In Review → Approved → Published) |

All charts are built with Recharts.

---

## 13. Notifications

### 13.1 Notification Bell

**Location:** Top bar header (visible on every dashboard page)

- Bell icon with unread count badge
- Click to open popover with recent notifications
- Grouped view for compact display
- "View All" link to full notifications page

### 13.2 Notifications Page

**Route:** `/notifications`

**Header:** Bell icon, "Notifications" title, unread count message, **Mark all as read** button.

**Search & Filter Bar:**
- **Search input** - Full-text search across notification titles and bodies (debounced)
- **Filter popover** - Checkboxes for each event type:
  - Task Assigned
  - Task Status Changed
  - Comment Added
  - Due Date Approaching
  - Content Scheduled
  - Content Published
  - Meeting Starting
- Active filter count badge

**3 Tabs:**

| Tab | Shows |
|-----|-------|
| **All** | Every notification |
| **Unread** | Only unread (with red count badge) |
| **Archived** | Manually or auto-archived notifications |

**Each Notification Shows:**
- Icon colored by type
- Title (bold if unread)
- Body text preview
- Relative timestamp ("2 hours ago")
- Group badge if grouped ("3 comments on Task X")
- Action buttons (if applicable): Approve / Reject / Complete / Acknowledge
- Archive / Unarchive button
- Delete button
- Click to navigate to related resource

**Infinite scroll** with "Load more" pagination.

### 13.3 Notification Channels

Notifications are delivered across 5 channels (configurable per event type in Settings):

| Channel | Delivery |
|---------|----------|
| **In-App** | Real-time via Supabase Realtime, shown in bell + notifications page |
| **Email** | Individual emails via Resend, or batched in daily/weekly digest |
| **Web Push** | Native browser notifications (requires user permission) |
| **Slack** | Block Kit messages to configured Slack channel |
| **Webhook** | HMAC-signed HTTP POST to custom endpoint |

### 13.4 Event Types

| Event | When It Fires |
|-------|---------------|
| Task Assigned | A task is assigned to you |
| Task Status Changed | A task you're involved with changes status |
| Comment Added | Someone comments on a task you're on |
| Due Date Approaching | A task due date is within 24 hours (cron-driven) |
| Content Scheduled | Content is scheduled for publishing |
| Content Published | Content goes live on a platform |
| Meeting Starting | A meeting you're invited to is about to begin |

---

## 14. Team Management

**Route:** `/team`

### What You See
- **Member count** header
- **Grid of member cards**, each showing:
  - Name and email
  - Role badge (color-coded)
  - Department tag
  - Job title
- **Department filter** dropdown

### Actions

**Invite a new member:**
1. Click **+ New Member**
2. Enter email address
3. Select role (Admin, Manager, Creator, Developer, Viewer)
4. Optionally select department
5. Optionally set job title
6. Click **Send Invite**
7. Invitation email is sent with a unique link

**Manage departments:**
1. Click **Department Manager**
2. Create new departments with custom colors
3. Edit existing department names/colors
4. Delete unused departments

**Edit a member:**
- Click the dropdown menu on a member card
- **Edit** - Change role, department, job title
- **Remove** - Remove from organization

### Role Badges

| Role | Color |
|------|-------|
| Admin | Red |
| Manager | Purple |
| Creator | Blue |
| Developer | Green |
| Viewer | Gray |

---

## 15. Settings & Integrations

**Route:** `/settings`

### 15.1 Organization Settings (Admin only)

| Field | Description |
|-------|-------------|
| **Organization name** | Editable text input |
| **Organization ID** | Read-only, monospace (for API integrations) |
| **Save Changes** | Saves updated org name |

### 15.2 Account Information

| Field | Description |
|-------|-------------|
| **Your role** | Read-only display of current role (e.g., "Admin") |

### 15.3 Figma Integration

- **Connect to Figma** button
- OAuth flow to link Figma account
- Once connected, Figma file changes trigger webhooks

### 15.4 Slack Integration (Admin only)

1. Enter Slack **Webhook URL** (from Slack workspace settings > Incoming Webhooks)
2. Toggle **Active** on/off
3. Click **Save**
4. Click **Test Connection** to send a test message to the channel
5. Click trash icon to remove the integration

### 15.5 Webhook Integration (Admin only)

1. Enter **Endpoint URL** for your custom webhook receiver
2. Click refresh icon to **Generate Signing Secret**
3. Copy the secret (use to verify `X-AgencyBeats-Signature` header)
4. Select **Subscribed Events** (checkboxes for each event type, empty = all)
5. Toggle **Active** on/off
6. Click **Save**

### 15.6 Notification Preferences (All users)

A grid showing all 7 event types as rows and 5 channels as columns:

```
                    In-App  Email  Push  Slack  Webhook
Task Assigned         ✓       ✓     ✓     ✓      ✓
Task Status Changed   ✓       ✓     ✓     ✓      ✓
Comment Added         ✓       ✓     ✓     ✓      ✓
Due Date Approaching  ✓       ✓     ✓     ✓      ✓
Content Scheduled     ✓       ✓     ✓     ✓      ✓
Content Published     ✓       ✓     ✓     ✓      ✓
Meeting Starting      ✓       ✓     ✓     ✓      ✓
```

Each cell is a toggle switch. Below the grid:

- **Email Digest** selector: None (individual emails) / Daily / Weekly

### 15.7 Quiet Hours (All users)

| Setting | Options |
|---------|---------|
| **Enable** | Toggle on/off |
| **Start Time** | Time picker (e.g., 22:00) |
| **End Time** | Time picker (e.g., 08:00) |
| **Timezone** | Dropdown with common timezones |

When enabled, non-in-app notifications are queued during quiet hours and delivered when the window ends.

### 15.8 Auto-Assignment Rules (Manager+ only)

Configure rules for automatically assigning tasks based on criteria like team member skills, workload, or department.

---

## 16. Billing & Subscription

**Route:** `/billing`

### What You See

| Section | Content |
|---------|---------|
| **Current Plan** | Plan name, feature list, usage limits |
| **Subscription Status** | Color-coded badge: Active (green), Trialing (blue), Past Due (yellow), Canceled (red) |
| **Usage Metrics** | Progress bars showing consumption (e.g., "3/5 brands used") |
| **Plan Comparison** | Side-by-side: Starter, Pro, Agency plans with pricing |
| **Next Billing** | Date and amount |

### Actions

| Action | Who | Description |
|--------|-----|-------------|
| **Upgrade Plan** | Admin | Initiates Stripe Checkout for plan upgrade |
| **Manage Billing** | Admin | Opens Stripe Customer Portal (update payment method, view invoices, cancel) |

### Plan Tiers

| Feature | Starter | Pro | Agency |
|---------|---------|-----|--------|
| Brands | 5 | 25 | Unlimited |
| Team Members | 5 | 25 | Unlimited |
| Projects | 10 | 50 | Unlimited |
| AI Credits | Limited | Standard | Unlimited |
| Integrations | Basic | Full | Full + API |

After Stripe checkout, the app handles `?success=true` and `?canceled=true` URL params for user feedback.

---

## 17. Client Portal

A stripped-down, client-facing view of project content and milestones.

### 17.1 Portal Home

**Route:** `/portal`

**What clients see:**
- Grid of brand cards they have access to
- Each card shows brand logo (or initials), name, description
- Click a brand card to enter the brand portal

### 17.2 Brand Portal

**Route:** `/portal/[brandId]`

**Header:** Brand name and description.

**2 Tabs:**

| Tab | Content |
|-----|---------|
| **Content Review** | Queue of content items awaiting client approval. Clients can review drafts, leave comments, approve or request revisions. |
| **Project Milestones** | Visual timeline of project phases with completion status. Shows which phases are complete, in progress, or upcoming. |

### Client Capabilities
- View content drafts with rich media
- Add review comments
- Approve or request changes
- Track project phase progress
- View scheduled and published content
- See upcoming milestones and deadlines

### What Clients Cannot Do
- Access the main dashboard
- Create or manage projects
- Manage team members
- View billing information
- Access AI tools
- Modify brand settings

---

## 18. User Roles & Permissions

### Role Hierarchy

```
Admin > Manager > Creator / Developer > Viewer > Client
```

### Permission Matrix

| Capability | Admin | Manager | Creator | Developer | Viewer | Client |
|------------|-------|---------|---------|-----------|--------|--------|
| View dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Create/edit projects | ✓ | ✓ | ✓ | ✓ | - | - |
| Manage brands | ✓ | ✓ | ✓ | - | - | - |
| Create/edit tasks | ✓ | ✓ | ✓ | ✓ | - | - |
| Comment on tasks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Schedule meetings | ✓ | ✓ | ✓ | ✓ | - | - |
| Use AI agents | ✓ | ✓ | ✓ | ✓ | - | - |
| View analytics | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Manage team | ✓ | ✓ | - | - | - | - |
| Edit org settings | ✓ | - | - | - | - | - |
| Manage integrations (Slack, Webhooks) | ✓ | - | - | - | - | - |
| Manage billing | ✓ | - | - | - | - | - |
| Auto-assignment rules | ✓ | ✓ | - | - | - | - |
| Access client portal | - | - | - | - | - | ✓ |
| Approve content (portal) | - | - | - | - | - | ✓ |
| Notification preferences | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Quiet hours | ✓ | ✓ | ✓ | ✓ | ✓ | - |

---

## Sidebar Navigation

All authenticated dashboard users see the same 12-item sidebar:

| # | Item | Icon | Route |
|---|------|------|-------|
| 1 | Dashboard | Grid | `/dashboard` |
| 2 | Projects | Folder | `/projects` |
| 3 | Brands | Palette | `/brands` |
| 4 | Calendar | Calendar | `/calendar` |
| 5 | Queue | List | `/queue` |
| 6 | Meetings | Video | `/meetings` |
| 7 | Timeline | Gantt | `/timeline` |
| 8 | Analytics | Bar Chart | `/analytics` |
| 9 | AI Agents | Bot | `/ai` |
| 10 | Team | Users | `/team` |
| 11 | Billing | Credit Card | `/billing` |
| 12 | Settings | Gear | `/settings` |

**Sidebar header:** Agency Beats logo + branding (links to `/dashboard`)
**Sidebar footer:** User dropdown with Sign Out and Settings links

---

## Application Summary

### By the Numbers

| Metric | Count |
|--------|-------|
| Dashboard pages | 21 |
| Marketing pages | 9 |
| Portal pages | 2 |
| Auth pages | 3 |
| API routes | 19 |
| **Total routes** | **54** |
| Sidebar items | 12 |
| Notification channels | 5 |
| Notification event types | 7 |
| AI agents | 5 |
| User roles | 6 |
| Task statuses | 10 |
| Project types | 3 |
| Web project phases | 12 |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Shadcn UI |
| API | tRPC (type-safe) |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Video | LiveKit (self-hosted) |
| Transcription | Deepgram |
| AI | Anthropic Claude + Vercel AI SDK |
| Email | Resend |
| Push | Web Push (VAPID) |
| Charts | Recharts |
| Gantt | Frappe Gantt |
| Editor | Tiptap (rich text) |
| Storage | Cloudflare R2 |
| Payments | Stripe |
| Integrations | Figma, Slack, Custom Webhooks |
