import { createTRPCRouter, publicProcedure } from '../init'
import { authRouter } from './auth'
import { organizationRouter } from './organization'
import { memberRouter } from './member'
import { departmentRouter } from './department'
import { brandRouter } from './brand'
import { assetRouter } from './asset'
import { projectRouter } from './project'
import { phaseRouter } from './phase'
import { taskRouter } from './task'
import { contentRouter } from './content'
import { commentRouter } from './comment'
import { deliverableRouter } from './deliverable'
import { calendarRouter } from './calendar'
import { portalRouter } from './portal'
// Phase 2
import { meetingRouter } from './meeting'
import { briefRouter } from './brief'
import { annotationRouter } from './annotation'
import { searchRouter } from './search'
import { brandContactRouter } from './brand-contact'
import { analyticsRouter } from './analytics'
// Phase 3
import { notificationRouter } from './notification'
import { activityRouter } from './activity'
import { automationRouter } from './automation'
import { figmaRouter } from './figma'
import { billingRouter } from './billing'
// AI Enrichment
import { brandStrategyRouter } from './brand-strategy'
import { aiOutputRouter } from './ai-output'
// Intake & Briefs
import { intakeRouter } from './intake'
// Knowledge Base
import { knowledgeBaseRouter } from './knowledge-base'
// Task Library
import { taskLibraryRouter } from './task-library'
// Task Assembly
import { projectTasksRouter } from './project-tasks'
// Settings
import { settingsRouter } from './settings'
// Email Integration
import { emailRouter } from './email'
// Meeting Rooms
import { meetingRoomRouter } from './meeting-room'
// Super Admin
import { superAdminRouter } from './super-admin'
// Team Chat
import { chatRouter } from './chat'
// Social Media Publishing
import { socialRouter } from './social'

export const appRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => 'ok'),
  auth: authRouter,
  organization: organizationRouter,
  member: memberRouter,
  department: departmentRouter,
  brand: brandRouter,
  asset: assetRouter,
  project: projectRouter,
  phase: phaseRouter,
  task: taskRouter,
  content: contentRouter,
  comment: commentRouter,
  deliverable: deliverableRouter,
  calendar: calendarRouter,
  portal: portalRouter,
  // Phase 2
  meeting: meetingRouter,
  brief: briefRouter,
  annotation: annotationRouter,
  search: searchRouter,
  brandContact: brandContactRouter,
  analytics: analyticsRouter,
  // Phase 3
  notification: notificationRouter,
  activity: activityRouter,
  automation: automationRouter,
  figma: figmaRouter,
  billing: billingRouter,
  // AI Enrichment
  brandStrategy: brandStrategyRouter,
  aiOutput: aiOutputRouter,
  // Intake & Briefs
  intake: intakeRouter,
  // Knowledge Base
  knowledgeBase: knowledgeBaseRouter,
  // Task Library
  taskLibrary: taskLibraryRouter,
  // Task Assembly
  projectTasks: projectTasksRouter,
  // Settings
  settings: settingsRouter,
  // Email Integration
  email: emailRouter,
  // Meeting Rooms
  meetingRoom: meetingRoomRouter,
  // Super Admin
  superAdmin: superAdminRouter,
  // Team Chat
  chat: chatRouter,
  // Social Media Publishing
  social: socialRouter,
})

export type AppRouter = typeof appRouter
