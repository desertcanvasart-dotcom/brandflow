import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, authedProcedure, managerProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'

type BrandRow = Database['public']['Tables']['brands']['Row']
type TaskRow = Database['public']['Tables']['tasks']['Row']
type ContentItemRow = Database['public']['Tables']['content_items']['Row']
type PhaseRow = Database['public']['Tables']['phases']['Row']
type ClientAccessRow = Database['public']['Tables']['client_access']['Row']

export const portalRouter = createTRPCRouter({
  // Admin: list client access for a brand
  listAccess: managerProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('client_access')
        .select('*')
        .eq('brand_id', input.brandId)
        .order('created_at', { ascending: false })
        .returns<ClientAccessRow[]>()

      return data ?? []
    }),

  // Admin: grant client access to a brand by email
  grantAccess: managerProcedure
    .input(z.object({
      brandId: z.string().uuid(),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the user by email
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const targetUser = users.find((u) => u.email === input.email)

      if (!targetUser) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No user found with that email. They must sign up first.' })
      }

      // Check if access already exists
      const { data: existing } = await ctx.supabase
        .from('client_access')
        .select('id')
        .eq('user_id', targetUser.id)
        .eq('brand_id', input.brandId)
        .single()

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User already has access to this brand' })
      }

      const { data, error } = await supabaseAdmin
        .from('client_access')
        .insert({
          user_id: targetUser.id,
          brand_id: input.brandId,
          granted_by: ctx.user.id,
        })
        .select()
        .single<ClientAccessRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  // Admin: revoke client access
  revokeAccess: managerProcedure
    .input(z.object({ accessId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabaseAdmin
        .from('client_access')
        .delete()
        .eq('id', input.accessId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  // Get brands this client has access to
  getBrands: authedProcedure.query(async ({ ctx }) => {
    const { data: access } = await ctx.supabase
      .from('client_access')
      .select('*, brands(*)')
      .eq('user_id', ctx.user!.id)
      .returns<(Database['public']['Tables']['client_access']['Row'] & { brands: BrandRow })[]>()

    return (access ?? []).map((a) => a.brands).filter(Boolean)
  }),

  // Get content items pending client review for a brand
  getContentQueue: authedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify client has access to this brand
      const { data: access } = await ctx.supabase
        .from('client_access')
        .select('id')
        .eq('user_id', ctx.user!.id)
        .eq('brand_id', input.brandId)
        .single()

      if (!access) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No access to this brand' })
      }

      // Get tasks in client_review status for this brand's projects
      const { data } = await ctx.supabase
        .from('tasks')
        .select('*, content_items(*), projects!inner(brand_id)')
        .eq('status', 'client_review')
        .eq('projects.brand_id', input.brandId)
        .order('updated_at', { ascending: false })
        .returns<(TaskRow & { content_items: ContentItemRow[]; projects: { brand_id: string } })[]>()

      return data ?? []
    }),

  // Get project milestones for a brand
  getProjectMilestones: authedProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify access
      const { data: access } = await ctx.supabase
        .from('client_access')
        .select('id')
        .eq('user_id', ctx.user!.id)
        .eq('brand_id', input.brandId)
        .single()

      if (!access) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const { data: projects } = await ctx.supabase
        .from('projects')
        .select('*, phases(*)')
        .eq('brand_id', input.brandId)
        .in('status', ['active', 'completed'])
        .order('updated_at', { ascending: false })
        .returns<(Database['public']['Tables']['projects']['Row'] & { phases: PhaseRow[] })[]>()

      return projects ?? []
    }),

  // Approve content
  approve: authedProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update task status to approved
      const { error } = await ctx.supabase
        .from('tasks')
        .update({ status: 'approved' as const })
        .eq('id', input.taskId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Add approval comment if provided
      if (input.comment) {
        await ctx.supabase.from('comments').insert({
          task_id: input.taskId,
          author_id: ctx.user!.id,
          body: input.comment,
          is_internal: false,
        })
      }

      return { success: true }
    }),

  // Request changes
  requestChanges: authedProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      comment: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Move back to in_progress
      const { error } = await ctx.supabase
        .from('tasks')
        .update({ status: 'in_progress' as const })
        .eq('id', input.taskId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Add change request comment
      await ctx.supabase.from('comments').insert({
        task_id: input.taskId,
        author_id: ctx.user!.id,
        body: input.comment,
        is_internal: false,
      })

      return { success: true }
    }),
})
