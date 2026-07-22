export type UserRole = 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'

export type ProjectType = 'content_ops' | 'web_build' | 'full_service'

export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'client_review'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'blocked'
  | 'done'

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'

export type ContentPlatform =
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'blog'
  | 'newsletter'
  | 'other'

export type DeliverableType =
  | 'wireframe'
  | 'mockup'
  | 'prototype'
  | 'code'
  | 'document'
  | 'asset'
  | 'other'

export type DeliverableStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'final'

export type AssetType = 'logo' | 'image' | 'video' | 'document' | 'font' | 'icon' | 'template' | 'other'

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

// Phase 2 enums
export type MeetingType = 'internal' | 'client' | 'review'
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type MeetingParticipantRole = 'host' | 'participant' | 'viewer'
export type BriefType = 'content_brief' | 'project_requirements' | 'change_request'
export type AnnotationType = 'pin' | 'rectangle' | 'arrow'
export type EmbeddingSourceType = 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment' | 'document'

// Phase 3: Automation enums
export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'due_date_approaching'
  | 'content_scheduled'
  | 'content_published'
  | 'meeting_starting'
  | 'meeting_ended'
  | 'meeting_summary_ready'
  | 'chat_mention'
  | 'dm_received'
  | 'thread_reply'
  | 'social_published'
  | 'social_publish_failed'

export type ActivityAction =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'status_changed'
  | 'assignment_changed'
  | 'comment_added'
  | 'content_scheduled'
  | 'content_published'
  | 'deliverable_uploaded'
  | 'meeting_created'
  | 'user_invited'
  | 'role_changed'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'project_created'
  | 'project_deleted'
  | 'brief_approved'
  | 'email_connected'
  | 'email_disconnected'
  | 'email_sent'
  | 'meeting_room_created'
  | 'meeting_session_started'
  | 'meeting_session_ended'
  | 'calendar_connected'
  | 'calendar_disconnected'
  | 'transcript_imported'
  | 'message_sent'
  | 'social_connected'
  | 'social_disconnected'
  | 'social_published'
  | 'social_publish_failed'

export type ActivityEntityType = 'task' | 'comment' | 'content_item' | 'deliverable' | 'project' | 'meeting' | 'member' | 'organization' | 'integration' | 'email' | 'meeting_room' | 'meeting_session' | 'calendar' | 'channel'

// Email Integration enums
export type EmailProvider = 'gmail' | 'outlook'

// Phase 3: Notification V2 enums
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'slack' | 'webhook'
export type DigestFrequency = 'none' | 'daily' | 'weekly'
export type NotificationActionType = 'approve_task' | 'reject_task' | 'mark_complete' | 'acknowledge'
export type IntegrationType = 'slack' | 'webhook'
export type NotificationEventType = 'delivered' | 'opened' | 'clicked' | 'failed'

// Phase 3: Billing enums
export type SubscriptionPlan = 'starter' | 'pro' | 'agency'
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'paused'

// AI Enrichment enums
export type AIOutputType = 'ad_copy' | 'seo_research' | 'performance_report' | 'competitor_analysis' | 'cta_suggestion'
export type AIOutputStatus = 'generated' | 'saved' | 'discarded' | 'used'

// Intake & Briefs enums
export type ServiceType =
  | 'website'
  | 'seo'
  | 'content'
  | 'social'
  | 'paid_ads'
  | 'email'
  | 'branding'
  | 'cro'
  | 'analytics'
  | 'strategy'

export const SERVICE_TYPES: ServiceType[] = [
  'website', 'seo', 'content', 'social', 'paid_ads',
  'email', 'branding', 'cro', 'analytics', 'strategy',
]

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  website: 'Website',
  seo: 'SEO',
  content: 'Content',
  social: 'Social Media',
  paid_ads: 'Paid Ads',
  email: 'Email Marketing',
  branding: 'Branding',
  cro: 'CRO',
  analytics: 'Analytics',
  strategy: 'Strategy',
}

export type IntakeStatus = 'draft' | 'reviewed' | 'approved'
export type BriefStatus = 'draft' | 'in_review' | 'approved' | 'active' | 'complete'
export type IntakeConfidence = 'high' | 'medium' | 'low'

// Stage 2: Task Assembly enums
export const TASK_TYPES = [
  'Admin', 'Meeting', 'Research', 'Planning', 'Deliverable',
  'Design', 'Dev', 'Copywriting', 'QA', 'Optimization',
  'Outreach', 'Operations', 'Video', 'Review', 'Docs',
  'Strategy', 'Delivery', 'Audit', 'Setup', 'Creation',
  'Execution', 'Reporting', 'Testing',
] as const

export const PROJECT_TASK_STATUSES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
  BLOCKED: 'blocked',
} as const

export const PROJECT_HEALTH = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  DELAYED: 'delayed',
} as const

export type ProjectHealth = (typeof PROJECT_HEALTH)[keyof typeof PROJECT_HEALTH]

// Meeting Rooms & Sessions enums
export type MeetingSessionSource = 'internal' | 'zoom' | 'google_meet' | 'teams' | 'upload'
export type CalendarAttendeeStatus = 'pending' | 'accepted' | 'declined' | 'tentative'
export type TranscriptChatRole = 'user' | 'assistant'

// Team Chat enums
export type ChannelType = 'project' | 'direct' | 'general' | 'announcement'
