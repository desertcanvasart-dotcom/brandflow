import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { createLiveKitToken, roomService } from '@/lib/livekit/server'
import { triggerEmbedding, triggerEmbeddingDeletion } from '@/lib/ai/embedding-triggers'
import type { Database } from '@/types/database'

type MeetingRow = Database['public']['Tables']['meetings']['Row']
type ParticipantRow = Database['public']['Tables']['meeting_participants']['Row']

export const meetingRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      brandId: z.string().uuid().optional(),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('meetings')
        .select('*, meeting_participants(id, user_id, role), brands(id, name), projects(id, name)')
        .eq('organization_id', ctx.orgId)
        .order('scheduled_at', { ascending: false })

      if (input?.projectId) query = query.eq('project_id', input.projectId)
      if (input?.brandId) query = query.eq('brand_id', input.brandId)
      if (input?.status) query = query.eq('status', input.status)
      if (input?.dateFrom) query = query.gte('scheduled_at', input.dateFrom)
      if (input?.dateTo) query = query.lte('scheduled_at', input.dateTo)

      const { data } = await query.returns<(MeetingRow & {
        meeting_participants: { id: string; user_id: string; role: string }[]
        brands: { id: string; name: string } | null
        projects: { id: string; name: string } | null
      })[]>()
      return data ?? []
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meetings')
        .select('*, meeting_participants(id, user_id, role, joined_at, left_at)')
        .eq('id', input.id)
        .single<MeetingRow & { meeting_participants: ParticipantRow[] }>()

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' })
      return data
    }),

  create: managerProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      meetingType: z.enum(['internal', 'client', 'review']).optional(),
      scheduledAt: z.string(),
      durationMinutes: z.number().min(5).max(480).optional(),
      projectId: z.string().uuid().optional(),
      brandId: z.string().uuid().optional(),
      participantIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const roomId = `meeting-${nanoid(12)}`

      const { data: meeting, error } = await ctx.supabase
        .from('meetings')
        .insert({
          organization_id: ctx.orgId,
          title: input.title,
          description: input.description ?? null,
          meeting_type: input.meetingType ?? 'internal',
          scheduled_at: input.scheduledAt,
          duration_minutes: input.durationMinutes ?? 30,
          project_id: input.projectId ?? null,
          brand_id: input.brandId ?? null,
          livekit_room_id: roomId,
          created_by: ctx.user.id,
        })
        .select()
        .single<MeetingRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Add creator as host
      const participants = [
        { meeting_id: meeting.id, user_id: ctx.user.id, role: 'host' as const },
        ...(input.participantIds ?? [])
          .filter((id) => id !== ctx.user.id)
          .map((id) => ({ meeting_id: meeting.id, user_id: id, role: 'participant' as const })),
      ]

      await ctx.supabase.from('meeting_participants').insert(participants)

      return meeting
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      scheduledAt: z.string().optional(),
      durationMinutes: z.number().optional(),
      meetingType: z.enum(['internal', 'client', 'review']).optional(),
      transcript: z.string().optional(),
      summary: z.string().optional(),
      actionItems: z.array(z.record(z.string(), z.unknown())).optional(),
      recordingUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.title !== undefined) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      if (input.scheduledAt !== undefined) updates.scheduled_at = input.scheduledAt
      if (input.durationMinutes !== undefined) updates.duration_minutes = input.durationMinutes
      if (input.meetingType !== undefined) updates.meeting_type = input.meetingType
      if (input.transcript !== undefined) updates.transcript = input.transcript
      if (input.summary !== undefined) updates.summary = input.summary
      if (input.actionItems !== undefined) updates.action_items = input.actionItems
      if (input.recordingUrl !== undefined) updates.recording_url = input.recordingUrl

      const { data, error } = await ctx.supabase
        .from('meetings')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single<MeetingRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Embed transcript for RAG when it's saved
      if (input.transcript && data) {
        triggerEmbedding(ctx.orgId, 'meeting_transcript', data.id, input.transcript)
      }

      return data
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Clean up embeddings before deleting
      triggerEmbeddingDeletion('meeting_transcript', input.id)

      const { error } = await ctx.supabase.from('meetings').delete().eq('id', input.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  addParticipant: managerProcedure
    .input(z.object({
      meetingId: z.string().uuid(),
      userId: z.string().uuid(),
      role: z.enum(['participant', 'viewer']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('meeting_participants')
        .insert({
          meeting_id: input.meetingId,
          user_id: input.userId,
          role: input.role ?? 'participant',
        })

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  removeParticipant: managerProcedure
    .input(z.object({
      meetingId: z.string().uuid(),
      userId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', input.meetingId)
        .eq('user_id', input.userId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  getToken: orgProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify user is a participant
      const { data: participant } = await ctx.supabase
        .from('meeting_participants')
        .select('role')
        .eq('meeting_id', input.meetingId)
        .eq('user_id', ctx.user.id)
        .single<{ role: string }>()

      if (!participant) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a participant of this meeting' })
      }

      const { data: meeting } = await ctx.supabase
        .from('meetings')
        .select('livekit_room_id')
        .eq('id', input.meetingId)
        .single<{ livekit_room_id: string }>()

      if (!meeting?.livekit_room_id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting room not found' })
      }

      // Lazy-create room
      try {
        await roomService.createRoom({ name: meeting.livekit_room_id })
      } catch {
        // Room may already exist, that's fine
      }

      const memberName = ctx.user.user_metadata?.display_name ?? ctx.user.email ?? 'User'
      const canPublish = participant.role !== 'viewer'

      const token = await createLiveKitToken(
        meeting.livekit_room_id,
        ctx.user.id,
        memberName,
        canPublish
      )

      return {
        token,
        serverUrl: process.env.LIVEKIT_URL ?? '',
      }
    }),

  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is host
      const { data: participant } = await ctx.supabase
        .from('meeting_participants')
        .select('role')
        .eq('meeting_id', input.id)
        .eq('user_id', ctx.user.id)
        .single<{ role: string }>()

      if (!participant || participant.role !== 'host') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only the host can change meeting status' })
      }

      const { data, error } = await ctx.supabase
        .from('meetings')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single<MeetingRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  upcoming: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('meetings')
        .select('*, meeting_participants!inner(user_id), brands(id, name), projects(id, name)')
        .eq('organization_id', ctx.orgId)
        .eq('meeting_participants.user_id', ctx.user.id)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      return data ?? []
    }),
})
