import { createTRPCRouter, publicProcedure } from '../init'
import { authRouter } from './auth'
import { organizationRouter } from './organization'
import { memberRouter } from './member'
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

export const appRouter = createTRPCRouter({
  healthcheck: publicProcedure.query(() => 'ok'),
  auth: authRouter,
  organization: organizationRouter,
  member: memberRouter,
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
})

export type AppRouter = typeof appRouter
