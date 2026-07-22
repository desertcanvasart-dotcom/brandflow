import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { generateICSFile } from '@/lib/calendar/ics'
import { sendEmail } from '@/lib/email/send'
import { meetingInviteEmail } from '@/lib/email/templates'
import type { Database } from '@/types/database'

type ContentItemRow = Database['public']['Tables']['content_items']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']
type CalendarEventRow = Database['public']['Tables']['calendar_events']['Row']

export const calendarRouter = createTRPCRouter({
  getTasksByRange: orgProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      brandId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('tasks')
        .select('*, projects!inner(organization_id, brand_id, name, brands(name, logo_url))')
        .not('due_date', 'is', null)
        .gte('due_date', input.startDate)
        .lte('due_date', input.endDate)
        .returns<(TaskRow & {
          projects: {
            organization_id: string
            brand_id: string
            name: string
            brands: { name: string; logo_url: string | null }
          }
        })[]>()

      let filtered = (data ?? []).filter(
        (t) => t.projects.organization_id === ctx.orgId
      )

      if (input.brandId) {
        filtered = filtered.filter((t) => t.projects.brand_id === input.brandId)
      }

      return filtered
    }),

  getContentByRange: orgProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      brandId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Get all tasks with content items that have scheduled_at in range
      const query = ctx.supabase
        .from('content_items')
        .select('*, tasks!inner(*, projects!inner(organization_id, brand_id, brands(name, logo_url)))')
        .gte('scheduled_at', input.startDate)
        .lte('scheduled_at', input.endDate)

      const { data } = await query.returns<(ContentItemRow & {
        tasks: TaskRow & {
          projects: {
            organization_id: string
            brand_id: string
            brands: { name: string; logo_url: string | null }
          }
        }
      })[]>()

      // Filter by org
      const filtered = (data ?? []).filter(
        (item) => item.tasks.projects.organization_id === ctx.orgId
      )

      // Filter by brand if specified
      if (input.brandId) {
        return filtered.filter(
          (item) => item.tasks.projects.brand_id === input.brandId
        )
      }

      return filtered
    }),

  reschedule: orgProcedure
    .input(z.object({
      contentItemId: z.string().uuid(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('content_items')
        .update({ scheduled_at: input.scheduledAt })
        .eq('id', input.contentItemId)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Auto-transition parent task to 'scheduled'
      if (data) {
        await ctx.supabase
          .from('tasks')
          .update({ status: 'scheduled' as const })
          .eq('id', data.task_id)
      }

      return data
    }),

  // Calendar events CRUD
  getEvents: orgProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('calendar_events')
        .select('*, calendar_event_attendees(id, user_id, email, name, status)')
        .eq('organization_id', ctx.orgId)
        .gte('starts_at', input.startDate)
        .lte('starts_at', input.endDate)
        .order('starts_at', { ascending: true })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data ?? []
    }),

  createEvent: managerProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      startsAt: z.string(),
      endsAt: z.string(),
      isAllDay: z.boolean().default(false),
      location: z.string().optional(),
      color: z.string().optional(),
      meetingId: z.string().uuid().optional(),
      roomId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('calendar_events')
        .insert({
          organization_id: ctx.orgId,
          title: input.title,
          description: input.description ?? null,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          is_all_day: input.isAllDay,
          location: input.location ?? null,
          color: input.color ?? null,
          meeting_id: input.meetingId ?? null,
          room_id: input.roomId ?? null,
          created_by: ctx.user.id,
        })
        .select()
        .single<CalendarEventRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to create event' })
      }

      return data
    }),

  updateEvent: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      isAllDay: z.boolean().optional(),
      location: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, startsAt, endsAt, isAllDay, ...rest } = input
      const updateData: Record<string, unknown> = { ...rest }
      if (startsAt !== undefined) updateData.starts_at = startsAt
      if (endsAt !== undefined) updateData.ends_at = endsAt
      if (isAllDay !== undefined) updateData.is_all_day = isAllDay

      const { data, error } = await ctx.supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<CalendarEventRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to update event' })
      }

      return data
    }),

  deleteEvent: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('calendar_events')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true }
    }),

  sendInvite: managerProcedure
    .input(z.object({
      meetingTitle: z.string().min(1),
      scheduledAt: z.string(),
      durationMinutes: z.number().min(5),
      meetingUrl: z.string(),
      description: z.string().optional(),
      attendeeEmails: z.array(z.string().email()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the organizer's name
      const { data: member } = await ctx.supabase
        .from('organization_members')
        .select('display_name')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .single()

      const organizerName = member?.display_name ?? 'Team Member'

      // Get organizer's email
      const { data: { user } } = await ctx.supabase.auth.getUser()
      const organizerEmail = user?.email ?? 'noreply@agencybeats.app'

      // Generate ICS file
      const icsContent = generateICSFile({
        title: input.meetingTitle,
        description: input.description,
        startTime: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes,
        meetingUrl: input.meetingUrl,
        organizerName,
        organizerEmail,
        attendeeEmails: input.attendeeEmails,
      })

      // Generate email template
      const { subject, html } = meetingInviteEmail({
        meetingTitle: input.meetingTitle,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        meetingUrl: input.meetingUrl,
        organizerName,
        description: input.description,
      })

      // Send to each attendee
      const results = await Promise.allSettled(
        input.attendeeEmails.map((email) =>
          sendEmail({
            to: email,
            subject,
            html,
            attachments: [
              {
                filename: 'invite.ics',
                content: Buffer.from(icsContent, 'utf-8'),
              },
            ],
          })
        )
      )

      const sent = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.filter((r) => r.status === 'rejected').length

      return { sent, failed }
    }),
})
