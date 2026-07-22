import type {
  UserRole,
  TaskStatus,
  ContentPlatform,
  ProjectType,
  MeetingType,
  MeetingStatus,
  BriefType,
  NotificationType,
  NotificationChannel,
  DigestFrequency,
  ActivityAction,
  SubscriptionPlan,
} from '@/types/enums'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  creator: 'Creator',
  developer: 'Developer',
  viewer: 'Viewer',
  client: 'Client',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 50,
  manager: 40,
  creator: 30,
  developer: 25,
  viewer: 10,
  client: 5,
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'Internal Review',
  client_review: 'Client Review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  blocked: 'Blocked',
  done: 'Done',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#6B7280',
  todo: '#9CA3AF',
  in_progress: '#3B82F6',
  in_review: '#F59E0B',
  client_review: '#8B5CF6',
  approved: '#10B981',
  scheduled: '#06B6D4',
  published: '#059669',
  blocked: '#EF4444',
  done: '#22C55E',
}

export const PLATFORM_LABELS: Record<ContentPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  blog: 'Blog',
  newsletter: 'Newsletter',
  other: 'Other',
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  content_ops: 'Content Operations',
  web_build: 'Web Build',
  full_service: 'Full Service',
}

export const DEFAULT_WEB_PHASES = [
  'Discovery',
  'Wireframing',
  'Design',
  'Development',
  'Testing',
  'Launch',
]

// Phase 2: Meeting constants
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  internal: 'Internal',
  client: 'Client',
  review: 'Review',
}

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const MEETING_STATUS_COLORS: Record<MeetingStatus, string> = {
  scheduled: '#3B82F6',
  in_progress: '#F59E0B',
  completed: '#22C55E',
  cancelled: '#6B7280',
}

export const BRIEF_TYPE_LABELS: Record<BriefType, string> = {
  content_brief: 'Content Brief',
  project_requirements: 'Project Requirements',
  change_request: 'Change Request',
}

// Phase 3: Automation constants
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_status_changed: 'Status Changed',
  comment_added: 'New Comment',
  due_date_approaching: 'Due Date Approaching',
  content_scheduled: 'Content Scheduled',
  content_published: 'Content Published',
  meeting_starting: 'Meeting Starting',
  meeting_ended: 'Meeting Ended',
  meeting_summary_ready: 'Meeting Summary Ready',
  chat_mention: 'Chat Mention',
  dm_received: 'Direct Message',
  thread_reply: 'Thread Reply',
}

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: 'In-App',
  email: 'Email',
  push: 'Push',
  slack: 'Slack',
  webhook: 'Webhook',
}

export const DIGEST_FREQUENCY_LABELS: Record<DigestFrequency, string> = {
  none: 'Off',
  daily: 'Daily Digest',
  weekly: 'Weekly Digest',
}

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  task_created: 'created a task',
  task_updated: 'updated a task',
  task_deleted: 'deleted a task',
  status_changed: 'changed status',
  assignment_changed: 'changed assignment',
  comment_added: 'added a comment',
  content_scheduled: 'scheduled content',
  content_published: 'published content',
  deliverable_uploaded: 'uploaded a deliverable',
  meeting_created: 'created a meeting',
  user_invited: 'invited a user',
  role_changed: 'changed a role',
  integration_connected: 'connected an integration',
  integration_disconnected: 'disconnected an integration',
  project_created: 'created a project',
  project_deleted: 'deleted a project',
  brief_approved: 'approved a brief',
  email_connected: 'connected an email account',
  email_disconnected: 'disconnected an email account',
  email_sent: 'sent an email',
  meeting_room_created: 'created a meeting room',
  meeting_session_started: 'started a meeting session',
  meeting_session_ended: 'ended a meeting session',
  calendar_connected: 'connected Google Calendar',
  calendar_disconnected: 'disconnected Google Calendar',
  transcript_imported: 'imported a transcript',
  message_sent: 'sent a chat message',
}

// Phase 3: Billing constants
export type FeatureGroup = {
  category: string
  features: string[]
}

