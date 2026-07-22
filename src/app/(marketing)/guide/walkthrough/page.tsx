import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import {
  LogIn,
  LayoutDashboard,
  Palette,
  FolderKanban,
  Kanban,
  CalendarDays,
  GanttChart,
  Send,
  Video,
  Bot,
  BarChart3,
  Bell,
  Users,
  Settings,
  CreditCard,
  ExternalLink,
  Shield,
  ClipboardList,
  Info,
  Lightbulb,
  AlertTriangle,
  Check,
  Minus,
  Megaphone,
  Search,
  Target,
  Sparkles,
  BookOpen,
  Library,
  Mail,
  MousePointerClick,
  MessageSquareText,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'

/* Icon lookup used by SectionHeading (server-safe — icons stay in this file) */
const iconMap: Record<string, LucideIcon> = {
  LogIn, LayoutDashboard, Palette, FolderKanban, Kanban,
  CalendarDays, GanttChart, Send, Video, Bot, BookOpen, BarChart3,
  Bell, Users, Settings, CreditCard, ExternalLink, Shield,
  ClipboardList, Library, Mail, KeyRound, ShieldCheck,
}
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  WalkthroughLayout,
  type WalkthroughSection,
} from '@/components/marketing/walkthrough-layout'

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: 'User Walkthrough | Agency Beats',
  description:
    'Complete guide to every feature in Agency Beats — from authentication to AI agents, Gantt timelines, client portals, and more.',
}

/* ------------------------------------------------------------------ */
/*  Section registry                                                   */
/* ------------------------------------------------------------------ */

