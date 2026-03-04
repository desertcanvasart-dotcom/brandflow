import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import type { Database } from '@/types/database'

type BrandContactRow = Database['public']['Tables']['brand_contacts']['Row']

export const brandContactRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('brand_contacts')
        .select('*')
        .eq('brand_id', input.brandId)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })
        .returns<BrandContactRow[]>()

      return data ?? []
    }),

  create: managerProcedure
    .input(z.object({
      brandId: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
      isPrimary: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as primary, unset other primaries for this brand
      if (input.isPrimary) {
        await ctx.supabase
          .from('brand_contacts')
          .update({ is_primary: false })
          .eq('brand_id', input.brandId)
      }

      const { data, error } = await ctx.supabase
        .from('brand_contacts')
        .insert({
          brand_id: input.brandId,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          job_title: input.jobTitle || null,
          is_primary: input.isPrimary ?? false,
          notes: input.notes || null,
        })
        .select()
        .single<BrandContactRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  update: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      brandId: z.string().uuid(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      jobTitle: z.string().optional(),
      isPrimary: z.boolean().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If setting as primary, unset other primaries for this brand
      if (input.isPrimary) {
        await ctx.supabase
          .from('brand_contacts')
          .update({ is_primary: false })
          .eq('brand_id', input.brandId)
          .neq('id', input.id)
      }

      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name
      if (input.email !== undefined) updates.email = input.email || null
      if (input.phone !== undefined) updates.phone = input.phone || null
      if (input.jobTitle !== undefined) updates.job_title = input.jobTitle || null
      if (input.isPrimary !== undefined) updates.is_primary = input.isPrimary
      if (input.notes !== undefined) updates.notes = input.notes || null

      const { data, error } = await ctx.supabase
        .from('brand_contacts')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single<BrandContactRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('brand_contacts')
        .delete()
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})