export type PlanConfig = {
  name: string
  description: string
  basePrice: number       // monthly in cents
  seatPrice: number       // per additional seat in cents
  includedSeats: number
  maxSeats: number | null  // null = unlimited
  maxBrands: number | null // null = unlimited
  featureGroups: FeatureGroup[]
  features: string[]       // auto-flattened from featureGroups for backward compat
}

function buildPlanConfig(
  base: Omit<PlanConfig, 'features'>
): PlanConfig {
  return {
    ...base,
    features: base.featureGroups.flatMap((g) => g.features),
  }
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  starter: buildPlanConfig({
    name: 'Starter',
    description: 'For small teams getting started',
    basePrice: 0,
    seatPrice: 0,
    includedSeats: 3,
    maxSeats: 3,
    maxBrands: 3,
    featureGroups: [
      {
        category: 'Team & Collaboration',
        features: ['Up to 3 team members', 'Up to 3 brands'],
      },
      {
        category: 'Workflow',
        features: ['Content workflow', 'Kanban board'],
      },
      {
        category: 'Client Tools',
        features: ['Client portal'],
      },
      {
        category: 'AI & Intelligence',
        features: ['AI Agents (limited)'],
      },
    ],
  }),
  pro: buildPlanConfig({
    name: 'Pro',
    description: 'For growing agencies',
    basePrice: 4900,
    seatPrice: 1000,
    includedSeats: 1,
    maxSeats: 10,
    maxBrands: 10,
    featureGroups: [
      {
        category: 'Team & Collaboration',
        features: ['Up to 10 team members', 'Up to 10 brands', 'Meeting recordings'],
      },
      {
        category: 'Workflow',
        features: ['Everything in Starter', 'Gantt timeline', 'Advanced analytics'],
      },
      {
        category: 'Client Tools',
        features: ['Client portal'],
      },
      {
        category: 'AI & Intelligence',
        features: ['AI Agents', 'SEO research', 'Ad copy generator'],
      },
    ],
  }),
  agency: buildPlanConfig({
    name: 'Agency',
    description: 'For established agencies at scale',
    basePrice: 14900,
    seatPrice: 800,
    includedSeats: 1,
    maxSeats: null,
    maxBrands: null,
    featureGroups: [
      {
        category: 'Team & Collaboration',
        features: ['Unlimited team members', 'Unlimited brands', 'Meeting recordings'],
      },
      {
        category: 'Workflow',
        features: ['Everything in Pro', 'Custom workflows', 'Advanced reporting'],
      },
      {
        category: 'Client Tools',
        features: ['White-label portal', 'Custom client dashboards', 'Multi-client management'],
      },
      {
        category: 'AI & Intelligence',
        features: ['Advanced AI automation', 'Custom AI workflows'],
      },
      {
        category: 'Agency Scale',
        features: ['Priority support', 'API access'],
      },
    ],
  }),
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}

// Task Library: template type badge colors (Tailwind classes)
export const TASK_TYPE_COLORS: Record<string, string> = {
  audit: 'bg-gray-100 text-gray-700',
  planning: 'bg-blue-100 text-blue-700',
  design: 'bg-purple-100 text-purple-700',
  development: 'bg-cyan-100 text-cyan-700',
  testing: 'bg-yellow-100 text-yellow-700',
  review: 'bg-orange-100 text-orange-700',
  research: 'bg-green-100 text-green-700',
  setup: 'bg-teal-100 text-teal-700',
  strategy: 'bg-indigo-100 text-indigo-700',
  creation: 'bg-pink-100 text-pink-700',
  optimization: 'bg-amber-100 text-amber-700',
  execution: 'bg-emerald-100 text-emerald-700',
  delivery: 'bg-violet-100 text-violet-700',
  documentation: 'bg-slate-100 text-slate-700',
  reporting: 'bg-sky-100 text-sky-700',
  deployment: 'bg-red-100 text-red-700',
}

