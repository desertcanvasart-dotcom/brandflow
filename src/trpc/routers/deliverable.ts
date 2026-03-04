import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import type { Database } from '@/types/database'

type DeliverableRow = Database['public']['Tables']['deliverables']['Row']
type DeliverableVersionRow = Database['public']['Tables']['deliverable_versions']['Row']

const deliverableTypeEnum = z.enum([
  'wireframe', 'mockup', 'prototype', 'code', 'document', 'asset', 'other',
])
const deliverableStatusEnum = z.enum(['draft', 'in_review', 'approved', 'rejected', 'final'])

export const deliverableRouter = createTRPCRouter({
  create: orgProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      type: deliverableTypeEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('deliverables')
        .insert({
          task_id: input.taskId,
          type: input.type ?? 'other',
        })
        .select()
        .single<DeliverableRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  listByTaskId: orgProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('deliverables')
        .select('*')
        .eq('task_id', input.taskId)
        .order('created_at', { ascending: true })
        .returns<DeliverableRow[]>()

      return data ?? []
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      fileUrl: z.string().url(),
      fileName: z.string(),
      fileSize: z.number().optional(),
      type: deliverableTypeEnum.optional(),
      status: deliverableStatusEnum.optional(),
      changeNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.supabase
        .from('deliverables')
        .select('*')
        .eq('id', input.id)
        .single<DeliverableRow>()

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Deliverable not found' })
      }

      // Auto-create version if file changed
      if (existing.file_url && existing.file_url !== input.fileUrl) {
        const { data: versions } = await ctx.supabase
          .from('deliverable_versions')
          .select('version_number')
          .eq('deliverable_id', existing.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .returns<{ version_number: number }[]>()

        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1

        await ctx.supabase.from('deliverable_versions').insert({
          deliverable_id: existing.id,
          version_number: nextVersion,
          file_url: existing.file_url,
          file_name: existing.file_name,
          file_size: existing.file_size,
          change_note: input.changeNote ?? null,
          created_by: ctx.user.id,
        })
      }

      const updates: Record<string, unknown> = {
        file_url: input.fileUrl,
        file_name: input.fileName,
        version: existing.version + 1,
      }
      if (input.fileSize) updates.file_size = input.fileSize
      if (input.type) updates.type = input.type
      if (input.status) updates.status = input.status

      const { data, error } = await ctx.supabase
        .from('deliverables')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single<DeliverableRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateStatus: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: deliverableStatusEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('deliverables')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single<DeliverableRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('deliverables')
        .delete()
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  getVersions: orgProcedure
    .input(z.object({ deliverableId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('deliverable_versions')
        .select('*')
        .eq('deliverable_id', input.deliverableId)
        .order('version_number', { ascending: false })
        .returns<DeliverableVersionRow[]>()

      return data ?? []
    }),
})
