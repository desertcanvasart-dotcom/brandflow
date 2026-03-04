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
export type EmbeddingSourceType = 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment'

// Phase 3: Automation enums
export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'due_date_approaching'
  | 'content_scheduled'
  | 'content_published'
  | 'meeting_starting'

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

export type ActivityEntityType = 'task' | 'comment' | 'content_item' | 'deliverable' | 'project' | 'meeting'

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