export const TASK_TYPE_LABELS: Record<string, string> = {
  audit: 'Audit',
  planning: 'Planning',
  design: 'Design',
  development: 'Dev',
  testing: 'Testing',
  review: 'Review',
  research: 'Research',
  setup: 'Setup',
  strategy: 'Strategy',
  creation: 'Creation',
  optimization: 'Optimization',
  execution: 'Execution',
  delivery: 'Delivery',
  documentation: 'Docs',
  reporting: 'Reporting',
  deployment: 'Deployment',
}

// ─── Team workload constants ─────────────────────────
export type WorkloadLevel = 'low' | 'medium' | 'high' | 'overloaded'

export const WORKLOAD_THRESHOLDS: {
  level: WorkloadLevel
  min: number
  max: number
  label: string
  color: string
  bgColor: string
  barColor: string
}[] = [
  { level: 'low', min: 0, max: 3, label: 'Low', color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900', barColor: 'bg-green-500' },
  { level: 'medium', min: 4, max: 7, label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900', barColor: 'bg-yellow-500' },
  { level: 'high', min: 8, max: 11, label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900', barColor: 'bg-orange-500' },
  { level: 'overloaded', min: 12, max: Infinity, label: 'Overloaded', color: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900', barColor: 'bg-red-500' },
]

export function getWorkloadLevel(activeTasks: number) {
  return WORKLOAD_THRESHOLDS.find((t) => activeTasks >= t.min && activeTasks <= t.max) ?? WORKLOAD_THRESHOLDS[0]
}

export const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  creator: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  developer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  client: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

// Department constants
export const DEPARTMENT_COLORS: Record<string, string> = {
  slate: '#64748B',
  red: '#EF4444',
  orange: '#F97316',
  amber: '#F59E0B',
  emerald: '#10B981',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  purple: '#A855F7',
  pink: '#EC4899',
  rose: '#F43F5E',
}

// ─── Queue pipeline columns ──────────────────────────
export const QUEUE_PIPELINE_COLUMNS = [
  {
    id: 'review',
    statuses: ['in_review', 'client_review'],
    label: 'In Review',
    color: '#F59E0B',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    canDragFrom: false,
    canDropTo: false,
  },
  {
    id: 'approved',
    statuses: ['approved'],
    label: 'Approved',
    color: '#10B981',
    bg: 'bg-green-50',
    border: 'border-green-300',
    dot: 'bg-green-500',
    canDragFrom: true,
    canDropTo: false,
  },
  {
    id: 'scheduled',
    statuses: ['scheduled'],
    label: 'Scheduled',
    color: '#06B6D4',
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    dot: 'bg-cyan-500',
    canDragFrom: true,
    canDropTo: true,
  },
  {
    id: 'published',
    statuses: ['published'],
    label: 'Published',
    color: '#059669',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
    canDragFrom: false,
    canDropTo: true,
  },
] as const

// ─── Calendar event type styling ─────────────────────
export const CALENDAR_EVENT_STYLES: Record<string, {
  bg: string
  border: string
  dot: string
  label: string
}> = {
  task: { bg: 'bg-blue-50', border: 'border-l-blue-500', dot: 'bg-blue-500', label: 'Task' },
  content: { bg: 'bg-cyan-50', border: 'border-l-cyan-500', dot: 'bg-cyan-500', label: 'Content' },
  meeting: { bg: 'bg-purple-50', border: 'border-l-purple-500', dot: 'bg-purple-500', label: 'Meeting' },
  calendar_event: { bg: 'bg-green-50', border: 'border-l-green-500', dot: 'bg-green-500', label: 'Calendar' },
}

export const DEFAULT_DEPARTMENTS = [
  { name: 'Strategy', color: '#6366F1', sort_order: 0 },
  { name: 'Client Success', color: '#10B981', sort_order: 1 },
  { name: 'Paid Media', color: '#F97316', sort_order: 2 },
  { name: 'SEO', color: '#06B6D4', sort_order: 3 },
  { name: 'Content & Creative', color: '#A855F7', sort_order: 4 },
  { name: 'Social Media', color: '#EC4899', sort_order: 5 },
  { name: 'Email & CRM', color: '#F59E0B', sort_order: 6 },
  { name: 'Development', color: '#3B82F6', sort_order: 7 },
]
