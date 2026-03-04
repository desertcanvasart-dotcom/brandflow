import type {
  UserRole,
  TaskStatus,
  ContentPlatform,
  ProjectType,
  MeetingType,
  MeetingStatus,
  BriefType,
  NotificationType,
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
}

// Phase 3: Billing constants
export type PlanConfig = {
  name: string
  description: string
  basePrice: number       // monthly in cents
  seatPrice: number       // per additional seat in cents
  includedSeats: number
  maxSeats: number | null  // null = unlimited
  maxBrands: number | null // null = unlimited
  features: string[]
}

export const PLAN_CONFIGS: Record<SubscriptionPlan, PlanConfig> = {
  starter: {
    name: 'Starter',
    description: 'For small teams getting started',
    basePrice: 0,
    seatPrice: 0,
    includedSeats: 3,
    maxSeats: 3,
    maxBrands: 3,
    features: [
      'Up to 3 team members',
      'Up to 3 brands',
      'Content workflow',
      'Kanban board',
      'Client portal',
    ],
  },
  pro: {
    name: 'Pro',
    description: 'For growing agencies',
    basePrice: 4900,
    seatPrice: 1000,
    includedSeats: 1,
    maxSeats: 10,
    maxBrands: 10,
    features: [
      'Up to 10 team members',
      'Up to 10 brands',
      'Everything in Starter',
      'Gantt timeline',
      'AI content drafting',
      'Meeting recordings',
      'Advanced analytics',
    ],
  },
  agency: {
    name: 'Agency',
    description: 'For established agencies at scale',
    basePrice: 14900,
    seatPrice: 800,
    includedSeats: 1,
    maxSeats: null,
    maxBrands: null,
    features: [
      'Unlimited team members',
      'Unlimited brands',
      'Everything in Pro',
      'White-label portal',
      'Priority support',
      'Custom workflows',
      'API access',
    ],
  },
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  starter: 'Starter',
  pro: 'Pro',
  agency: 'Agency',
}
