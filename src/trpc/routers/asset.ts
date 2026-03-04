import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import type { Database } from '@/types/database'

type AssetRow = Database['public']['Tables']['assets']['Row']

export const assetRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({
      brandId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      type: z.enum(['logo', 'image', 'video', 'document', 'font', 'icon', 'template', 'other']).optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('assets')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })

      if (input?.brandId) query = query.eq('brand_id', input.brandId)
      if (input?.projectId) query = query.eq('project_id', input.projectId)
      if (input?.type) query = query.eq('type', input.type)
      if (input?.search) query = query.ilike('name', `%${input.search}%`)

      const { data } = await query.returns<AssetRow[]>()
      return data ?? []
    }),

  create: orgProcedure
    .input(z.object({
      brandId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      type: z.enum(['logo', 'image', 'video', 'document', 'font', 'icon', 'template', 'other']),
      name: z.string().min(1),
      fileUrl: z.string().url(),
      fileName: z.string(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('assets')
        .insert({
          organization_id: ctx.orgId,
          brand_id: input.brandId ?? null,
          project_id: input.projectId ?? null,
          uploaded_by: ctx.user.id,
          type: input.type,
          name: input.name,
          file_url: input.fileUrl,
          file_name: input.fileName,
          file_size: input.fileSize ?? null,
          mime_type: input.mimeType ?? null,
          thumbnail_url: input.thumbnailUrl ?? null,
          tags: input.tags ?? [],
        })
        .select()
        .single<AssetRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      type: z.enum(['logo', 'image', 'video', 'document', 'font', 'icon', 'template', 'other']).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name) updates.name = input.name
      if (input.type) updates.type = input.type
      if (input.tags) updates.tags = input.tags

      const { data, error } = await ctx.supabase
        .from('assets')
        .update(updates)
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<AssetRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('assets')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
