import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { createTRPCRouter, baseProcedure, orgProcedure, managerProcedure } from '../init'
import { createLiveKitToken, roomService } from '@/lib/livekit/server'
import { logActivity } from '@/lib/activity/log'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateRoomSlug } from '@/lib/utils'
import type { Database } from '@/types/database'

type MeetingRoomRow = Database['public']['Tables']['meeting_rooms']['Row']
type MeetingSessionRow = Database['public']['Tables']['meeting_sessions']['Row']
type SessionParticipantRow = Database['public']['Tables']['session_participants']['Row']
type TranscriptChatRow = Database['public']['Tables']['transcript_chat_messages']['Row']

// Join types for Supabase queries
type SessionWithParticipants = MeetingSessionRow & {
  session_participants: SessionParticipantRow[]
}

type RoomWithProject = MeetingRoomRow & {
  projects: { id: string; name: string } | null
}

export const meetingRoomRouter = createTRPCRouter({
  // Get room by project ID
  getByProjectId: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meeting_rooms')
        .select('*, projects(id, name)')
        .eq('organization_id', ctx.orgId)
        .eq('project_id', input.projectId)
        .single<RoomWithProject>()

      if (error && error.code !== 'PGRST116') {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data
    }),

  // Public lookup by slug (for guest access)
  getBySlug: baseProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabaseAdmin
        .from('meeting_rooms')
        .select('id, slug, name, livekit_room_id, is_active, organization_id, projects(id, name), organizations(name)')
        .eq('slug', input.slug)
        .single()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting room not found' })
      }

      // Only return non-sensitive info
      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        isActive: data.is_active,
        projectName: (data as any).projects?.name ?? null,
        organizationName: (data as any).organizations?.name ?? null,
      }
    }),

  // Create a meeting room manually
  create: managerProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if room already exists for this project
      const { data: existing } = await ctx.supabase
        .from('meeting_rooms')
        .select('id')
        .eq('project_id', input.projectId)
        .single()

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Room already exists for this project' })
      }

      // Get project name for slug/name
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('name')
        .eq('id', input.projectId)
        .single()

      const projectName = project?.name ?? 'Project'
      const roomName = input.name ?? `${projectName} Room`
      const slug = generateRoomSlug(projectName)

      const { data, error } = await ctx.supabase
        .from('meeting_rooms')
        .insert({
          organization_id: ctx.orgId,
          project_id: input.projectId,
          slug,
          name: roomName,
          livekit_room_id: `room-${nanoid(12)}`,
        })
        .select()
        .single<MeetingRoomRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to create room' })
      }

      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'meeting_room_created',
        entityType: 'meeting_room',
        entityId: data.id,
        projectId: input.projectId,
        metadata: { name: roomName, slug },
      })

      return data
    }),

  // List sessions for a room
  listSessions: orgProcedure
    .input(z.object({
      roomId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('meeting_sessions')
        .select('*, session_participants(id, user_id, guest_name, role, identity, is_present)')
        .eq('room_id', input.roomId)
        .order('started_at', { ascending: false })
        .limit(input.limit + 1)

      if (input.cursor) {
        const { data: cursorSession } = await ctx.supabase
          .from('meeting_sessions')
          .select('started_at')
          .eq('id', input.cursor)
          .single()

        if (cursorSession) {
          query = query.lt('started_at', (cursorSession as any).started_at)
        }
      }

      const { data, error } = await query.returns<SessionWithParticipants[]>()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const items = data ?? []
      const hasMore = items.length > input.limit
      if (hasMore) items.pop()

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      }
    }),

  // Get session detail with transcript + participants
  getSession: orgProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('meeting_sessions')
        .select('*, session_participants(*), meeting_rooms!inner(organization_id)')
        .eq('id', input.sessionId)
        .single()
        .returns<MeetingSessionRow & { session_participants: SessionParticipantRow[]; meeting_rooms: { organization_id: string } }>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      return data
    }),

  // Create a new session in a room
  createSession: orgProcedure
    .input(z.object({
      roomId: z.string().uuid(),
      meetingId: z.string().uuid().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the room belongs to this org
      const { data: room } = await ctx.supabase
        .from('meeting_rooms')
        .select('id, livekit_room_id')
        .eq('id', input.roomId)
        .eq('organization_id', ctx.orgId)
        .single<MeetingRoomRow>()

      if (!room) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' })
      }

      // Create the LiveKit room if it doesn't exist
      try {
        await roomService.createRoom({ name: room.livekit_room_id })
      } catch {
        // Room may already exist, continue
      }

      const sessionTitle = input.title ?? `Session - ${new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })}`

      const { data, error } = await ctx.supabase
        .from('meeting_sessions')
        .insert({
          room_id: input.roomId,
          meeting_id: input.meetingId ?? null,
          title: sessionTitle,
          source: 'internal',
        })
        .select()
        .single<MeetingSessionRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to create session' })
      }

      // Add the creator as a host participant
      await ctx.supabase.from('session_participants').insert({
        session_id: data.id,
        user_id: ctx.user.id,
        role: 'host',
        identity: ctx.user.id,
        is_present: true,
        joined_at: new Date().toISOString(),
      })

      // Generate a LiveKit token for the creator
      const { data: member } = await ctx.supabase
        .from('organization_members')
        .select('display_name')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .single()

      const token = await createLiveKitToken(
        room.livekit_room_id,
        ctx.user.id,
        member?.display_name ?? 'Host',
        true,
      )

      return {
        session: data,
        token,
        serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      }
    }),

  // Update a session (notes, transcript, summary)
  updateSession: orgProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      title: z.string().optional(),
      notes: z.string().optional(),
      transcript_text: z.string().optional(),
      summary: z.string().optional(),
      action_items: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, ...updateData } = input

      const { data, error } = await ctx.supabase
        .from('meeting_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select()
        .single<MeetingSessionRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to update session' })
      }

      return data
    }),

  // End a session
  endSession: orgProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: session } = await ctx.supabase
        .from('meeting_sessions')
        .select('started_at')
        .eq('id', input.sessionId)
        .single()

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
      }

      const startedAt = new Date(session.started_at)
      const endedAt = new Date()
      const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)

      const { data, error } = await ctx.supabase
        .from('meeting_sessions')
        .update({
          ended_at: endedAt.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', input.sessionId)
        .select()
        .single<MeetingSessionRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to end session' })
      }

      // Mark all participants as not present
      await ctx.supabase
        .from('session_participants')
        .update({ is_present: false, left_at: endedAt.toISOString() })
        .eq('session_id', input.sessionId)
        .is('left_at', null)

      // Post system message to project chat
      const { data: room } = await ctx.supabase
        .from('meeting_rooms')
        .select('project_id')
        .eq('id', data.room_id)
        .single<{ project_id: string }>()

      if (room?.project_id) {
        const durationMin = Math.round((data.duration_seconds ?? 0) / 60)
        import('@/lib/chat/system-message').then(({ insertSystemMessage }) =>
          insertSystemMessage({
            supabase: ctx.supabase,
            projectId: room.project_id,
            event: 'meeting_completed',
            content: `Meeting session ended (${durationMin} min)`,
          })
        ).catch(() => {})
      }

      return data
    }),

  // Import external transcript (Zoom, Google Meet, etc.)
  importTranscript: managerProcedure
    .input(z.object({
      roomId: z.string().uuid(),
      title: z.string().min(1),
      source: z.enum(['zoom', 'google_meet', 'teams', 'upload']),
      transcriptText: z.string().min(1),
      externalMeetingId: z.string().optional(),
      date: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify room ownership
      const { data: room } = await ctx.supabase
        .from('meeting_rooms')
        .select('id, organization_id')
        .eq('id', input.roomId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!room) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' })
      }

      const sessionDate = input.date ? new Date(input.date) : new Date()

      const { data, error } = await ctx.supabase
        .from('meeting_sessions')
        .insert({
          room_id: input.roomId,
          title: input.title,
          source: input.source,
          transcript_text: input.transcriptText,
          external_meeting_id: input.externalMeetingId ?? null,
          started_at: sessionDate.toISOString(),
          ended_at: sessionDate.toISOString(),
        })
        .select()
        .single<MeetingSessionRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to import transcript' })
      }

      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'transcript_imported',
        entityType: 'meeting_session',
        entityId: data.id,
        metadata: { source: input.source, title: input.title },
      })

      return data
    }),

  // Get LiveKit token for an authenticated user joining a room
  getToken: orgProcedure
    .input(z.object({ roomId: z.string().uuid(), sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: room } = await ctx.supabase
        .from('meeting_rooms')
        .select('livekit_room_id')
        .eq('id', input.roomId)
        .eq('organization_id', ctx.orgId)
        .single<MeetingRoomRow>()

      if (!room) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Room not found' })
      }

      // Ensure user is tracked as participant
      const { data: existing } = await ctx.supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', input.sessionId)
        .eq('user_id', ctx.user.id)
        .single()

      if (!existing) {
        await ctx.supabase.from('session_participants').insert({
          session_id: input.sessionId,
          user_id: ctx.user.id,
          role: 'participant',
          identity: ctx.user.id,
          is_present: true,
          joined_at: new Date().toISOString(),
        })
      } else {
        await ctx.supabase
          .from('session_participants')
          .update({ is_present: true, joined_at: new Date().toISOString(), left_at: null })
          .eq('id', existing.id)
      }

      const { data: member } = await ctx.supabase
        .from('organization_members')
        .select('display_name')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .single()

      const token = await createLiveKitToken(
        room.livekit_room_id,
        ctx.user.id,
        member?.display_name ?? 'Participant',
        true,
      )

      return {
        token,
        serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
      }
    }),

  // Transcript chat history
  getChatHistory: orgProcedure
    .input(z.object({
      sessionId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('transcript_chat_messages')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: true })
        .limit(input.limit)

      if (input.sessionId) {
        query = query.eq('session_id', input.sessionId)
      } else if (input.projectId) {
        query = query.eq('project_id', input.projectId)
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'sessionId or projectId required' })
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return data ?? []
    }),

  // Save chat message
  saveChatMessage: orgProcedure
    .input(z.object({
      sessionId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.sessionId && !input.projectId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'sessionId or projectId required' })
      }

      const { data, error } = await ctx.supabase
        .from('transcript_chat_messages')
        .insert({
          organization_id: ctx.orgId,
          session_id: input.sessionId ?? null,
          project_id: input.projectId ?? null,
          user_id: ctx.user.id,
          role: input.role,
          content: input.content,
          metadata: input.metadata ?? {},
        })
        .select()
        .single<TranscriptChatRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to save message' })
      }

      return data
    }),
})
