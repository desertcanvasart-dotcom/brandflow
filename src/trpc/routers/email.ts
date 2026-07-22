/**
 * tRPC router for email integration.
 * Handles connections, threads, messages, compose, and search.
 */
import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getEmailProvider } from '@/lib/email/providers/factory'
import { decrypt, encrypt } from '@/lib/email/encryption'
import { syncIncremental, stopConnectionWatch } from '@/lib/email/sync'
import { autoLinkThread } from '@/lib/email/auto-link'
import { logActivity } from '@/lib/activity/log'
import type { Database } from '@/types/database'

type EmailConnectionRow = Database['public']['Tables']['email_connections']['Row']
type EmailThreadRow = Database['public']['Tables']['email_threads']['Row']
type EmailMessageRow = Database['public']['Tables']['email_messages']['Row']
type EmailAttachmentRow = Database['public']['Tables']['email_attachments']['Row']

// Join types for Supabase selects
type ThreadWithConnection = EmailThreadRow & {
  email_connections: Pick<EmailConnectionRow, 'provider' | 'email_address' | 'display_name'>
}

type ThreadWithFullConnection = EmailThreadRow & {
  email_connections: EmailConnectionRow
}

type MessageWithAttachments = EmailMessageRow & {
  email_attachments: Pick<EmailAttachmentRow, 'id' | 'file_name' | 'content_type' | 'size_bytes' | 'storage_url' | 'provider_attachment_id'>[]
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const emailRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // 1. listConnections — list email connections for current org
  // -------------------------------------------------------------------------
  listConnections: orgProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('email_connections')
      .select('id, provider, email_address, display_name, is_active, last_synced_at, created_at')
      .eq('organization_id', ctx.orgId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch email connections: ${error.message}`,
      })
    }

    return data ?? []
  }),

  // -------------------------------------------------------------------------
  // 2. disconnect — delete own email connection and stop watch
  // -------------------------------------------------------------------------
  disconnect: orgProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the connection belongs to this user
      const { data: connection } = await ctx.supabase
        .from('email_connections')
        .select('id, user_id, watch_resource_id')
        .eq('id', input.connectionId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' })
      }

      if (connection.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only disconnect your own accounts' })
      }

      // Stop the watch if active
      try {
        await stopConnectionWatch(input.connectionId)
      } catch {
        // Ignore errors — connection may already be invalid
      }

      // Delete the connection (cascades to threads/messages)
      const { error } = await supabaseAdmin
        .from('email_connections')
        .delete()
        .eq('id', input.connectionId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to disconnect: ${error.message}`,
        })
      }

      // Audit log
      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'email_disconnected',
        entityType: 'email',
        entityId: input.connectionId,
      })

      return { success: true }
    }),

  // -------------------------------------------------------------------------
  // 3. listThreads — paginated threads for a project (or unlinked)
  // -------------------------------------------------------------------------
  listThreads: orgProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        unlinked: z.boolean().optional(),
        filter: z.enum(['all', 'unread', 'starred', 'archived']).optional(),
        limit: z.number().min(1).max(100).optional(),
        cursor: z.string().optional(), // last_message_at cursor for pagination
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 25

      let query = ctx.supabase
        .from('email_threads')
        .select(`
          id, subject, snippet, participants, last_message_at,
          message_count, is_read, is_starred, is_archived,
          project_id, brand_id, provider_thread_id,
          email_connections!inner(provider, email_address)
        `)
        .eq('organization_id', ctx.orgId)
        .order('last_message_at', { ascending: false })
        .limit(limit + 1) // Fetch one extra to determine if there are more

      // Filter by project or unlinked
      if (input.projectId) {
        query = query.eq('project_id', input.projectId)
      } else if (input.unlinked) {
        query = query.is('project_id', null)
      }

      // Filter by status
      if (input.filter === 'unread') {
        query = query.eq('is_read', false)
      } else if (input.filter === 'starred') {
        query = query.eq('is_starred', true)
      } else if (input.filter === 'archived') {
        query = query.eq('is_archived', true)
      } else {
        // Default: hide archived
        query = query.eq('is_archived', false)
      }

      // Pagination cursor
      if (input.cursor) {
        query = query.lt('last_message_at', input.cursor)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch threads: ${error.message}`,
        })
      }

      const threads = data ?? []
      const hasMore = threads.length > limit
      const items = hasMore ? threads.slice(0, limit) : threads
      const nextCursor = hasMore ? items[items.length - 1]?.last_message_at : undefined

      return { items, nextCursor }
    }),

  // -------------------------------------------------------------------------
  // 4. getThread — thread detail with all messages + attachments
  // -------------------------------------------------------------------------
  getThread: orgProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Fetch thread
      const { data: thread, error: threadError } = await ctx.supabase
        .from('email_threads')
        .select(`
          *,
          email_connections!inner(provider, email_address, display_name)
        `)
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)
        .returns<ThreadWithConnection[]>()
        .single()

      if (threadError || !thread) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
      }

      // Fetch messages with attachments
      const { data: messages, error: msgError } = await ctx.supabase
        .from('email_messages')
        .select(`
          *,
          email_attachments(id, file_name, content_type, size_bytes, storage_url, provider_attachment_id)
        `)
        .eq('thread_id', input.threadId)
        .order('sent_at', { ascending: true })
        .returns<MessageWithAttachments[]>()

      if (msgError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch messages: ${msgError.message}`,
        })
      }

      // Mark as read if not already
      if (!thread.is_read) {
        await ctx.supabase
          .from('email_threads')
          .update({ is_read: true })
          .eq('id', input.threadId)
      }

      return { thread, messages: messages ?? [] }
    }),

  // -------------------------------------------------------------------------
  // 5. sendMessage — compose new email (creates thread)
  // -------------------------------------------------------------------------
  sendMessage: orgProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        to: z.array(z.string().email()),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().min(1),
        bodyHtml: z.string(),
        projectId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify connection belongs to user
      const { data: connection } = await supabaseAdmin
        .from('email_connections')
        .select('*')
        .eq('id', input.connectionId)
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)
        .returns<EmailConnectionRow[]>()
        .single()

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Email connection not found' })
      }

      const provider = getEmailProvider(connection)

      try {
        const result = await provider.sendMessage({
          to: input.to,
          cc: input.cc,
          bcc: input.bcc,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
        })

        // Auto-link if projectId provided, or try auto-linking
        let projectId = input.projectId
        let brandId: string | undefined

        if (!projectId) {
          const allParticipants = [
            ...input.to,
            ...(input.cc ?? []),
            connection.email_address,
          ]
          const link = await autoLinkThread(ctx.orgId, allParticipants)
          projectId = link.projectId
          brandId = link.brandId
        }

        // Upsert the thread
        const { data: thread } = await supabaseAdmin
          .from('email_threads')
          .upsert(
            {
              organization_id: ctx.orgId,
              connection_id: connection.id,
              project_id: projectId ?? null,
              brand_id: brandId ?? null,
              provider_thread_id: result.threadId,
              subject: input.subject,
              snippet: input.bodyHtml.replace(/<[^>]*>/g, '').slice(0, 200),
              participants: [...input.to, ...(input.cc ?? []), connection.email_address],
              last_message_at: new Date().toISOString(),
              message_count: 1,
              is_read: true,
            },
            { onConflict: 'connection_id,provider_thread_id' },
          )
          .select('id')
          .single()

        // Insert the sent message
        if (thread) {
          await supabaseAdmin
            .from('email_messages')
            .insert({
              thread_id: thread.id,
              provider_message_id: result.messageId,
              from_address: connection.email_address,
              from_name: connection.display_name,
              to_addresses: input.to,
              cc_addresses: input.cc ?? [],
              bcc_addresses: input.bcc ?? [],
              subject: input.subject,
              body_html: input.bodyHtml,
              body_text: input.bodyHtml.replace(/<[^>]*>/g, ''),
              sent_at: new Date().toISOString(),
              is_outbound: true,
              headers: {},
            })
        }

        // Audit log
        await logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'email_sent',
          entityType: 'email',
          entityId: thread?.id ?? result.messageId,
          projectId: projectId ?? null,
          metadata: { to: input.to, subject: input.subject },
        })

        return { threadId: thread?.id, messageId: result.messageId }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }),

  // -------------------------------------------------------------------------
  // 6. replyToThread — reply within existing thread
  // -------------------------------------------------------------------------
  replyToThread: orgProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        bodyHtml: z.string(),
        to: z.array(z.string().email()).optional(),
        cc: z.array(z.string().email()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the thread + connection
      const { data: thread } = await ctx.supabase
        .from('email_threads')
        .select('*, email_connections!inner(*)')
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)
        .returns<ThreadWithFullConnection[]>()
        .single()

      if (!thread) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
      }

      const connection = thread.email_connections
      if (connection.user_id !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only reply from your own connection' })
      }

      // Get the last message for reply headers
      const { data: lastMessage } = await ctx.supabase
        .from('email_messages')
        .select('provider_message_id, from_address, headers')
        .eq('thread_id', input.threadId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single()

      const headers = (lastMessage?.headers ?? {}) as Record<string, string | undefined>

      const provider = getEmailProvider(connection)

      // Determine recipients: use provided ones or reply to the last message's sender
      const to = input.to ??
        (lastMessage?.from_address !== connection.email_address
          ? [lastMessage?.from_address ?? '']
          : thread.participants?.filter((p: string) => p !== connection.email_address) ?? [])

      try {
        const result = await provider.sendMessage({
          to: to.filter(Boolean),
          cc: input.cc,
          subject: `Re: ${thread.subject}`,
          bodyHtml: input.bodyHtml,
          inReplyTo: headers.messageId,
          references: headers.references
            ? `${headers.references} ${headers.messageId}`
            : headers.messageId,
          threadId: thread.provider_thread_id,
        })

        // Insert the sent message
        await supabaseAdmin
          .from('email_messages')
          .insert({
            thread_id: input.threadId,
            provider_message_id: result.messageId,
            from_address: connection.email_address,
            from_name: connection.display_name,
            to_addresses: to.filter(Boolean),
            cc_addresses: input.cc ?? [],
            subject: `Re: ${thread.subject}`,
            body_html: input.bodyHtml,
            body_text: input.bodyHtml.replace(/<[^>]*>/g, ''),
            sent_at: new Date().toISOString(),
            is_outbound: true,
            headers: {
              inReplyTo: headers.messageId,
            },
          })

        // Update thread metadata
        await supabaseAdmin
          .from('email_threads')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (thread.message_count ?? 0) + 1,
            snippet: input.bodyHtml.replace(/<[^>]*>/g, '').slice(0, 200),
          })
          .eq('id', input.threadId)

        // Audit log
        await logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'email_sent',
          entityType: 'email',
          entityId: input.threadId,
          projectId: thread.project_id ?? null,
          metadata: { type: 'reply' },
        })

        return { messageId: result.messageId }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to send reply: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }),

  // -------------------------------------------------------------------------
  // 7. linkToProject — manually link a thread to a project
  // -------------------------------------------------------------------------
  linkToProject: orgProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify thread belongs to this org
      const { data: thread } = await ctx.supabase
        .from('email_threads')
        .select('id')
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!thread) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
      }

      // Verify project belongs to this org
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, brand_id')
        .eq('id', input.projectId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
      }

      const { error } = await ctx.supabase
        .from('email_threads')
        .update({
          project_id: input.projectId,
          brand_id: project.brand_id,
          linked_by: ctx.user.id,
        })
        .eq('id', input.threadId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to link thread: ${error.message}`,
        })
      }

      return { success: true }
    }),

  // -------------------------------------------------------------------------
  // 8. unlinkFromProject — remove project association
  // -------------------------------------------------------------------------
  unlinkFromProject: orgProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('email_threads')
        .update({
          project_id: null,
          brand_id: null,
          linked_by: null,
        })
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to unlink thread: ${error.message}`,
        })
      }

      return { success: true }
    }),

  // -------------------------------------------------------------------------
  // 9. toggleStar — star/unstar a thread
  // -------------------------------------------------------------------------
  toggleStar: orgProcedure
    .input(z.object({ threadId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get current star state
      const { data: thread } = await ctx.supabase
        .from('email_threads')
        .select('is_starred')
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!thread) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Thread not found' })
      }

      const { error } = await ctx.supabase
        .from('email_threads')
        .update({ is_starred: !thread.is_starred })
        .eq('id', input.threadId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to toggle star: ${error.message}`,
        })
      }

      return { is_starred: !thread.is_starred }
    }),

  // -------------------------------------------------------------------------
  // 10. markAsRead — mark thread as read
  // -------------------------------------------------------------------------
  markAsRead: orgProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        isRead: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('email_threads')
        .update({ is_read: input.isRead ?? true })
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update read status: ${error.message}`,
        })
      }

      return { success: true }
    }),

  // -------------------------------------------------------------------------
  // 11. archiveThread — archive a thread
  // -------------------------------------------------------------------------
  archiveThread: orgProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        archived: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('email_threads')
        .update({ is_archived: input.archived ?? true })
        .eq('id', input.threadId)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to archive thread: ${error.message}`,
        })
      }

      return { success: true }
    }),

  // -------------------------------------------------------------------------
  // 12. searchThreads — full-text search across threads/messages
  // -------------------------------------------------------------------------
  searchThreads: orgProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        projectId: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 20
      const searchTerm = `%${input.query}%`

      // Search in thread subjects and message bodies
      let query = ctx.supabase
        .from('email_threads')
        .select(`
          id, subject, snippet, participants, last_message_at,
          message_count, is_read, is_starred, project_id,
          email_connections!inner(provider, email_address)
        `)
        .eq('organization_id', ctx.orgId)
        .or(`subject.ilike.${searchTerm},snippet.ilike.${searchTerm}`)
        .order('last_message_at', { ascending: false })
        .limit(limit)

      if (input.projectId) {
        query = query.eq('project_id', input.projectId)
      }

      const { data, error } = await query

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Search failed: ${error.message}`,
        })
      }

      return data ?? []
    }),

  // -------------------------------------------------------------------------
  // 13. triggerSync — manually trigger sync for a connection (admin only)
  // -------------------------------------------------------------------------
  triggerSync: adminProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the connection belongs to this org
      const { data: connection } = await ctx.supabase
        .from('email_connections')
        .select('id')
        .eq('id', input.connectionId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!connection) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Connection not found' })
      }

      try {
        await syncIncremental(input.connectionId)
        return { success: true }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }),
})
