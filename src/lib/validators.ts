import { z } from 'zod/v4'

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
})

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  platforms: z.array(z.string()).optional(),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  type: z.enum(['content_ops', 'web_build', 'full_service']),
  brandId: z.string().uuid(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  estimatedHours: z.number().optional(),
})

export const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  body: z.string().min(1, 'Comment cannot be empty'),
  isInternal: z.boolean().optional(),
  parentId: z.string().uuid().optional(),
})

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'manager', 'creator', 'developer', 'viewer']),
})

export const updateBrandGuidelinesSchema = z.object({
  brandId: z.string().uuid(),
  guidelines: z.record(z.string(), z.unknown()).optional(),
  colors: z.array(z.object({
    name: z.string(),
    hex: z.string(),
    usage: z.string().optional(),
  })).optional(),
  fonts: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    usage: z.string().optional(),
  })).optional(),
})

// Phase 2 validators
export const createMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required'),
  description: z.string().optional(),
  meetingType: z.enum(['internal', 'client', 'review']),
  scheduledAt: z.string(),
  durationMinutes: z.number().min(5).max(480).optional(),
  projectId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  participantIds: z.array(z.string().uuid()).optional(),
})

export const createBriefSchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  type: z.enum(['content_brief', 'project_requirements', 'change_request']),
  title: z.string().min(1, 'Brief title is required'),
  body: z.record(z.string(), z.unknown()).optional(),
  sourceMeetingId: z.string().uuid().optional(),
  generatedByAi: z.boolean().optional(),
})

export const createAnnotationSchema = z.object({
  deliverableId: z.string().uuid(),
  type: z.enum(['pin', 'rectangle', 'arrow']).optional(),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(0).max(100).optional(),
  heightPercent: z.number().min(0).max(100).optional(),
  body: z.string().min(1, 'Annotation text is required'),
  version: z.number().optional(),
})
