import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import { logActivity } from '@/lib/activity/log'
import { createNotifications } from '@/lib/notifications/create'
import { triggerEmbedding, triggerEmbeddingDeletion } from '@/lib/ai/embedding-triggers'
import type { Database } from '@/types/database'

type CommentRow = Database['public']['Tables']['comments']['Row']

export const commentRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('comments')
        .select('*')
        .eq('task_id', input.taskId)
        .order('created_at', { ascending: true })
        .returns<CommentRow[]>()

      // Build thread structure
      const rootComments: (CommentRow & { replies: CommentRow[] })[] = []
      const replyMap: Record<string, CommentRow[]> = {}

      for (const comment of data ?? []) {
        if (comment.parent_id) {
          if (!replyMap[comment.parent_id]) replyMap[comment.parent_id] = []
          replyMap[comment.parent_id].push(comment)
        } else {
          rootComments.push({ ...comment, replies: [] })
        }
      }

      for (const root of rootComments) {
        root.replies = replyMap[root.id] ?? []
      }

      return rootComments
    }),

  create: orgProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      body: z.string().min(1),
      isInternal: z.boolean().optional(),
      parentId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('comments')
        .insert({
          task_id: input.taskId,
          author_id: ctx.user.id,
          body: input.body,
          is_internal: input.isInternal ?? false,
          parent_id: input.parentId ?? null,
        })
        .select()
        .single<CommentRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Embed comment for RAG
      if (data) {
        triggerEmbedding(ctx.orgId, 'comment', data.id, input.body)
      }

      // ── Automation hooks ──
      try {
        // Fetch parent task for context
        const { data: task } = await ctx.supabase
          .from('tasks')
          .select('id, title, project_id, assignee_id, reviewer_id, projects(name)')
          .eq('id', input.taskId)
          .single<{
            id: string; title: string; project_id: string
            assignee_id: string | null; reviewer_id: string | null
            projects: { name: string } | null
          }>()

        // Get commenter name
        const { data: actor } = await ctx.supabase
          .from('organization_members')
          .select('display_name')
          .eq('user_id', ctx.user.id)
          .eq('organization_id', ctx.orgId)
          .single<{ display_name: string | null }>()

        const actorName = actor?.display_name ?? 'Someone'

        // Log activity
        await logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'comment_added',
          entityType: 'comment',
          entityId: data.id,
          projectId: task?.project_id ?? null,
          metadata: {
            task_title: task?.title,
            project_name: task?.projects?.name,
            comment_preview: input.body.slice(0, 100),
            actor_name: actorName,
          },
        })

        // Notify task assignee + reviewer (excluding comment author)
        if (task) {
          const recipientIds = new Set<string>()
          if (task.assignee_id && task.assignee_id !== ctx.user.id) recipientIds.add(task.assignee_id)
          if (task.reviewer_id && task.reviewer_id !== ctx.user.id) recipientIds.add(task.reviewer_id)

          if (recipientIds.size > 0) {
            const taskUrl = `/projects/${task.project_id}?task=${task.id}`
            await createNotifications({
              supabase: ctx.supabase,
              orgId: ctx.orgId,
              actorId: ctx.user.id,
              recipientUserIds: Array.from(recipientIds),
              type: 'comment_added',
              title: `${actorName} commented on "${task.title}"`,
              body: input.body.slice(0, 200),
              link: taskUrl,
              metadata: { task_id: task.id, comment_id: data.id },
            })
          }
        }
      } catch {
        // Never break the main operation
      }

      return data
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      body: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.body) updates.body = input.body

      const { data, error } = await ctx.supabase
        .from('comments')
        .update(updates)
        .eq('id', input.id)
        .eq('author_id', ctx.user.id)
        .select()
        .single<CommentRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Re-embed updated comment for RAG
      if (input.body && data) {
        triggerEmbedding(ctx.orgId, 'comment', data.id, input.body)
      }

      return data
    }),

  resolve: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('comments')
        .update({ is_resolved: true })
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Clean up embeddings before deleting
      triggerEmbeddingDeletion('comment', input.id)

      const { error } = await ctx.supabase
        .from('comments')
        .delete()
        .eq('id', input.id)
        .eq('author_id', ctx.user.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