const sections: WalkthroughSection[] = [
  { id: 'authentication', title: 'Authentication & Onboarding', icon: 'LogIn' },
  { id: 'dashboard', title: 'Dashboard Home', icon: 'LayoutDashboard' },
  { id: 'brands', title: 'Brand Management', icon: 'Palette' },
  { id: 'projects', title: 'Project Management', icon: 'FolderKanban' },
  { id: 'tasks', title: 'Task Workflow & Kanban Board', icon: 'Kanban' },
  { id: 'calendar', title: 'Content Calendar', icon: 'CalendarDays' },
  { id: 'gantt', title: 'Gantt Timeline', icon: 'GanttChart' },
  { id: 'queue', title: 'Publishing Queue', icon: 'Send' },
  { id: 'meetings', title: 'Meetings & Video Conferencing', icon: 'Video' },
  { id: 'intake', title: 'Intake & Service Briefs', icon: 'ClipboardList' },
  { id: 'ai-agents', title: 'AI Agents', icon: 'Bot' },
  { id: 'knowledge-base', title: 'Knowledge Base & RAG', icon: 'BookOpen' },
  { id: 'task-library', title: 'Task Library', icon: 'Library' },
  { id: 'email-integration', title: 'Email Integration', icon: 'Mail' },
  { id: 'calendar-sync', title: 'Calendar Sync', icon: 'CalendarDays' },
  { id: 'analytics', title: 'Analytics Dashboard', icon: 'BarChart3' },
  { id: 'notifications', title: 'Notifications', icon: 'Bell' },
  { id: 'team', title: 'Team Management', icon: 'Users' },
  { id: 'settings', title: 'Settings & Integrations', icon: 'Settings' },
  { id: 'billing', title: 'Billing & Subscription', icon: 'CreditCard' },
  { id: 'client-portal', title: 'Client Portal', icon: 'ExternalLink' },
  { id: 'super-admin', title: 'Super Admin', icon: 'ShieldCheck' },
  { id: 'roles', title: 'User Roles & Permissions', icon: 'Shield' },
]

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function SectionHeading({
  index,
  icon: iconName,
  title,
}: {
  index: number
  icon: string
  title: string
}) {
  const Icon = iconMap[iconName]
  return (
    <h2 className="text-xl font-bold flex items-start gap-3">
      <span className="text-indigo-500 font-mono text-sm mt-1">
        {String(index).padStart(2, '0')}
      </span>
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-indigo-500" />}
        {title}
      </span>
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold mt-8 mb-3">{children}</h3>
}

function RouteBadge({ children }: { children: string }) {
  return (
    <Badge variant="secondary" className="font-mono text-xs">
      {children}
    </Badge>
  )
}

function Callout({
  variant = 'tip',
  children,
}: {
  variant?: 'info' | 'tip' | 'warning'
  children: React.ReactNode
}) {
  const styles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      icon: Info,
      iconColor: 'text-blue-500',
    },
    tip: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      border: 'border-indigo-200 dark:border-indigo-500/20',
      icon: Lightbulb,
      iconColor: 'text-indigo-500',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
    },
  }
  const s = styles[variant]
  const Icon = s.icon
  return (
    <div
      className={`rounded-xl border ${s.border} ${s.bg} p-4 flex items-start gap-3`}
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${s.iconColor}`} />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function AsciiDiagram({
  title,
  children,
}: {
  title?: string
  children: string
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-border bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground">
            {title}
          </span>
        </div>
      )}
      <pre className="p-4 text-xs leading-relaxed font-mono text-foreground overflow-x-auto">
        {children}
      </pre>
    </div>
  )
}

function StepList({
  items,
}: {
  items: { label: string; description: string }[]
}) {
  return (
    <div className="space-y-3">
      {items.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="h-6 w-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-medium">{step.label}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
        >
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
  )
}

function PermCheck() {
  return <Check className="h-4 w-4 text-green-500 mx-auto" />
}

function PermDash() {
  return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WalkthroughPage() {
  return (
    <WalkthroughLayout
      title="User Walkthrough"
      badge="Complete Guide"
      subtitle="A step-by-step catalog of every feature and user flow in the Agency Beats platform."
      lastUpdated="March 7, 2026"
      sections={sections}
    >
      <div className="space-y-16">
        {/* ============================================================ */}
        {/*  1. Authentication & Onboarding                               */}
        {/* ============================================================ */}
        <section id="authentication">
          <SectionHeading index={1} icon="LogIn" title="Authentication & Onboarding" />
          <div className="space-y-6 mt-6">
            <SubHeading>1.1 Sign Up <RouteBadge>/signup</RouteBadge></SubHeading>
            <StepList
              items={[
                { label: 'Enter display name', description: 'e.g., "Jane Doe"' },
                { label: 'Enter organization name', description: 'e.g., "Acme Agency"' },
                { label: 'Enter email address', description: 'Must be a valid email' },
                { label: 'Set password', description: 'Minimum 6 characters' },
                { label: 'Click Sign up', description: 'Organization is created, user becomes admin, redirected to /projects' },
              ]}
            />
            <Callout variant="info">
              Behind the scenes: A Supabase Auth user is created, an organization record is created with a slug, the user is added as admin, and JWT claims are set with organization_id and user_role.
            </Callout>

            <SubHeading>1.2 Sign In <RouteBadge>/login</RouteBadge></SubHeading>
            <P><strong>Option A — Email/Password:</strong> Enter email and password, click Sign in, redirected to /dashboard.</P>
            <P><strong>Option B — Google OAuth:</strong> Click Continue with Google, complete consent screen, redirected back via /auth/callback.</P>
            <Callout variant="tip">
              If a user tries to access a protected page while logged out, they are sent to /login?redirect=/original-page and returned there after login.
            </Callout>

            <SubHeading>1.3 Team Invitation <RouteBadge>/invite/[token]</RouteBadge></SubHeading>
            <P><strong>Admin side (sending the invite):</strong></P>
            <StepList
              items={[
                { label: 'Go to Team page', description: 'Navigate to Team from the sidebar' },
                { label: 'Click + New Member', description: 'Opens the invite dialog' },
                { label: 'Enter details', description: 'Email, role, optional department and job title' },
                { label: 'Click Send Invite', description: 'An email is sent with a unique invite link' },
              ]}
            />
            <P><strong>Invitee side (accepting):</strong></P>
            <StepList
              items={[
                { label: 'Click invite link', description: 'Opens the invite page in the browser' },
                { label: 'Sign in if needed', description: 'Redirected to /login first if not authenticated' },
                { label: 'Accept Invitation', description: 'User is added to the organization with the assigned role' },
                { label: 'Redirected to /projects', description: 'JWT claims are updated and user lands in the workspace' },
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  2. Dashboard Home                                            */}
        {/* ============================================================ */}
        <section id="dashboard">
          <SectionHeading index={2} icon="LayoutDashboard" title="Dashboard Home" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/dashboard</RouteBadge>
            </div>
            <P>The central hub providing a real-time overview of agency activity.</P>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Digital Clock', 'Live current time and full date display'],
                  ['Stats Grid (4 cards)', 'Total projects, Total team members, Total tasks, Overdue tasks (highlighted red)'],
                  ['Task Breakdown', 'Completed count, In-progress count, Overdue count'],
                  ['Recent Tasks', 'Last 6 tasks with name, status badge, and due date'],
                  ['Upcoming Meetings', 'Next meetings with time and attendees'],
                  ['Activity Feed', 'Chronological log of team actions (task updates, comments, status changes)'],
                ].map(([section, content]) => (
                  <TableRow key={section}>
                    <TableCell className="font-medium whitespace-normal">{section}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{content}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <BulletList
              items={[
                'Click any stat card to navigate to the relevant page',
                'Click a task to open it',
                'Click a meeting to join or view details',
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  3. Brand Management                                          */}
        {/* ============================================================ */}
        <section id="brands">
          <SectionHeading index={3} icon="Palette" title="Brand Management" />
          <div className="space-y-6 mt-6">
            <SubHeading>3.1 Brands List <RouteBadge>/brands</RouteBadge></SubHeading>
            <P>A responsive grid of brand cards (3 columns on desktop). Each card shows brand logo (or initial letter fallback), brand name, description (2-line clamp), platform badges, and website URL.</P>
            <BulletList
              items={[
                <><strong>Search</strong> — Type to filter brands by name (300ms debounce)</>,
                <><strong>+ New Brand</strong> — Navigate to brand creation form</>,
                <><strong>Click card</strong> — Open brand detail page</>,
              ]}
            />

            <SubHeading>3.2 Create Brand <RouteBadge>/brands/new</RouteBadge></SubHeading>
            <StepList
              items={[
                { label: 'Brand name', description: 'The display name for the brand' },
                { label: 'Description', description: 'Brief summary of the brand' },
                { label: 'Logo upload', description: 'Upload brand logo image' },
                { label: 'Active platforms', description: 'Multi-select: Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube, Blog, Newsletter' },
                { label: 'Website URL', description: 'Brand website address' },
                { label: 'Brand guidelines', description: 'Tone, colors, fonts' },
                { label: 'Click Create Brand', description: 'Brand is saved and you are redirected to the brand detail page' },
              ]}
            />

            <SubHeading>3.3 Brand Detail <RouteBadge>/brands/[id]</RouteBadge></SubHeading>
            <P>Header shows brand logo, name, and description with an Edit button.</P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab</TableHead>
                  <TableHead>Contents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Overview', 'General brand information, key metrics'],
                  ['Contacts', 'Brand point-of-contact list, add/edit contacts'],
                  ['Guidelines', 'Brand style guide: tone of voice, color palette, typography, do\'s and don\'ts'],
                  ['Assets', 'Logo files, images, templates, fonts — upload and manage'],
                  ['Client Access', 'Control which external users can access this brand via the client portal'],
                ].map(([tab, content]) => (
                  <TableRow key={tab}>
                    <TableCell className="font-medium">{tab}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{content}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>3.4 Edit Brand <RouteBadge>/brands/[id]/edit</RouteBadge></SubHeading>
            <P>Same form as creation, pre-populated with current brand data.</P>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  4. Project Management                                        */}
        {/* ============================================================ */}
        <section id="projects">
          <SectionHeading index={4} icon="FolderKanban" title="Project Management" />
          <div className="space-y-6 mt-6">
            <SubHeading>4.1 Projects List <RouteBadge>/projects</RouteBadge></SubHeading>
            <P>Grid of project cards. Each shows project name, brand logo, type badge (Content Ops / Web Build / Full Service), status badge, and end date.</P>
            <BulletList
              items={[
                <><strong>Search</strong> — Filter by project name</>,
                <><strong>Type filter</strong> — Content Ops, Web Build, Full Service</>,
                <><strong>Status filter</strong> — Draft, Active, Paused, Completed, Archived</>,
                <><strong>+ New Project</strong> — Open creation form</>,
              ]}
            />

            <SubHeading>4.2 Create Project <RouteBadge>/projects/new</RouteBadge></SubHeading>
            <StepList
              items={[
                { label: 'Project name', description: 'Text input for the project name' },
                { label: 'Project type', description: 'Visual card selector: Content Ops, Web Build, or Full Service' },
                { label: 'Brand', description: 'Dropdown selector for the associated brand' },
                { label: 'Description', description: 'Text area for project details' },
                { label: 'Start date and End date', description: 'Date pickers for project timeline' },
                { label: 'Click Create Project', description: 'Project is created and you are taken to the project detail' },
              ]}
            />

            <SubHeading>4.3 Project Detail <RouteBadge>/projects/[id]</RouteBadge></SubHeading>
            <P>Header shows project name, brand logo, type badge, and settings button.</P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab</TableHead>
                  <TableHead>Shown For</TableHead>
                  <TableHead>Purpose</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Overview', 'All', 'Project summary, key dates, description'],
                  ['Board', 'Content Ops, Full Service', 'Kanban board with task cards (drag-and-drop columns)'],
                  ['Phases', 'Web Build, Full Service', 'Phase tracker with milestone progression'],
                  ['List', 'All', 'Flat task list with sorting and bulk actions'],
                  ['Meetings', 'All', 'Project-specific meetings list'],
                  ['Team', 'All', 'Assigned team members and their roles'],
                ].map(([tab, shown, purpose]) => (
                  <TableRow key={tab}>
                    <TableCell className="font-medium">{tab}</TableCell>
                    <TableCell className="text-muted-foreground">{shown}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{purpose}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  5. Task Workflow & Kanban Board                              */}
        {/* ============================================================ */}
        <section id="tasks">
          <SectionHeading index={5} icon="Kanban" title="Task Workflow & Kanban Board" />
          <div className="space-y-6 mt-6">
            <SubHeading>Task Statuses (Pipeline)</SubHeading>
            <AsciiDiagram title="Task Flow">
{`Backlog → To Do → In Progress → In Review → Client Review → Approved → Scheduled → Published → Done
                                                                                          ↕
                                                                                       Blocked`}
            </AsciiDiagram>

            <SubHeading>Kanban Board (Content Ops)</SubHeading>
            <P>Each status is a column. Tasks are cards that can be dragged between columns.</P>
            <BulletList
              items={[
                'Task title, assignee avatar, due date, priority indicator',
                'Platform badge (for content items)',
                'Click to open task detail',
                'Drag to change status',
                'Assign/reassign team members',
                'Set due dates, add comments with @mentions',
                'Attach files and link to deliverables',
              ]}
            />

            <SubHeading>Phase Tracker (Web Projects)</SubHeading>
            <AsciiDiagram title="Web Project Phases">
{`Discovery → Wireframing → Client Review (Structure) → Design → Client Review (Design) →
Content Creation → Development → Testing → Client Review (Staging) → Launch → Post-Launch → Complete`}
            </AsciiDiagram>
            <BulletList
              items={[
                'Phase name and description',
                'Milestone marker',
                'Completion status (Not Started / In Progress / Completed / Skipped)',
                'Associated tasks within each phase',
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  6. Content Calendar                                          */}
        {/* ============================================================ */}
        <section id="calendar">
          <SectionHeading index={6} icon="CalendarDays" title="Content Calendar" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/calendar</RouteBadge>
            </div>
            <P>A monthly calendar view for content planning and scheduling.</P>

            <SubHeading>What You See</SubHeading>
            <BulletList
              items={[
                'Month/Year header with Previous/Next navigation and Today button',
                'Calendar grid with day cells',
                'Content items and tasks displayed on their scheduled dates',
                'Color-coded by status',
              ]}
            />

            <SubHeading>Actions</SubHeading>
            <BulletList
              items={[
                <><strong>Brand filter</strong> — Show all brands or filter to a specific one</>,
                <><strong>Navigate months</strong> — Previous / Next buttons, or jump to Today</>,
                <><strong>Click item</strong> — Open task detail</>,
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  7. Gantt Timeline                                            */}
        {/* ============================================================ */}
        <section id="gantt">
          <SectionHeading index={7} icon="GanttChart" title="Gantt Timeline" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/timeline</RouteBadge>
            </div>
            <P>A visual timeline of all tasks across projects using Frappe Gantt. Horizontal bars represent task durations with a blue Today marker.</P>

            <SubHeading>Status Colors</SubHeading>
            <div className="flex flex-wrap gap-3">
              {[
                ['Blue', 'In Progress', 'bg-blue-500'],
                ['Orange', 'In Review', 'bg-orange-500'],
                ['Purple', 'Client Review', 'bg-purple-500'],
                ['Green', 'Done', 'bg-green-500'],
                ['Red', 'Blocked', 'bg-red-500'],
                ['Gray', 'Other', 'bg-gray-400'],
              ].map(([label, status, color]) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={`h-3 w-3 rounded-sm ${color}`} />
                  {status}
                </div>
              ))}
            </div>

            <SubHeading>Controls</SubHeading>
            <BulletList
              items={[
                <><strong>Project filter</strong> — All Projects or a specific one</>,
                <><strong>View mode</strong> — Day / Week / Month granularity toggle</>,
                <><strong>Status legend</strong> at top</>,
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  8. Publishing Queue                                          */}
        {/* ============================================================ */}
        <section id="queue">
          <SectionHeading index={8} icon="Send" title="Publishing Queue" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/queue</RouteBadge>
            </div>
            <P>Manages the pipeline of approved content ready for publishing. Table with columns: Platform, Status, Content preview, Scheduled date.</P>

            <SubHeading>Filters</SubHeading>
            <BulletList
              items={[
                <><strong>Brand</strong> — Filter by brand</>,
                <><strong>Platform</strong> — Filter by social platform</>,
                <><strong>Status</strong> — Approved / Scheduled / Published</>,
              ]}
            />

            <SubHeading>Actions Per Item</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Button</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Schedule', 'Opens dialog to set publish date/time'],
                  ['Mark Published', 'Manually marks content as published'],
                  ['Unschedule', 'Removes scheduled date'],
                  ['External Link', 'Opens published content URL'],
                ].map(([button, action]) => (
                  <TableRow key={button}>
                    <TableCell className="font-medium">{button}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  9. Meetings & Video Conferencing                             */}
        {/* ============================================================ */}
        <section id="meetings">
          <SectionHeading index={9} icon="Video" title="Meetings & Video Conferencing" />
          <div className="space-y-6 mt-6">
            <SubHeading>9.1 Meetings List <RouteBadge>/meetings</RouteBadge></SubHeading>
            <P>Upcoming meetings highlighted in blue cards with date, time, and video icon. All meetings listed as cards below with title, type badge, status badge, duration, and participant count.</P>
            <BulletList
              items={[
                <><strong>Search</strong> — Filter by meeting title</>,
                <><strong>Status filter</strong> — All / Scheduled / In Progress / Completed / Cancelled</>,
                <><strong>Type filter</strong> — Client call, Internal sync, Project kickoff, etc.</>,
                <><strong>Schedule Meeting</strong> — Dialog: title, type, date, time, duration, project, brand, description</>,
              ]}
            />

            <SubHeading>9.2 Meeting Room <RouteBadge>/meetings/[meetingId]</RouteBadge></SubHeading>
            <P>Header shows meeting title, status badge, type badge, date, time, duration, and description.</P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab</TableHead>
                  <TableHead>Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Details', 'Meeting Type, Status, Duration info cards'],
                  ['Transcript', 'Full real-time transcript powered by Deepgram'],
                  ['AI', 'Meeting Summarizer (generates summary) + Brief Generator (creates action items)'],
                  ['Participants', 'Participant list with avatars, Add Participant button'],
                ].map(([tab, features]) => (
                  <TableRow key={tab}>
                    <TableCell className="font-medium">{tab}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{features}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Video Room Features</SubHeading>
            <BulletList
              items={[
                'Real-time video/audio via LiveKit',
                'Screen sharing',
                'Participant grid',
                'Mute/unmute controls',
                'Camera on/off',
                'Live transcription sidebar (Deepgram)',
              ]}
            />

            <SubHeading>9.3 Transcript Chat (Meeting RAG)</SubHeading>
            <P>An AI-powered chat interface that lets you ask questions about meeting transcripts. Available per-session or across all project meetings.</P>
            <BulletList
              items={[
                <><strong>Single-session chat</strong> — Query a specific meeting transcript with side-by-side transcript viewer</>,
                <><strong>All-project chat</strong> — RAG search across every transcript in the project</>,
                <><strong>Actionable responses</strong> — AI can add findings to project briefs or create tasks directly from chat</>,
                <><strong>Parsed actions</strong> — <code className="text-xs bg-muted px-1.5 py-0.5 rounded">[ADD_TO_BRIEF]</code> and <code className="text-xs bg-muted px-1.5 py-0.5 rounded">[CREATE_TASK]</code> shortcuts in responses</>,
                'Streaming responses with message history',
                'Session selection panel with transcript availability badges',
              ]}
            />
            <Callout variant="tip">
              Ask things like &quot;What did the client say about the homepage design?&quot; or &quot;Create a task for the SEO items discussed in the kickoff call.&quot;
            </Callout>

            <SubHeading>9.4 Guest Meeting Rooms <RouteBadge>/meet/[slug]</RouteBadge></SubHeading>
            <P>Public meeting links that allow external participants to join without creating an account.</P>
            <StepList
              items={[
                { label: 'Copy guest link', description: 'From the project meeting room, click "Copy Invite Link"' },
                { label: 'Guest opens link', description: 'Lands on pre-join screen — enters name and email' },
                { label: 'Room check', description: 'System verifies the room is active and accepting participants' },
                { label: 'Join meeting', description: 'Guest enters the LiveKit video room — no login required' },
              ]}
            />
            <BulletList
              items={[
                'Guests see the meeting room info (project name, organization)',
                'Real-time participant list visible to all',
                'Guests participate in video/audio but cannot access dashboard features',
              ]}
            />

            <SubHeading>9.5 Per-Project Meeting Rooms <RouteBadge>/projects/[id]/room</RouteBadge></SubHeading>
            <P>Each project has a dedicated meeting room page for managing video sessions.</P>
            <BulletList
              items={[
                'Start new meeting sessions from the project room',
                'View session history with transcripts and summaries',
                'Copy guest invite links for external participants',
                'Track session duration and participant counts',
                'Sidebar showing recent sessions with quick access',
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  10. Intake & Service Briefs                                  */}
        {/* ============================================================ */}
        <section id="intake">
          <SectionHeading index={10} icon="ClipboardList" title="Intake & Service Briefs" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/projects/[id]</RouteBadge>
              <span className="text-xs text-muted-foreground">(Intake tab)</span>
            </div>
            <P>AI-powered intake pipeline that transforms meeting transcripts into structured service briefs and auto-generates project task lists. Bridges the gap between client meetings and actionable project work.</P>

            <SubHeading>10.1 Intake Pipeline</SubHeading>
            <AsciiDiagram title="Intake Flow">
{`Meeting Transcript → AI Extraction → Intake Record → Service Briefs → Task Generation
                                         ↓
                               Per-service structured briefs
                               (website, seo, content, social,
                                paid_ads, email, branding, cro,
                                analytics, strategy)`}
            </AsciiDiagram>

            <SubHeading>10.2 Creating an Intake</SubHeading>
            <P>From a project&apos;s Intake tab, click <strong>New Intake</strong> to begin.</P>
            <StepList
              items={[
                { label: 'Select a meeting', description: 'Choose a completed meeting with a transcript' },
                { label: 'AI extracts intake data', description: 'The AI analyzes the transcript and extracts client name, project scope, services discussed, budget, timeline, and key requirements' },
                { label: 'Review extracted data', description: 'Verify and adjust the AI-generated intake fields before saving' },
                { label: 'Save intake record', description: 'Persisted with status "pending" for further processing' },
              ]}
            />

            <SubHeading>10.3 Service Briefs</SubHeading>
            <P>Once an intake is saved, the AI generates individual <strong>service briefs</strong> for each service type discussed in the meeting. Each brief contains structured fields specific to its service type.</P>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Key Brief Fields</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Website', 'Page count, CMS required, responsive needs, integrations, design style'],
                  ['SEO', 'Target keywords, competitor URLs, local SEO, technical audit scope'],
                  ['Content', 'Content types, frequency, tone, target audience, distribution channels'],
                  ['Social Media', 'Platforms, posting frequency, content pillars, engagement goals'],
                  ['Paid Ads', 'Platforms, budget, target audiences, campaign types, KPIs'],
                  ['Email', 'List size, campaign types, automation flows, ESP requirements'],
                  ['Branding', 'Deliverables, brand personality, competitor positioning, style preferences'],
                  ['CRO', 'Conversion goals, testing scope, analytics tools, landing page count'],
                  ['Analytics', 'Platforms, KPIs, reporting frequency, attribution model'],
                  ['Strategy', 'Goals, market position, competitive landscape, budget allocation'],
                ].map(([service, fields]) => (
                  <TableRow key={service}>
                    <TableCell className="font-medium">{service}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{fields}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Brief Status Flow</SubHeading>
            <AsciiDiagram title="Brief Lifecycle">
{`Draft → In Review → Approved → Complete
                                    ↓
                            Generate Tasks`}
            </AsciiDiagram>
            <BulletList
              items={[
                <><strong>Draft</strong> — AI-generated, ready for PM review</>,
                <><strong>In Review</strong> — Being reviewed by the team</>,
                <><strong>Approved</strong> — Signed off, ready for completion</>,
                <><strong>Complete</strong> — Finalized, eligible for task generation</>,
              ]}
            />

            <SubHeading>10.4 AI Task Generation</SubHeading>
            <P>When a brief reaches <strong>Complete</strong> status, click <strong>Generate Tasks</strong> to trigger AI-powered task creation.</P>
            <StepList
              items={[
                { label: 'Click Generate Tasks', description: 'Available on completed briefs — triggers AI analysis' },
                { label: 'AI evaluates template library', description: 'Compares brief requirements against predefined task templates for the service type' },
                { label: 'Include/Exclude decisions', description: 'AI includes or excludes each template task with a reason (e.g., "CMS setup excluded — no CMS required per brief")' },
                { label: 'Tasks created automatically', description: 'Included tasks are inserted into the project with estimated hours, phase tags, and AI reasoning' },
              ]}
            />
            <Callout variant="tip">
              Each generated task carries a visible AI reason explaining why it was included. Excluded tasks are shown in a review panel where the PM can manually add any back with one click.
            </Callout>

            <SubHeading>10.5 Task Generation Review</SubHeading>
            <P>After generation, a collapsible panel shows the full AI decision log:</P>
            <BulletList
              items={[
                <><strong>Included tasks</strong> — Green border, check icon, task name, phase, estimated hours, and AI reason</>,
                <><strong>Excluded tasks</strong> — Red border, X icon, task name, phase, estimated hours, AI reason, and an <strong>Add</strong> button to manually include</>,
                <><strong>AI icon on tasks</strong> — Generated tasks show a purple <Sparkles className="h-3.5 w-3.5 text-purple-500 inline" /> icon in the task list and kanban board with the generation reason as a tooltip</>,
              ]}
            />

            <SubHeading>10.6 Template Library</SubHeading>
            <P>The system includes ~120 predefined task templates organized by service type and phase. Templates cover the full project lifecycle for each service.</P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Example Phases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Website', 'Discovery, Design, Development, Launch'],
                  ['SEO', 'Audit, On-Page, Off-Page, Reporting'],
                  ['Content', 'Strategy, Production, Review, Publishing'],
                  ['Social', 'Setup, Content, Engagement, Reporting'],
                  ['Paid Ads', 'Setup, Campaign Build, Launch, Reporting'],
                  ['Email', 'Setup, Automation, Campaigns, Reporting'],
                  ['Branding', 'Discovery, Strategy, Design, Delivery'],
                  ['CRO', 'Audit, Research, Testing, Reporting'],
                  ['Analytics', 'Audit, Implementation, Reporting'],
                  ['Strategy', 'Discovery, Planning, Documentation, Alignment'],
                ].map(([service, phases]) => (
                  <TableRow key={service}>
                    <TableCell className="font-medium">{service}</TableCell>
                    <TableCell className="text-muted-foreground">{phases}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  11. AI Agents                                                */}
        {/* ============================================================ */}
        <section id="ai-agents">
          <SectionHeading index={11} icon="Bot" title="AI Agents" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/ai</RouteBadge>
            </div>
            <P>A hub of 6 AI-powered marketing intelligence tools organized in three categories. Each agent uses the Anthropic Claude API via Vercel AI SDK with streaming responses.</P>

            <SubHeading>Content Creation</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>What It Does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  [<><Megaphone className="h-4 w-4 inline mr-1.5 text-indigo-500" />Ad Copy</>, 'Generates platform-specific ad copy variations. Input: product/service, target audience, platform (Meta, Google, LinkedIn, TikTok), tone.'],
                  [<><MousePointerClick className="h-4 w-4 inline mr-1.5 text-indigo-500" />CTA Suggestions</>, 'Generates high-converting call-to-action variations with A/B testing recommendations. Input: page type, goal, audience.'],
                ].map(([agent, desc], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{agent}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Research &amp; Analysis</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>What It Does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  [<><Search className="h-4 w-4 inline mr-1.5 text-indigo-500" />SEO Research</>, 'Keyword opportunities, content gap analysis, and SEO strategy. Input: topic/keyword, competitor URLs.'],
                  [<><Target className="h-4 w-4 inline mr-1.5 text-indigo-500" />Competitor Analysis</>, 'Compare positioning, content strategy, and market positioning. Input: competitor brand/URL.'],
                ].map(([agent, desc], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{agent}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Performance &amp; Strategy</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>What It Does</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  [<><BarChart3 className="h-4 w-4 inline mr-1.5 text-indigo-500" />Performance Report</>, 'AI-generated insights from analytics data. Input: metrics, time period.'],
                  [<><Lightbulb className="h-4 w-4 inline mr-1.5 text-indigo-500" />Brand Strategy</>, 'Define brand pillars, personas, tone, and objectives. Input: brand goals, audience, budget.'],
                ].map(([agent, desc], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{agent}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Background AI Capabilities</SubHeading>
            <P>In addition to the AI hub tools, several AI capabilities work automatically throughout the platform:</P>
            <BulletList items={[
              <><strong>Meeting Summarizer</strong> — Auto-generates structured summaries after meetings end</>,
              <><strong>Brief Generator</strong> — Extracts structured service briefs from meeting transcripts</>,
              <><strong>Content Drafter</strong> — Drafts social posts, blog content, and copy in your brand voice</>,
              <><strong>Transcript Chat</strong> — RAG-powered Q&amp;A against meeting transcripts (see Meetings section)</>,
              <><strong>Task Generator</strong> — Creates project tasks from completed briefs using template library</>,
            ]} />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  12. Knowledge Base & RAG                                     */}
        {/* ============================================================ */}
        <section id="knowledge-base">
          <SectionHeading index={12} icon="BookOpen" title="Knowledge Base & RAG" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/knowledge-base</RouteBadge>
            </div>

            <P>
              The Knowledge Base is the brain behind every AI agent. Upload brand documents, past campaigns,
              style guides, and reference materials so AI generates content grounded in your actual data —
              not generic outputs.
            </P>

            <Callout variant="tip">
              Every document uploaded here is automatically chunked, embedded using OpenAI text-embedding-3-small
              (1536 dimensions), and stored via pgvector. AI agents query this context before generating any output.
            </Callout>

            <SubHeading>Document Sources</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Upload File', 'PDF, TXT, Markdown, CSV — up to 50 MB. Text is auto-extracted and indexed.'],
                  ['Paste Text', 'Paste any text content directly — meeting notes, briefs, research, etc.'],
                  ['Import URL', 'Paste any web URL — content is fetched, cleaned, and indexed automatically.'],
                  ['Structured Forms', '5 built-in form types for structured data entry (see below).'],
                ].map(([method, details], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{method}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{details}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Structured Form Types</SubHeading>
            <P>
              Instead of free-form text, you can create structured knowledge documents using 5 built-in form types.
              Each form type has purpose-built fields that are individually embedded for fine-grained RAG retrieval.
            </P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Type</TableHead>
                  <TableHead>Key Fields</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Persona', 'Name, role, demographics, goals, pain points, preferred channels, quotes'],
                  ['Brand Strategy', 'Mission, vision, target audience, pillars, competitive advantages'],
                  ['Competitor', 'Company, positioning, strengths, weaknesses, market share, key products'],
                  ['Campaign', 'Campaign name, objective, channels, budget, timeline, KPIs, creative notes'],
                  ['SOP', 'Title, objective, scope, steps (with substeps), tools, review schedule'],
                ].map(([type, fields], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{type}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{fields}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Callout variant="info">
              Each field in structured forms is individually embedded for fine-grained RAG retrieval — AI agents can
              pull specific persona goals or competitor strengths, not just full documents.
            </Callout>

            <SubHeading>AI Auto-Fill</SubHeading>
            <P>
              Any structured form can be auto-populated from existing content using AI. Upload a file, paste a URL,
              or type raw text — AI extracts the relevant fields and fills the form automatically.
            </P>
            <StepList items={[
              { label: 'Open any structured form', description: 'Click the "Auto-fill from document" button (sparkles icon) at the top of the form.' },
              { label: 'Choose your source', description: 'Select File, URL, or Text. Upload a PDF, paste a webpage URL, or type/paste raw content.' },
              { label: 'Click "Extract with AI"', description: 'Fields populate with amber highlights indicating AI-filled values. Review each field before saving.' },
            ]} />
            <Callout variant="tip">
              AI-filled fields show an amber highlight with a sparkle icon. Editing a field clears the highlight.
              The source URL or filename is saved for reference on the document.
            </Callout>

            <SubHeading>CSV Import</SubHeading>
            <P>
              Bulk import personas or competitors from spreadsheets. The import wizard auto-maps CSV columns to
              form fields using string similarity, with manual override for mismatched columns.
            </P>
            <StepList items={[
              { label: 'Upload CSV file', description: 'Drag or select a CSV file from your computer.' },
              { label: 'Review auto-mapped field mappings', description: 'The system suggests which CSV columns map to which form fields.' },
              { label: 'Adjust any mismatched columns', description: 'Use dropdown menus to correct any incorrectly mapped fields.' },
              { label: 'Preview first 5 rows', description: 'Verify the data looks correct before importing.' },
              { label: 'Confirm import', description: 'Records are created in bulk with a progress bar. Source is tagged as CSV import.' },
            ]} />

            <SubHeading>HubSpot Import</SubHeading>
            <P>
              Import personas directly from your HubSpot CRM. Connect via OAuth and pull contacts with job titles
              and company information into structured persona forms.
            </P>
            <StepList items={[
              { label: 'Connect HubSpot', description: 'Click "Connect HubSpot" and authorize via the OAuth consent screen.' },
              { label: 'AI pulls contacts', description: 'Contacts with job titles are fetched from your HubSpot CRM.' },
              { label: 'Preview & select contacts', description: 'Review the list and select which contacts to import as personas.' },
              { label: 'Confirm import', description: 'Selected contacts are saved as persona documents with source tagged as HubSpot.' },
            ]} />

            <SubHeading>Version History</SubHeading>
            <P>
              Every save creates an automatic version snapshot. Browse the full history, preview any version with
              a side-by-side diff, and restore previous versions with one click.
            </P>
            <BulletList items={[
              'Version timeline — chronological list of all saves with user and timestamp',
              'Auto-generated change summaries (e.g., "Updated: Goals, Pain Points")',
              'Diff preview — side-by-side field comparison with red/green highlights',
              'One-click restore — restoring creates a new version (non-destructive)',
            ]} />

            <SubHeading>Collaborative Editing</SubHeading>
            <P>
              Multiple team members can view and edit the same document simultaneously. Real-time presence indicators
              show who is viewing, and field-level lock indicators show who is actively editing each field.
            </P>
            <BulletList items={[
              'Avatar presence indicators — see who is viewing the document in real time',
              'Field-level lock indicators — "[User] editing..." chip on active fields',
              'Last-write-wins with conflict toast — resolve conflicts with "Keep mine" or "Use theirs"',
              'Auto-released locks — locks expire after 30 seconds or when the user leaves',
            ]} />

            <SubHeading>Public Sharing</SubHeading>
            <P>
              Share any knowledge document externally via a unique public URL. Optionally protect with a password
              and set an expiry date. View counts track engagement.
            </P>
            <BulletList items={[
              'Generate unique shareable URLs with one click',
              'Optional password protection for sensitive documents',
              'Configurable expiry dates — links auto-expire',
              'View count tracking — see how many times the document has been accessed',
              'One-click revoke — instantly disable any shared link',
            ]} />

            <SubHeading>RAG Pipeline</SubHeading>
            <AsciiDiagram>{`Upload/Paste/URL/Form → Text Extraction → Chunking → Embedding (1536-dim) → pgvector Storage
                                                                                    ↓
Structured Forms → Per-Field Embedding ───────────────────────────────────────────→ ↓
                                                               AI Agent Query → Semantic Search → Context Injection → Response`}</AsciiDiagram>

            <SubHeading>Auto-Indexed Sources</SubHeading>
            <P>In addition to uploaded documents, the RAG system automatically indexes:</P>
            <BulletList items={[
              'Brand guidelines & strategy (pillars, personas, tone)',
              'Meeting transcripts',
              'Content items (drafts, published posts)',
              'Service briefs (generated from intake)',
              'Comments & feedback threads',
            ]} />

            <SubHeading>Per-Brand Libraries</SubHeading>
            <P>
              Documents can be scoped to a specific brand via the Knowledge Base tab on each brand detail page.
              This lets AI agents pull context specific to the brand they are generating content for.
            </P>

            <SubHeading>Document Statuses</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Meaning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Processing', 'Text extraction and embedding in progress'],
                  ['Ready', 'Document indexed and available for AI agent context'],
                  ['Failed', 'Extraction or embedding error — retry available'],
                  ['No Text', 'File uploaded but no extractable text found'],
                ].map(([status, meaning], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{status}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Semantic Search</SubHeading>
            <P>
              A dedicated semantic search tool lets you query across all indexed content — documents,
              brand guidelines, meeting transcripts, briefs, and comments. Results are ranked by
              cosine similarity with source type filtering.
            </P>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  13. Task Library                                              */}
        {/* ============================================================ */}
        <section id="task-library">
          <SectionHeading index={13} icon="Library" title="Task Library" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/task-library</RouteBadge>
            </div>
            <P>A library of 120+ pre-built task templates organized by service type and project phase. Use templates to quickly scaffold projects or let AI generate tasks from briefs using these templates as a reference.</P>

            <SubHeading>Service Types (10)</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Template Count</TableHead>
                  <TableHead>Example Phases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Strategy', '~10', 'Discovery, Planning, Documentation, Alignment'],
                  ['Branding', '~12', 'Discovery, Strategy, Design, Delivery'],
                  ['Website', '~15', 'Discovery, Design, Development, Launch'],
                  ['SEO', '~12', 'Audit, On-Page, Off-Page, Reporting'],
                  ['Content', '~12', 'Strategy, Production, Review, Publishing'],
                  ['Social Media', '~12', 'Setup, Content, Engagement, Reporting'],
                  ['Paid Ads', '~12', 'Setup, Campaign Build, Launch, Reporting'],
                  ['Email Marketing', '~12', 'Setup, Automation, Campaigns, Reporting'],
                  ['Analytics', '~10', 'Audit, Implementation, Reporting'],
                  ['CRO', '~10', 'Audit, Research, Testing, Reporting'],
                ].map(([service, count, phases]) => (
                  <TableRow key={service}>
                    <TableCell className="font-medium">{service}</TableCell>
                    <TableCell className="text-muted-foreground">{count}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{phases}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Features</SubHeading>
            <BulletList items={[
              <><strong>Search &amp; filter</strong> — Filter by service type or search by template name</>,
              <><strong>Service summary cards</strong> — Each service shows total task count and estimated hours</>,
              <><strong>Phase grouping</strong> — Templates grouped by project phase within each service</>,
              <><strong>Add to Project</strong> — Bulk-import selected templates into any active project</>,
              <><strong>AI task generation</strong> — Templates serve as the reference for AI-powered task creation from briefs (see Intake section)</>,
            ]} />

            <Callout variant="tip">
              The Task Library is the backbone of AI task generation. When you generate tasks from a completed service brief, the AI evaluates every relevant template and decides which to include or exclude based on brief requirements.
            </Callout>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  14. Email Integration                                         */}
        {/* ============================================================ */}
        <section id="email-integration">
          <SectionHeading index={14} icon="Mail" title="Email Integration" />
          <div className="space-y-6 mt-6">
            <P>Connect Gmail or Outlook to sync project-related email threads directly into the platform. View, compose, and link emails without leaving your project workspace.</P>

            <SubHeading>Connecting Email</SubHeading>
            <StepList
              items={[
                { label: 'Go to Settings', description: 'Navigate to Settings > Email Connections' },
                { label: 'Choose provider', description: 'Click Connect Gmail or Connect Outlook' },
                { label: 'Authorize via OAuth', description: 'Complete the authorization flow in a popup window' },
                { label: 'Connection confirmed', description: 'Your email appears with display name, email address, and "Connected" badge' },
              ]}
            />

            <SubHeading>Email Features per Project</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Email Thread List', 'Browse all email threads linked to the project, sorted by date'],
                  ['Thread Viewer', 'Read full email conversations with sender info, timestamps, and attachments'],
                  ['Compose', 'Send new emails directly from the project context via a compose dialog'],
                  ['Link Threads', 'Connect unlinked external email threads to the project for centralized tracking'],
                ].map(([feature, desc]) => (
                  <TableRow key={feature}>
                    <TableCell className="font-medium whitespace-nowrap">{feature}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Connection Management</SubHeading>
            <BulletList items={[
              'Multi-account support — connect multiple Gmail and Outlook accounts',
              'Active/inactive status toggle per connection',
              'Last synced timestamp tracking with manual sync trigger',
              'Disconnect with confirmation dialog',
              'Automatic sync via cron job (email-sync and email-watch)',
            ]} />

            <Callout variant="info">
              Email sync is read-only by default — the platform never modifies your mailbox. Sent emails go through your connected provider but are also tracked in the project thread list.
            </Callout>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  15. Calendar Sync                                             */}
        {/* ============================================================ */}
        <section id="calendar-sync">
          <SectionHeading index={15} icon="CalendarDays" title="Calendar Sync" />
          <div className="space-y-6 mt-6">
            <P>Connect your Google Calendar to see external events alongside your content schedule and project deadlines in one unified calendar view.</P>

            <SubHeading>Connecting Google Calendar</SubHeading>
            <StepList
              items={[
                { label: 'Go to Settings', description: 'Navigate to Settings > Calendar' },
                { label: 'Click Connect Google Calendar', description: 'Opens OAuth authorization flow' },
                { label: 'Grant permissions', description: 'Authorize read-only access to your calendar events' },
                { label: 'Connection confirmed', description: 'Shows display name, email, and "Connected" badge' },
              ]}
            />

            <SubHeading>What Gets Synced</SubHeading>
            <BulletList items={[
              'All calendar events appear in the Agency Beats calendar view',
              'Events display alongside content items and task deadlines',
              'Sync is read-only — events are never modified in Google Calendar',
              'Last synced timestamp with manual refresh button',
              'Automatic sync via cron job (calendar-sync)',
            ]} />

            <Callout variant="info">
              Calendar sync is strictly read-only. Agency Beats never creates, modifies, or deletes events in your Google Calendar.
            </Callout>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  16. Analytics Dashboard                                      */}
        {/* ============================================================ */}
        <section id="analytics">
          <SectionHeading index={16} icon="BarChart3" title="Analytics Dashboard" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/analytics</RouteBadge>
            </div>
            <P>Comprehensive performance metrics for the agency. All charts are built with Recharts.</P>

            <SubHeading>Filters</SubHeading>
            <BulletList
              items={[
                <><strong>Brand</strong> — All brands or specific brand</>,
                <><strong>Date Range</strong> — Last 7 days / Last 30 days / Last 90 days / All time</>,
              ]}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Metrics</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Overview Stats', 'Total brands, Active projects, Tasks completed, Overdue tasks, Total tasks'],
                  ['Task Charts', 'Status distribution pie/bar chart, Tasks over time trend line'],
                  ['Project Progress', 'Per-project completion percentage bars'],
                  ['Team Workload', 'Per-member task distribution'],
                  ['Content by Platform', 'Breakdown across Instagram, Twitter, LinkedIn, etc.'],
                  ['Content Pipeline', 'Items by workflow stage (Draft → In Review → Approved → Published)'],
                ].map(([section, metrics]) => (
                  <TableRow key={section}>
                    <TableCell className="font-medium whitespace-normal">{section}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{metrics}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  17. Notifications                                            */}
        {/* ============================================================ */}
        <section id="notifications">
          <SectionHeading index={17} icon="Bell" title="Notifications" />
          <div className="space-y-6 mt-6">
            <SubHeading>17.1 Notification Bell</SubHeading>
            <P>Located in the top bar header (visible on every dashboard page). Bell icon with unread count badge, click to open popover with recent notifications, grouped view for compact display, and a &quot;View All&quot; link to the full notifications page.</P>

            <SubHeading>17.2 Notifications Page <RouteBadge>/notifications</RouteBadge></SubHeading>
            <P>Full-text search across notification titles and bodies, filter by event type with active filter count badge, and three tabs:</P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab</TableHead>
                  <TableHead>Shows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">All</TableCell><TableCell className="text-muted-foreground">Every notification</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Unread</TableCell><TableCell className="text-muted-foreground">Only unread (with red count badge)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Archived</TableCell><TableCell className="text-muted-foreground">Manually or auto-archived notifications</TableCell></TableRow>
              </TableBody>
            </Table>
            <P>Each notification shows: icon, title, body preview, relative timestamp, group badge, action buttons (Approve/Reject/Complete/Acknowledge), archive/delete buttons. Infinite scroll with &quot;Load more&quot; pagination.</P>

            <SubHeading>17.3 Notification Channels</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['In-App', 'Real-time via Supabase Realtime, shown in bell + notifications page'],
                  ['Email', 'Individual emails via Resend, or batched in daily/weekly digest'],
                  ['Web Push', 'Native browser notifications (requires user permission)'],
                  ['Slack', 'Block Kit messages to configured Slack channel'],
                  ['Webhook', 'HMAC-signed HTTP POST to custom endpoint'],
                ].map(([channel, delivery]) => (
                  <TableRow key={channel}>
                    <TableCell className="font-medium">{channel}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{delivery}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>17.4 Event Types</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>When It Fires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Task Assigned', 'A task is assigned to you'],
                  ['Task Status Changed', 'A task you\'re involved with changes status'],
                  ['Comment Added', 'Someone comments on a task you\'re on'],
                  ['Due Date Approaching', 'A task due date is within 24 hours (cron-driven)'],
                  ['Content Scheduled', 'Content is scheduled for publishing'],
                  ['Content Published', 'Content goes live on a platform'],
                  ['Meeting Starting', 'A meeting you\'re invited to is about to begin'],
                ].map(([event, when]) => (
                  <TableRow key={event}>
                    <TableCell className="font-medium whitespace-normal">{event}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{when}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  18. Team Management                                          */}
        {/* ============================================================ */}
        <section id="team">
          <SectionHeading index={18} icon="Users" title="Team Management" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/team</RouteBadge>
            </div>
            <P>Member count header with a grid of member cards showing name, email, role badge (color-coded), department tag, and job title. Department filter dropdown.</P>

            <SubHeading>Invite a New Member</SubHeading>
            <StepList
              items={[
                { label: 'Click + New Member', description: 'Opens the invite dialog' },
                { label: 'Enter email address', description: 'The invitee\'s email' },
                { label: 'Select role', description: 'Admin, Manager, Creator, Developer, Viewer' },
                { label: 'Set department and job title', description: 'Optionally categorize the member' },
                { label: 'Click Send Invite', description: 'Invitation email is sent with a unique link' },
              ]}
            />

            <SubHeading>Role Badges</SubHeading>
            <div className="flex flex-wrap gap-2">
              {[
                ['Admin', 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'],
                ['Manager', 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400'],
                ['Creator', 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'],
                ['Developer', 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'],
                ['Viewer', 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'],
              ].map(([role, cls]) => (
                <span key={role} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  19. Settings & Integrations                                  */}
        {/* ============================================================ */}
        <section id="settings">
          <SectionHeading index={19} icon="Settings" title="Settings & Integrations" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/settings</RouteBadge>
            </div>

            <SubHeading>19.1 Organization Settings (Admin only)</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Organization name</TableCell><TableCell className="text-muted-foreground">Editable text input</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Organization ID</TableCell><TableCell className="text-muted-foreground">Read-only, monospace (for API integrations)</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Save Changes</TableCell><TableCell className="text-muted-foreground">Saves updated org name</TableCell></TableRow>
              </TableBody>
            </Table>

            <SubHeading>19.2 Account Information</SubHeading>
            <P>Read-only display of your current role (e.g., &quot;Admin&quot;).</P>

            <SubHeading>19.3 Figma Integration</SubHeading>
            <P>Connect to Figma button with OAuth flow. Once connected, Figma file changes trigger webhooks.</P>

            <SubHeading>19.4 Slack Integration (Admin only)</SubHeading>
            <StepList
              items={[
                { label: 'Enter Slack Webhook URL', description: 'From Slack workspace settings > Incoming Webhooks' },
                { label: 'Toggle Active on/off', description: 'Enable or disable the integration' },
                { label: 'Click Save', description: 'Persists the configuration' },
                { label: 'Click Test Connection', description: 'Sends a test message to the Slack channel' },
                { label: 'Click trash icon to remove', description: 'Deletes the Slack integration entirely' },
              ]}
            />

            <SubHeading>19.5 Webhook Integration (Admin only)</SubHeading>
            <StepList
              items={[
                { label: 'Enter Endpoint URL', description: 'Your custom webhook receiver URL' },
                { label: 'Generate Signing Secret', description: 'Click refresh icon to auto-generate' },
                { label: 'Copy the secret', description: 'Use to verify X-AgencyBeats-Signature header' },
                { label: 'Select Subscribed Events', description: 'Checkboxes for each event type (empty = all)' },
                { label: 'Toggle Active and Save', description: 'Enable and persist the webhook config' },
              ]}
            />

            <SubHeading>19.6 HubSpot Integration</SubHeading>
            <P>
              Connect your HubSpot CRM to import contacts as structured persona documents in the Knowledge Base.
              The connection uses OAuth and tokens auto-refresh on expiry.
            </P>
            <StepList items={[
              { label: 'Click "Connect HubSpot"', description: 'Available in the KB import dialog under the HubSpot tab.' },
              { label: 'Authorize via OAuth', description: 'Grant access to contacts scope on the HubSpot consent screen.' },
              { label: 'Connection stored', description: 'Your HubSpot connection is saved — import personas anytime from the KB.' },
              { label: 'Token auto-refreshes', description: 'Access tokens refresh automatically on expiry, no re-authorization needed.' },
            ]} />

            <SubHeading>19.7 Notification Preferences</SubHeading>
            <P>A grid of 7 event types as rows and 5 channels as columns. Each cell is a toggle switch.</P>
            <AsciiDiagram title="Notification Preferences Grid">
{`                    In-App  Email  Push  Slack  Webhook
Task Assigned         ✓       ✓     ✓     ✓      ✓
Task Status Changed   ✓       ✓     ✓     ✓      ✓
Comment Added         ✓       ✓     ✓     ✓      ✓
Due Date Approaching  ✓       ✓     ✓     ✓      ✓
Content Scheduled     ✓       ✓     ✓     ✓      ✓
Content Published     ✓       ✓     ✓     ✓      ✓
Meeting Starting      ✓       ✓     ✓     ✓      ✓`}
            </AsciiDiagram>
            <P>Below the grid: Email Digest selector — None (individual emails) / Daily / Weekly.</P>

            <SubHeading>19.8 Quiet Hours</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setting</TableHead>
                  <TableHead>Options</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Enable', 'Toggle on/off'],
                  ['Start Time', 'Time picker (e.g., 22:00)'],
                  ['End Time', 'Time picker (e.g., 08:00)'],
                  ['Timezone', 'Dropdown with common timezones'],
                ].map(([setting, options]) => (
                  <TableRow key={setting}>
                    <TableCell className="font-medium">{setting}</TableCell>
                    <TableCell className="text-muted-foreground">{options}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Callout variant="info">
              When enabled, non-in-app notifications are queued during quiet hours and delivered when the window ends.
            </Callout>

            <SubHeading>19.9 Auto-Assignment Rules (Manager+ only)</SubHeading>
            <P>Configure rules for automatically assigning tasks based on criteria like team member skills, workload, or department.</P>

            <SubHeading>19.10 API Keys (Admin only)</SubHeading>
            <P>Generate and manage API keys for programmatic access to your organization&apos;s data.</P>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Generate key', 'Create a new API key with a descriptive name'],
                  ['One-time display', 'Key shown once on creation for secure copying'],
                  ['Key masking', 'Only the prefix is shown after creation (e.g., "ab_sk_1a2b...")'],
                  ['Last used tracking', 'See when each key was last used'],
                  ['Revoke key', 'Permanently disable a key with confirmation dialog'],
                ].map(([feature, desc]) => (
                  <TableRow key={feature}>
                    <TableCell className="font-medium whitespace-nowrap">{feature}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>19.11 Audit Log (Admin only)</SubHeading>
            <P>A comprehensive chronological log of all organization actions for compliance and accountability.</P>
            <BulletList items={[
              <><strong>Actor identification</strong> — Each entry shows who performed the action with avatar</>,
              <><strong>Action types</strong> — Create, update, delete, and more</>,
              <><strong>Entity tracking</strong> — Task, comment, content, project, brand, member, etc.</>,
              <><strong>Timestamp</strong> — Full date and time for every entry</>,
              <><strong>Filtering</strong> — Filter by entity type or by actor</>,
              'Infinite scroll with pagination for large logs',
            ]} />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  20. Billing & Subscription                                   */}
        {/* ============================================================ */}
        <section id="billing">
          <SectionHeading index={20} icon="CreditCard" title="Billing & Subscription" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/billing</RouteBadge>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Current Plan', 'Plan name, feature list, usage limits'],
                  ['Subscription Status', 'Color-coded badge: Active (green), Trialing (blue), Past Due (yellow), Canceled (red)'],
                  ['Usage Metrics', 'Progress bars showing consumption (e.g., "3/5 brands used")'],
                  ['Plan Comparison', 'Side-by-side: Starter, Pro, Agency plans with pricing'],
                  ['Next Billing', 'Date and amount'],
                ].map(([section, content]) => (
                  <TableRow key={section}>
                    <TableCell className="font-medium whitespace-normal">{section}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{content}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>Plan Tiers</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead>Starter</TableHead>
                  <TableHead>Pro</TableHead>
                  <TableHead>Agency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Brands', '5', '25', 'Unlimited'],
                  ['Team Members', '5', '25', 'Unlimited'],
                  ['Projects', '10', '50', 'Unlimited'],
                  ['AI Credits', 'Limited', 'Standard', 'Unlimited'],
                  ['Integrations', 'Basic', 'Full', 'Full + API'],
                ].map(([feature, starter, pro, agency]) => (
                  <TableRow key={feature}>
                    <TableCell className="font-medium">{feature}</TableCell>
                    <TableCell className="text-muted-foreground">{starter}</TableCell>
                    <TableCell className="text-muted-foreground">{pro}</TableCell>
                    <TableCell className="text-muted-foreground">{agency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Callout variant="tip">
              Admins can upgrade plans via Stripe Checkout or manage billing (update payment, view invoices, cancel) through the Stripe Customer Portal.
            </Callout>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  21. Client Portal                                            */}
        {/* ============================================================ */}
        <section id="client-portal">
          <SectionHeading index={21} icon="ExternalLink" title="Client Portal" />
          <div className="space-y-6 mt-6">
            <P>A stripped-down, client-facing view of project content and milestones.</P>

            <SubHeading>21.1 Portal Home <RouteBadge>/portal</RouteBadge></SubHeading>
            <P>Grid of brand cards clients have access to. Each card shows brand logo (or initials), name, and description. Click to enter the brand portal.</P>

            <SubHeading>21.2 Brand Portal <RouteBadge>/portal/[brandId]</RouteBadge></SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tab</TableHead>
                  <TableHead>Content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell className="font-medium">Content Review</TableCell><TableCell className="text-muted-foreground whitespace-normal">Queue of content items awaiting client approval. Clients can review drafts, leave comments, approve or request revisions.</TableCell></TableRow>
                <TableRow><TableCell className="font-medium">Project Milestones</TableCell><TableCell className="text-muted-foreground whitespace-normal">Visual timeline of project phases with completion status.</TableCell></TableRow>
              </TableBody>
            </Table>

            <SubHeading>Client Capabilities</SubHeading>
            <BulletList
              items={[
                'View content drafts with rich media',
                'Add review comments',
                'Approve or request changes',
                'Track project phase progress',
                'View scheduled and published content',
                'See upcoming milestones and deadlines',
              ]}
            />

            <SubHeading>What Clients Cannot Do</SubHeading>
            <BulletList
              items={[
                'Access the main dashboard',
                'Create or manage projects',
                'Manage team members',
                'View billing information',
                'Access AI tools',
                'Modify brand settings',
              ]}
            />
          </div>
        </section>

        {/* ============================================================ */}
        {/*  22. Super Admin                                              */}
        {/* ============================================================ */}
        <section id="super-admin">
          <SectionHeading index={22} icon="ShieldCheck" title="Super Admin" />
          <div className="space-y-6 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Route:</span>
              <RouteBadge>/super-admin</RouteBadge>
            </div>
            <P>Platform-level administration for managing all organizations, subscriptions, and platform admins. Only visible to users with the super_admin flag.</P>

            <SubHeading>22.1 Super Admin Dashboard</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Content</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['Stats Cards', 'Total organizations, active users, active subscriptions'],
                  ['Recent Organizations', 'Latest orgs with member count and subscription plan'],
                  ['Quick Links', 'Navigate to Organizations, Admins, and Subscriptions pages'],
                ].map(([section, content]) => (
                  <TableRow key={section}>
                    <TableCell className="font-medium whitespace-nowrap">{section}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">{content}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <SubHeading>22.2 Organizations <RouteBadge>/super-admin/organizations</RouteBadge></SubHeading>
            <BulletList items={[
              'List all organizations with search',
              'View individual org details (members, subscription, creation date)',
              'Monitor subscription plans per organization',
            ]} />

            <SubHeading>22.3 Admin Management <RouteBadge>/super-admin/admins</RouteBadge></SubHeading>
            <BulletList items={[
              'List all platform-level admins',
              'Add new super admins by user ID',
              'Remove admin privileges',
              'Notes/comments per admin',
            ]} />

            <SubHeading>22.4 Subscription Management <RouteBadge>/super-admin/subscriptions</RouteBadge></SubHeading>
            <BulletList items={[
              'Search organizations by name',
              'View and manage subscription plans',
              'Override subscription status for testing or support',
            ]} />

            <Callout variant="warning">
              Super Admin is a platform-level role, separate from organization roles. It is not visible in the regular sidebar and is only accessible via direct URL by authorized users.
            </Callout>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  23. User Roles & Permissions                                 */}
        {/* ============================================================ */}
        <section id="roles">
          <SectionHeading index={23} icon="Shield" title="User Roles & Permissions" />
          <div className="space-y-6 mt-6">
            <SubHeading>Role Hierarchy</SubHeading>
            <AsciiDiagram title="Role Hierarchy">
{`Admin > Manager > Creator / Developer > Viewer > Client`}
            </AsciiDiagram>

            <SubHeading>Permission Matrix</SubHeading>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capability</TableHead>
                  <TableHead className="text-center">Admin</TableHead>
                  <TableHead className="text-center">Manager</TableHead>
                  <TableHead className="text-center">Creator</TableHead>
                  <TableHead className="text-center">Developer</TableHead>
                  <TableHead className="text-center">Viewer</TableHead>
                  <TableHead className="text-center">Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['View dashboard',            true,  true,  true,  true,  true,  false],
                  ['Create/edit projects',       true,  true,  true,  true,  false, false],
                  ['Manage brands',              true,  true,  true,  false, false, false],
                  ['Create/edit tasks',          true,  true,  true,  true,  false, false],
                  ['Comment on tasks',           true,  true,  true,  true,  true,  true],
                  ['Schedule meetings',          true,  true,  true,  true,  false, false],
                  ['Use AI agents',              true,  true,  true,  true,  false, false],
                  ['View analytics',             true,  true,  true,  true,  true,  false],
                  ['Manage team',                true,  true,  false, false, false, false],
                  ['Edit org settings',          true,  false, false, false, false, false],
                  ['Manage integrations',        true,  false, false, false, false, false],
                  ['Manage billing',             true,  false, false, false, false, false],
                  ['Auto-assignment rules',      true,  true,  false, false, false, false],
                  ['Access client portal',       false, false, false, false, false, true],
                  ['Approve content (portal)',   false, false, false, false, false, true],
                  ['Use email integration',      true,  true,  true,  true,  false, false],
                  ['View calendar sync',         true,  true,  true,  true,  true,  false],
                  ['Manage API keys',            true,  false, false, false, false, false],
                  ['View audit log',             true,  false, false, false, false, false],
                  ['Notification preferences',   true,  true,  true,  true,  true,  false],
                  ['Quiet hours',                true,  true,  true,  true,  true,  false],
                  ['Super Admin access',         false, false, false, false, false, false],
                ].map(([cap, admin, manager, creator, dev, viewer, client]) => (
                  <TableRow key={cap as string}>
                    <TableCell className="font-medium whitespace-normal text-sm">{cap as string}</TableCell>
                    <TableCell>{admin ? <PermCheck /> : <PermDash />}</TableCell>
                    <TableCell>{manager ? <PermCheck /> : <PermDash />}</TableCell>
                    <TableCell>{creator ? <PermCheck /> : <PermDash />}</TableCell>
                    <TableCell>{dev ? <PermCheck /> : <PermDash />}</TableCell>
                    <TableCell>{viewer ? <PermCheck /> : <PermDash />}</TableCell>
                    <TableCell>{client ? <PermCheck /> : <PermDash />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* ============================================================ */}
        {/*  Application Summary                                          */}
        {/* ============================================================ */}
        <section className="mt-16 pt-12 border-t border-border">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Application Summary
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-base font-semibold mb-3">By the Numbers</h3>
              <Table>
                <TableBody>
                  {[
                    ['Dashboard pages', '23'],
                    ['Marketing pages', '10'],
                    ['Portal pages', '2'],
                    ['Auth pages', '3'],
                    ['Super Admin pages', '4'],
                    ['API routes', '50'],
                    ['Total routes', '95'],
                    ['Sidebar items', '14'],
                    ['Notification channels', '5'],
                    ['Event types', '7'],
                    ['AI agents (hub)', '6'],
                    ['AI capabilities (total)', '12'],
                    ['RAG source types', '7'],
                    ['KB form types', '5'],
                    ['Service types', '10'],
                    ['Task templates', '~120'],
                    ['User roles', '6 + Super Admin'],
                    ['Task statuses', '10'],
                    ['Project types', '3'],
                    ['Web project phases', '12'],
                    ['Integrations', '9 (Gmail, Outlook, GCal, Figma, Slack, LiveKit, Deepgram, Stripe, HubSpot)'],
                  ].map(([metric, count]) => (
                    <TableRow key={metric}>
                      <TableCell className="text-muted-foreground">{metric}</TableCell>
                      <TableCell className="font-bold text-right">{count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="text-base font-semibold mb-3">Tech Stack</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Layer</TableHead>
                    <TableHead>Technology</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ['Frontend', 'Next.js 15, TypeScript, TailwindCSS, Shadcn UI'],
                    ['API', 'tRPC (type-safe)'],
                    ['Database', 'Supabase (PostgreSQL + RLS + Realtime)'],
                    ['Auth', 'Supabase Auth (email/password + Google OAuth)'],
                    ['Video', 'LiveKit (self-hosted)'],
                    ['AI', 'Anthropic Claude + Vercel AI SDK'],
                    ['RAG', 'pgvector (HNSW) + OpenAI text-embedding-3-small'],
                    ['Email Delivery', 'Resend'],
                    ['Email Sync', 'Gmail API + Microsoft Graph (OAuth)'],
                    ['Calendar', 'Google Calendar API (read-only sync)'],
                    ['Push', 'Web Push (VAPID)'],
                    ['Charts', 'Recharts'],
                    ['Gantt', 'Frappe Gantt'],
                    ['Editor', 'Tiptap (rich text)'],
                    ['Storage', 'Cloudflare R2'],
                    ['Payments', 'Stripe'],
                  ].map(([layer, tech]) => (
                    <TableRow key={layer}>
                      <TableCell className="font-medium">{layer}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-normal">{tech}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </div>
    </WalkthroughLayout>
  )
}
