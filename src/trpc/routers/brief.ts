import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import { triggerEmbedding, triggerEmbeddingDeletion, stringifyForEmbedding } from '@/lib/ai/embedding-triggers'
import type { Database } from '@/types/database'

type BriefRow = Database['public']['Tables']['briefs']['Row']

export const briefRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      taskId: z.string().uuid().optional(),
      type: z.enum(['content_brief', 'project_requirements', 'change_request']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('briefs')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })

      if (input?.projectId) query = query.eq('project_id', input.projectId)
      if (input?.taskId) query = query.eq('task_id', input.taskId)
      if (input?.type) query = query.eq('type', input.type)

      const { data } = await query.returns<BriefRow[]>()
      return data ?? []
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('briefs')
        .select('*')
        .eq('id', input.id)
        .single<BriefRow>()

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Brief not found' })
      return data
    }),

  create: orgProcedure
    .input(z.object({
      projectId: z.string().uuid().optional(),
      taskId: z.string().uuid().optional(),
      type: z.enum(['content_brief', 'project_requirements', 'change_request']).optional(),
      title: z.string().min(1),
      body: z.record(z.string(), z.unknown()).optional(),
      sourceMeetingId: z.string().uuid().optional(),
      generatedByAi: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('briefs')
        .insert({
          organization_id: ctx.orgId,
          project_id: input.projectId ?? null,
          task_id: input.taskId ?? null,
          type: input.type ?? 'content_brief',
          title: input.title,
          body: (input.body ?? {}) as any,
          source_meeting_id: input.sourceMeetingId ?? null,
          generated_by_ai: input.generatedByAi ?? false,
          created_by: ctx.user.id,
        })
        .select()
        .single<BriefRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Embed brief body for RAG
      if (input.body && data) {
        const text = `${input.title}\n\n${stringifyForEmbedding(input.body)}`
        triggerEmbedding(ctx.orgId, 'brief', data.id, text)
      }

      // Post system message to project chat
      if (input.projectId && data) {
        import('@/lib/chat/system-message').then(({ insertSystemMessage }) =>
          insertSystemMessage({
            supabase: ctx.supabase,
            projectId: input.projectId!,
            event: 'brief_submitted',
            content: `New brief submitted: "${input.title}"`,
          })
        ).catch(() => {})
      }

      return data
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      body: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.title !== undefined) updates.title = input.title
      if (input.body !== undefined) updates.body = input.body

      const { data, error } = await ctx.supabase
        .from('briefs')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single<BriefRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Embed updated brief body for RAG
      if (input.body && data) {
        const text = `${data.title}\n\n${stringifyForEmbedding(input.body)}`
        triggerEmbedding(ctx.orgId, 'brief', data.id, text)
      }

      return data
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Clean up embeddings before deleting
      triggerEmbeddingDeletion('brief', input.id)

      const { error } = await ctx.supabase.from('briefs').delete().eq('id', input.id)
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
