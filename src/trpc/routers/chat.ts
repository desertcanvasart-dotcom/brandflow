import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import { logActivity } from '@/lib/activity/log'
import { createNotification, createNotifications } from '@/lib/notifications/create'
import { createPresignedUploadUrl } from '@/lib/r2/presign'
import { insertSystemMessage, insertSystemMessageByChannel } from '@/lib/chat/system-message'
import type { Database } from '@/types/database'

type ChannelRow = Database['public']['Tables']['channels']['Row']
type MessageRow = Database['public']['Tables']['channel_messages']['Row']
type DecisionRow = Database['public']['Tables']['project_decisions']['Row']

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip',
]

export interface MessageWithUser extends MessageRow {
  user: {
    id: string
    display_name: string
    avatar_url: string | null
  } | null
}

// Parse @mentions from content: @[Display Name](userId)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

function parseMentions(content: string): string[] {
  const userIds: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags)
  while ((match = regex.exec(content)) !== null) {
    userIds.push(match[2])
  }
  return [...new Set(userIds)]
}

export const chatRouter = createTRPCRouter({
  // ── Get channel by project ──────────────────────────────────
  getChannelByProject: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('type', 'project')
        .maybeSingle<ChannelRow>()

      if (!channel) return null

      // Get unread count
      const { data: cursor } = await ctx.supabase
        .from('unread_cursors')
        .select('last_read_at')
        .eq('user_id', ctx.user.id)
        .eq('channel_id', channel.id)
        .maybeSingle<{ last_read_at: string }>()

      let unreadCount = 0
      if (cursor?.last_read_at) {
        const { count } = await ctx.supabase
          .from('channel_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .gt('created_at', cursor.last_read_at)
          .neq('user_id', ctx.user.id)

        unreadCount = count ?? 0
      } else {
        // No cursor = never read = all messages are unread (excluding own)
        const { count } = await ctx.supabase
          .from('channel_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .neq('user_id', ctx.user.id)

        unreadCount = count ?? 0
      }

      return { channel, unreadCount }
    }),

  // ── Get messages (cursor-based pagination) ──────────────────
  getMessages: orgProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify channel belongs to org
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      // Fetch top-level messages only (exclude thread replies)
      let query = ctx.supabase
        .from('channel_messages')
        .select('*')
        .eq('channel_id', input.channelId)
        .is('parent_message_id', null)
        .order('created_at', { ascending: false })
        .limit(input.limit + 1) // Fetch one extra to determine if there are more

      if (input.cursor) {
        query = query.lt('created_at', input.cursor)
      }

      const { data: rawMessages, error } = await query

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      const messages = (rawMessages ?? []) as MessageRow[]
      const hasMore = messages.length > input.limit
      const items = messages.slice(0, input.limit)

      // Batch-lookup user profiles
      const userIds = [...new Set(items.filter((m) => m.user_id).map((m) => m.user_id!))]
      const userMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>()

      if (userIds.length > 0) {
        const { data: members } = await ctx.supabase
          .from('organization_members')
          .select('user_id, display_name, avatar_url')
          .eq('organization_id', ctx.orgId)
          .in('user_id', userIds)

        type MemberProfile = { user_id: string; display_name: string | null; avatar_url: string | null }
        const typedMembers = (members ?? []) as MemberProfile[]
        typedMembers.forEach((m) => {
          userMap.set(m.user_id, {
            id: m.user_id,
            display_name: m.display_name ?? 'Unknown',
            avatar_url: m.avatar_url ?? null,
          })
        })
      }

      // Attach user data and reverse to chronological order
      const messagesWithUsers: MessageWithUser[] = items
        .map((msg) => ({
          ...msg,
          user: msg.user_id ? userMap.get(msg.user_id) ?? null : null,
        }))
        .reverse()

      return {
        messages: messagesWithUsers,
        nextCursor: hasMore ? items[items.length - 1]?.created_at ?? null : null,
      }
    }),

  // ── Send message ────────────────────────────────────────────
  sendMessage: orgProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        content: z.string().min(1).max(10000),
        attachments: z
          .array(
            z.object({
              type: z.enum(['task', 'brief', 'meeting', 'file']),
              id: z.string(),
              title: z.string().optional(),
              service: z.string().optional(),
              serviceType: z.string().optional(),
              status: z.string().optional(),
              fieldsFilled: z.number().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify channel belongs to org and get project_id
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id, project_id, name, type')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id' | 'project_id' | 'name' | 'type'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      // Announcement channels: only admins can post
      if (channel.type === 'announcement' && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can post in announcements' })
      }

      // Parse @mentions
      const mentionedUserIds = parseMentions(input.content)

      // Insert message
      const { data: message, error } = await ctx.supabase
        .from('channel_messages')
        .insert({
          channel_id: input.channelId,
          user_id: ctx.user.id,
          content: input.content,
          attachments: JSON.stringify(input.attachments),
          mentions: mentionedUserIds,
        })
        .select()
        .single<MessageRow>()

      if (error || !message) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to send message' })
      }

      // Get sender display name (used for notifications)
      const { data: sender } = await ctx.supabase
        .from('organization_members')
        .select('display_name')
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .single<{ display_name: string | null }>()

      const senderName = sender?.display_name ?? 'Someone'
      const preview = input.content.length > 100
        ? input.content.slice(0, 100) + '...'
        : input.content

      // Build notification link based on channel type
      const notificationLink = channel.project_id
        ? `/projects/${channel.project_id}?tab=chat`
        : `/messages?channel=${channel.id}`

      // Notify mentioned users
      if (mentionedUserIds.length > 0) {
        createNotifications({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          recipientUserIds: mentionedUserIds,
          actorId: ctx.user.id,
          type: 'chat_mention',
          title: `${senderName} mentioned you in ${channel.name || 'a conversation'}`,
          body: preview,
          link: notificationLink,
          metadata: {
            channelId: channel.id,
            channelName: channel.name,
            messageId: message.id,
            senderName,
          },
        }).catch((err) => console.error('[chat] Failed to send mention notifications:', err))
      }

      // For DMs, notify the other user
      if (channel.type === 'direct') {
        const { data: members } = await ctx.supabase
          .from('channel_members')
          .select('user_id')
          .eq('channel_id', channel.id)
          .neq('user_id', ctx.user.id)

        const otherUserId = members?.[0]?.user_id
        if (otherUserId && !mentionedUserIds.includes(otherUserId)) {
          createNotification({
            supabase: ctx.supabase,
            orgId: ctx.orgId,
            recipientUserId: otherUserId,
            actorId: ctx.user.id,
            type: 'dm_received',
            title: `${senderName} sent you a message`,
            body: preview,
            link: `/messages?channel=${channel.id}`,
            metadata: {
              channelId: channel.id,
              messageId: message.id,
              senderName,
            },
          }).catch((err) => console.error('[chat] DM notification failed:', err))
        }
      }

      // Log activity (fire-and-forget)
      logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'message_sent',
        entityType: 'channel',
        entityId: channel.id,
        projectId: channel.project_id,
        metadata: { messageId: message.id },
      }).catch(() => {})

      return message
    }),

  // ── Edit message ───────────────────────────────────────────
  editMessage: orgProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: existing } = await ctx.supabase
        .from('channel_messages')
        .select('id, user_id, channel_id')
        .eq('id', input.messageId)
        .single<Pick<MessageRow, 'id' | 'user_id' | 'channel_id'>>()

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
      }
      if (existing.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Can only edit own messages' })
      }

      // Re-parse mentions
      const mentionedUserIds = parseMentions(input.content)

      const { data: updated, error } = await ctx.supabase
        .from('channel_messages')
        .update({
          content: input.content,
          mentions: mentionedUserIds,
          is_edited: true,
        })
        .eq('id', input.messageId)
        .select()
        .single<MessageRow>()

      if (error || !updated) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to edit message' })
      }

      return updated
    }),

  // ── Delete message ─────────────────────────────────────────
  deleteMessage: orgProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const { data: existing } = await ctx.supabase
        .from('channel_messages')
        .select('id, user_id')
        .eq('id', input.messageId)
        .single<Pick<MessageRow, 'id' | 'user_id'>>()

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
      }
      if (existing.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Can only delete own messages' })
      }

      const { error } = await ctx.supabase
        .from('channel_messages')
        .delete()
        .eq('id', input.messageId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true as const }
    }),

  // ── Mark as read ────────────────────────────────────────────
  markAsRead: orgProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('unread_cursors')
        .upsert(
          {
            user_id: ctx.user.id,
            channel_id: input.channelId,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,channel_id' }
        )

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true as const }
    }),

  // ── Get unread count ────────────────────────────────────────
  getUnreadCount: orgProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: cursor } = await ctx.supabase
        .from('unread_cursors')
        .select('last_read_at')
        .eq('user_id', ctx.user.id)
        .eq('channel_id', input.channelId)
        .maybeSingle<{ last_read_at: string }>()

      let query = ctx.supabase
        .from('channel_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', input.channelId)
        .neq('user_id', ctx.user.id)

      if (cursor?.last_read_at) {
        query = query.gt('created_at', cursor.last_read_at)
      }

      const { count } = await query
      return { count: count ?? 0 }
    }),

  // ── Get presigned file upload URL ──────────────────────────
  getFileUploadUrl: orgProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1),
        channelId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify channel belongs to org
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      if (!ALLOWED_FILE_TYPES.includes(input.contentType)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'File type not allowed' })
      }

      const result = await createPresignedUploadUrl(
        input.fileName,
        input.contentType,
        `chat/${ctx.orgId}`
      )

      return result
    }),

  // ── Toggle emoji reaction ─────────────────────────────────
  toggleReaction: orgProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        emoji: z.string().min(1).max(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify message belongs to org
      const { data: msg } = await ctx.supabase
        .from('channel_messages')
        .select('id, channel_id')
        .eq('id', input.messageId)
        .single<Pick<MessageRow, 'id' | 'channel_id'>>()

      if (!msg) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
      }

      // Check if reaction already exists
      const { data: existing } = await ctx.supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', input.messageId)
        .eq('user_id', ctx.user.id)
        .eq('emoji', input.emoji)
        .maybeSingle<{ id: string }>()

      if (existing) {
        // Remove reaction
        await ctx.supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id)

        return { action: 'removed' as const }
      }

      // Add reaction
      const { error } = await ctx.supabase
        .from('message_reactions')
        .insert({
          message_id: input.messageId,
          user_id: ctx.user.id,
          emoji: input.emoji,
        })

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { action: 'added' as const }
    }),

  // ── Get reactions for messages (batched) ───────────────────
  getReactions: orgProcedure
    .input(
      z.object({
        messageIds: z.array(z.string().uuid()).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.messageIds.length === 0) return {}

      const { data: reactions } = await ctx.supabase
        .from('message_reactions')
        .select('id, message_id, user_id, emoji')
        .in('message_id', input.messageIds)

      type ReactionResult = { id: string; message_id: string; user_id: string; emoji: string }

      const result: Record<
        string,
        Record<string, { count: number; userIds: string[]; hasReacted: boolean }>
      > = {}

      for (const r of (reactions ?? []) as ReactionResult[]) {
        if (!result[r.message_id]) result[r.message_id] = {}
        if (!result[r.message_id][r.emoji]) {
          result[r.message_id][r.emoji] = { count: 0, userIds: [], hasReacted: false }
        }
        result[r.message_id][r.emoji].count++
        result[r.message_id][r.emoji].userIds.push(r.user_id)
        if (r.user_id === ctx.user.id) {
          result[r.message_id][r.emoji].hasReacted = true
        }
      }

      return result
    }),

  // ── Get total unread across all project channels ──────────
  getTotalUnreadCount: orgProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .rpc('get_total_unread_chat_count')

      if (error) {
        console.error('[chat] getTotalUnreadCount error:', error)
        return { count: 0 }
      }

      return { count: (data as number) ?? 0 }
    }),

  // ── Get messages unread count (DMs + general + announcements) ─
  getMessagesUnreadCount: orgProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .rpc('get_messages_unread_count')

      if (error) {
        console.error('[chat] getMessagesUnreadCount error:', error)
        return { count: 0 }
      }

      return { count: (data as number) ?? 0 }
    }),

  // ── Get or create DM channel ──────────────────────────────
  getOrCreateDM: orgProcedure
    .input(z.object({ otherUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.otherUserId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot DM yourself' })
      }

      // Verify other user is in the same org
      const { data: otherMember } = await ctx.supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', ctx.orgId)
        .eq('user_id', input.otherUserId)
        .maybeSingle()

      if (!otherMember) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found in organization' })
      }

      // Check for existing DM channel between these two users
      const { data: myMemberships } = await ctx.supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', ctx.user.id)

      const myChannelIds = (myMemberships ?? []).map((c: { channel_id: string }) => c.channel_id)

      if (myChannelIds.length > 0) {
        // Find a channel where the other user is also a member AND type is 'direct'
        const { data: otherMemberships } = await ctx.supabase
          .from('channel_members')
          .select('channel_id')
          .eq('user_id', input.otherUserId)
          .in('channel_id', myChannelIds)

        const sharedChannelIds = (otherMemberships ?? []).map((c: { channel_id: string }) => c.channel_id)

        if (sharedChannelIds.length > 0) {
          const { data: dmChannel } = await ctx.supabase
            .from('channels')
            .select('id')
            .in('id', sharedChannelIds)
            .eq('type', 'direct')
            .eq('organization_id', ctx.orgId)
            .limit(1)
            .maybeSingle()

          if (dmChannel) {
            return { channelId: dmChannel.id, created: false }
          }
        }
      }

      // Create new DM channel
      const { data: channel, error: chError } = await ctx.supabase
        .from('channels')
        .insert({
          organization_id: ctx.orgId,
          name: '',
          type: 'direct' as const,
          created_by: ctx.user.id,
        })
        .select('*')
        .single<ChannelRow>()

      if (chError || !channel) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: chError?.message ?? 'Failed to create DM' })
      }

      // Add both users as members
      await ctx.supabase
        .from('channel_members')
        .insert([
          { channel_id: channel.id, user_id: ctx.user.id },
          { channel_id: channel.id, user_id: input.otherUserId },
        ])

      return { channelId: channel.id, created: true }
    }),

  // ── Get or create org-wide channel (general/announcement) ─
  getOrCreateOrgChannel: orgProcedure
    .input(z.object({ type: z.enum(['general', 'announcement']) }))
    .query(async ({ ctx, input }) => {
      // Try to find existing
      const { data: existing } = await ctx.supabase
        .from('channels')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .eq('type', input.type)
        .maybeSingle()

      if (existing) return existing as ChannelRow

      // Create on first access
      const name = input.type === 'general' ? 'General' : 'Announcements'
      const { data: channel, error } = await ctx.supabase
        .from('channels')
        .insert({
          organization_id: ctx.orgId,
          name,
          type: input.type as ChannelRow['type'],
          created_by: ctx.user.id,
        })
        .select()
        .single()

      if (error) {
        // Handle race condition: unique constraint violation
        if (error.code === '23505') {
          const { data: raced } = await ctx.supabase
            .from('channels')
            .select('*')
            .eq('organization_id', ctx.orgId)
            .eq('type', input.type)
            .single()
          return raced as ChannelRow
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return channel as ChannelRow
    }),

  // ── Get user's conversations (DMs + org channels) ─────────
  getMyConversations: orgProcedure
    .query(async ({ ctx }) => {
      // 1. Get org-wide channels
      const { data: orgChannels } = await ctx.supabase
        .from('channels')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .in('type', ['general', 'announcement'])

      // 2. Get DM channels user is a member of
      const { data: myMemberships } = await ctx.supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', ctx.user.id)

      const dmChannelIds = (myMemberships ?? []).map((m: { channel_id: string }) => m.channel_id)
      let dmChannels: ChannelRow[] = []

      if (dmChannelIds.length > 0) {
        const { data } = await ctx.supabase
          .from('channels')
          .select('*')
          .in('id', dmChannelIds)
          .eq('type', 'direct')
          .eq('organization_id', ctx.orgId)

        dmChannels = (data ?? []) as ChannelRow[]
      }

      const allChannels = [...(orgChannels ?? []) as ChannelRow[], ...dmChannels]

      // 3. Build conversation list with last message + unread count + other user info
      const conversations = await Promise.all(
        allChannels.map(async (ch) => {
          // Last message (top-level only)
          const { data: lastMsg } = await ctx.supabase
            .from('channel_messages')
            .select('content, user_id, created_at')
            .eq('channel_id', ch.id)
            .is('parent_message_id', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Unread count
          const { data: cursor } = await ctx.supabase
            .from('unread_cursors')
            .select('last_read_at')
            .eq('user_id', ctx.user.id)
            .eq('channel_id', ch.id)
            .maybeSingle()

          let unreadQuery = ctx.supabase
            .from('channel_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', ch.id)
            .neq('user_id', ctx.user.id)
            .is('parent_message_id', null)

          if (cursor?.last_read_at) {
            unreadQuery = unreadQuery.gt('created_at', cursor.last_read_at)
          }
          const { count } = await unreadQuery
          const unreadCount = count ?? 0

          // For DMs, get the other member's profile
          let otherUser: { user_id: string; display_name: string | null; avatar_url: string | null } | null = null
          if (ch.type === 'direct') {
            const { data: members } = await ctx.supabase
              .from('channel_members')
              .select('user_id')
              .eq('channel_id', ch.id)
              .neq('user_id', ctx.user.id)
              .limit(1)

            const otherUserId = members?.[0]?.user_id
            if (otherUserId) {
              const { data: profile } = await ctx.supabase
                .from('organization_members')
                .select('user_id, display_name, avatar_url')
                .eq('user_id', otherUserId)
                .eq('organization_id', ctx.orgId)
                .maybeSingle()
              otherUser = profile ?? null
            }
          }

          return {
            channel: ch,
            lastMessage: lastMsg as { content: string; user_id: string; created_at: string } | null,
            unreadCount,
            otherUser,
          }
        })
      )

      // Sort: general first, announcement second, then DMs by last message time
      conversations.sort((a, b) => {
        const typeOrder: Record<string, number> = { general: 0, announcement: 1, direct: 2 }
        const aType = typeOrder[a.channel.type] ?? 3
        const bType = typeOrder[b.channel.type] ?? 3
        if (aType !== bType) return aType - bType
        const aTime = a.lastMessage?.created_at ?? a.channel.created_at
        const bTime = b.lastMessage?.created_at ?? b.channel.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      return conversations
    }),

  // ── Get thread replies ────────────────────────────────────
  getThreadReplies: orgProcedure
    .input(
      z.object({
        parentMessageId: z.string().uuid(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify parent message exists and belongs to org
      const { data: parent } = await ctx.supabase
        .from('channel_messages')
        .select('*')
        .eq('id', input.parentMessageId)
        .single<MessageRow>()

      if (!parent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent message not found' })
      }

      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id')
        .eq('id', parent.channel_id)
        .single()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      // Fetch thread replies (chronological — oldest first)
      let query = ctx.supabase
        .from('channel_messages')
        .select('*')
        .eq('parent_message_id', input.parentMessageId)
        .order('created_at', { ascending: true })
        .limit(input.limit + 1)

      if (input.cursor) {
        query = query.gt('created_at', input.cursor)
      }

      const { data: rawReplies } = await query
      const replies = (rawReplies ?? []) as MessageRow[]
      const hasMore = replies.length > input.limit
      const items = replies.slice(0, input.limit)

      // Batch-lookup user profiles
      const userIds = [...new Set([
        parent.user_id,
        ...items.filter((m) => m.user_id).map((m) => m.user_id!),
      ].filter(Boolean) as string[])]

      const userMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>()

      if (userIds.length > 0) {
        const { data: members } = await ctx.supabase
          .from('organization_members')
          .select('user_id, display_name, avatar_url')
          .eq('organization_id', ctx.orgId)
          .in('user_id', userIds)

        type MemberProfile = { user_id: string; display_name: string | null; avatar_url: string | null }
        for (const m of (members ?? []) as MemberProfile[]) {
          userMap.set(m.user_id, {
            id: m.user_id,
            display_name: m.display_name ?? 'Unknown',
            avatar_url: m.avatar_url ?? null,
          })
        }
      }

      const parentWithUser: MessageWithUser = {
        ...parent,
        user: parent.user_id ? userMap.get(parent.user_id) ?? null : null,
      }

      const repliesWithUsers: MessageWithUser[] = items.map((msg) => ({
        ...msg,
        user: msg.user_id ? userMap.get(msg.user_id) ?? null : null,
      }))

      return {
        parentMessage: parentWithUser,
        replies: repliesWithUsers,
        nextCursor: hasMore ? items[items.length - 1]?.created_at ?? null : null,
      }
    }),

  // ── Send thread reply ─────────────────────────────────────
  sendThreadReply: orgProcedure
    .input(
      z.object({
        parentMessageId: z.string().uuid(),
        channelId: z.string().uuid(),
        content: z.string().min(1).max(10000),
        attachments: z
          .array(
            z.object({
              type: z.enum(['task', 'brief', 'meeting', 'file']),
              id: z.string(),
              title: z.string().optional(),
              service: z.string().optional(),
              serviceType: z.string().optional(),
              status: z.string().optional(),
              fieldsFilled: z.number().optional(),
            })
          )
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify channel belongs to org
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id, project_id, name, type')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id' | 'project_id' | 'name' | 'type'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      // Announcement permission check
      if (channel.type === 'announcement' && ctx.userRole !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can post in announcements' })
      }

      // Verify parent message exists in this channel
      const { data: parentMsg } = await ctx.supabase
        .from('channel_messages')
        .select('id, user_id, channel_id')
        .eq('id', input.parentMessageId)
        .eq('channel_id', input.channelId)
        .single()

      if (!parentMsg) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent message not found' })
      }

      // Parse mentions
      const mentionedUserIds = parseMentions(input.content)

      // Insert thread reply (reply_count / last_reply_at updated by DB trigger)
      const { data: message, error } = await ctx.supabase
        .from('channel_messages')
        .insert({
          channel_id: input.channelId,
          user_id: ctx.user.id,
          content: input.content,
          attachments: JSON.stringify(input.attachments),
          mentions: mentionedUserIds,
          parent_message_id: input.parentMessageId,
        })
        .select()
        .single<MessageRow>()

      if (error || !message) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to send reply' })
      }

      // Notify parent message author
      if (parentMsg.user_id && parentMsg.user_id !== ctx.user.id) {
        const { data: sender } = await ctx.supabase
          .from('organization_members')
          .select('display_name')
          .eq('user_id', ctx.user.id)
          .eq('organization_id', ctx.orgId)
          .single<{ display_name: string | null }>()

        const senderName = sender?.display_name ?? 'Someone'
        const preview = input.content.length > 100 ? input.content.slice(0, 100) + '...' : input.content

        const threadLink = channel.project_id
          ? `/projects/${channel.project_id}?tab=chat&thread=${input.parentMessageId}`
          : `/messages?channel=${channel.id}&thread=${input.parentMessageId}`

        createNotification({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          recipientUserId: parentMsg.user_id,
          actorId: ctx.user.id,
          type: 'thread_reply',
          title: `${senderName} replied to your message`,
          body: preview,
          link: threadLink,
          metadata: {
            channelId: channel.id,
            parentMessageId: input.parentMessageId,
            messageId: message.id,
            senderName,
          },
        }).catch((err) => console.error('[chat] Thread reply notification failed:', err))
      }

      // Notify mentioned users
      if (mentionedUserIds.length > 0) {
        const { data: sender } = await ctx.supabase
          .from('organization_members')
          .select('display_name')
          .eq('user_id', ctx.user.id)
          .eq('organization_id', ctx.orgId)
          .single<{ display_name: string | null }>()

        const senderName = sender?.display_name ?? 'Someone'
        const preview = input.content.length > 100 ? input.content.slice(0, 100) + '...' : input.content

        createNotifications({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          recipientUserIds: mentionedUserIds,
          actorId: ctx.user.id,
          type: 'chat_mention',
          title: `${senderName} mentioned you in a thread`,
          body: preview,
          link: channel.project_id
            ? `/projects/${channel.project_id}?tab=chat&thread=${input.parentMessageId}`
            : `/messages?channel=${channel.id}&thread=${input.parentMessageId}`,
          metadata: {
            channelId: channel.id,
            parentMessageId: input.parentMessageId,
            messageId: message.id,
            senderName,
          },
        }).catch((err) => console.error('[chat] Thread mention notification failed:', err))
      }

      return message
    }),

  // ── Mark message as decision ──────────────────────────────
  markAsDecision: orgProcedure
    .input(
      z.object({
        messageId: z.string().uuid(),
        projectId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify message exists and get content + channel
      const { data: msg } = await ctx.supabase
        .from('channel_messages')
        .select('id, channel_id, content')
        .eq('id', input.messageId)
        .single<Pick<MessageRow, 'id' | 'channel_id' | 'content'>>()

      if (!msg) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' })
      }

      // Verify channel belongs to org
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id')
        .eq('id', msg.channel_id)
        .single<Pick<ChannelRow, 'id' | 'organization_id'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      // Insert decision
      const { data: decision, error } = await ctx.supabase
        .from('project_decisions')
        .insert({
          organization_id: ctx.orgId,
          project_id: input.projectId,
          message_id: input.messageId,
          channel_id: msg.channel_id,
          content: msg.content,
          marked_by: ctx.user.id,
        })
        .select()
        .single<DecisionRow>()

      if (error) {
        if (error.code === '23505') {
          throw new TRPCError({ code: 'CONFLICT', message: 'Message is already marked as a decision' })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Post system message
      const preview = msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content
      insertSystemMessage({
        supabase: ctx.supabase,
        projectId: input.projectId,
        event: 'decision_marked',
        content: `Decision logged: "${preview}"`,
      }).catch(() => {})

      return decision
    }),

  // ── Remove decision ────────────────────────────────────────
  removeDecision: orgProcedure
    .input(z.object({ decisionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('project_decisions')
        .delete()
        .eq('id', input.decisionId)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true as const }
    }),

  // ── Get project decisions ──────────────────────────────────
  getProjectDecisions: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: decisions } = await ctx.supabase
        .from('project_decisions')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })

      if (!decisions || decisions.length === 0) return []

      // Batch-lookup marker profiles
      const markerIds = [...new Set((decisions as DecisionRow[]).map((d) => d.marked_by))]
      const userMap = new Map<string, string>()

      if (markerIds.length > 0) {
        const { data: members } = await ctx.supabase
          .from('organization_members')
          .select('user_id, display_name')
          .eq('organization_id', ctx.orgId)
          .in('user_id', markerIds)

        type M = { user_id: string; display_name: string | null }
        for (const m of (members ?? []) as M[]) {
          userMap.set(m.user_id, m.display_name ?? 'Unknown')
        }
      }

      return (decisions as DecisionRow[]).map((d) => ({
        ...d,
        markerName: userMap.get(d.marked_by) ?? 'Unknown',
      }))
    }),

  // ── Pin message ────────────────────────────────────────────
  pinMessage: orgProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        messageId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify channel belongs to org
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id, pinned_message_ids')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id' | 'pinned_message_ids'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      const pinned = channel.pinned_message_ids ?? []

      if (pinned.includes(input.messageId)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Message is already pinned' })
      }

      if (pinned.length >= 5) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 5 pinned messages allowed' })
      }

      const { error } = await ctx.supabase
        .from('channels')
        .update({ pinned_message_ids: [...pinned, input.messageId] })
        .eq('id', input.channelId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      // Post system message
      insertSystemMessageByChannel({
        supabase: ctx.supabase,
        channelId: input.channelId,
        event: 'message_pinned',
        content: 'A message was pinned to this channel',
      }).catch(() => {})

      return { success: true as const }
    }),

  // ── Unpin message ──────────────────────────────────────────
  unpinMessage: orgProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        messageId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id, pinned_message_ids')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id' | 'pinned_message_ids'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      const pinned = (channel.pinned_message_ids ?? []).filter(
        (id) => id !== input.messageId
      )

      const { error } = await ctx.supabase
        .from('channels')
        .update({ pinned_message_ids: pinned })
        .eq('id', input.channelId)

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }

      return { success: true as const }
    }),

  // ── Get pinned messages ────────────────────────────────────
  getPinnedMessages: orgProcedure
    .input(z.object({ channelId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id, pinned_message_ids')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id' | 'pinned_message_ids'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      const pinnedIds = channel.pinned_message_ids ?? []
      if (pinnedIds.length === 0) return []

      const { data: messages } = await ctx.supabase
        .from('channel_messages')
        .select('*')
        .in('id', pinnedIds)

      if (!messages || messages.length === 0) return []

      // Batch-lookup user profiles
      const userIds = [...new Set((messages as MessageRow[]).filter((m) => m.user_id).map((m) => m.user_id!))]
      const userMap = new Map<string, { id: string; display_name: string; avatar_url: string | null }>()

      if (userIds.length > 0) {
        const { data: members } = await ctx.supabase
          .from('organization_members')
          .select('user_id, display_name, avatar_url')
          .eq('organization_id', ctx.orgId)
          .in('user_id', userIds)

        type MemberProfile = { user_id: string; display_name: string | null; avatar_url: string | null }
        for (const m of (members ?? []) as MemberProfile[]) {
          userMap.set(m.user_id, {
            id: m.user_id,
            display_name: m.display_name ?? 'Unknown',
            avatar_url: m.avatar_url ?? null,
          })
        }
      }

      return (messages as MessageRow[]).map((msg) => ({
        ...msg,
        user: msg.user_id ? userMap.get(msg.user_id) ?? null : null,
      })) as MessageWithUser[]
    }),

  // ── Get channel stats ──────────────────────────────────────
  getChannelStats: orgProcedure
    .input(
      z.object({
        channelId: z.string().uuid(),
        projectId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: channel } = await ctx.supabase
        .from('channels')
        .select('id, organization_id, pinned_message_ids')
        .eq('id', input.channelId)
        .single<Pick<ChannelRow, 'id' | 'organization_id' | 'pinned_message_ids'>>()

      if (!channel || channel.organization_id !== ctx.orgId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })
      }

      const pinnedCount = (channel.pinned_message_ids ?? []).length

      // Member count (for org channels, count org members; for DMs, count channel members)
      const { count: memberCount } = await ctx.supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', ctx.orgId)

      // Task count (only if projectId provided)
      let taskCount = 0
      if (input.projectId) {
        const { count } = await ctx.supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', input.projectId)
        taskCount = count ?? 0
      }

      // Decision count (only if projectId provided)
      let decisionCount = 0
      if (input.projectId) {
        const { count } = await ctx.supabase
          .from('project_decisions')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', input.projectId)
          .eq('organization_id', ctx.orgId)
        decisionCount = count ?? 0
      }

      return {
        memberCount: memberCount ?? 0,
        taskCount,
        pinnedCount,
        decisionCount,
      }
    }),
})
