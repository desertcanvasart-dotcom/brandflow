import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, superAdminProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const superAdminRouter = createTRPCRouter({
  // Platform-wide stats
  platformStats: superAdminProcedure.query(async () => {
    const [orgsResult, membersResult, subsResult] = await Promise.all([
      supabaseAdmin
        .from('organizations')
        .select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

    return {
      totalOrganizations: orgsResult.count ?? 0,
      totalActiveUsers: membersResult.count ?? 0,
      totalActiveSubscriptions: subsResult.count ?? 0,
    }
  }),

  // List all organizations with member counts
  listOrganizations: superAdminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      let query = supabaseAdmin
        .from('organizations')
        .select('*, subscriptions(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(
          input?.offset ?? 0,
          (input?.offset ?? 0) + (input?.limit ?? 50) - 1
        )

      if (input?.search) {
        query = query.ilike('name', `%${input.search}%`)
      }

      const { data, count, error } = await query
      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })

      const orgsWithCounts = await Promise.all(
        (data ?? []).map(async (org) => {
          const { count: memberCount } = await supabaseAdmin
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('is_active', true)
          return { ...org, memberCount: memberCount ?? 0 }
        })
      )

      return { organizations: orgsWithCounts, total: count ?? 0 }
    }),

  // Get organization detail
  getOrganization: superAdminProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('*, subscriptions(*)')
        .eq('id', input.orgId)
        .single()

      if (!org)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' })

      const [membersResult, brandsResult, projectsResult] = await Promise.all([
        supabaseAdmin
          .from('organization_members')
          .select('*')
          .eq('organization_id', input.orgId)
          .order('created_at'),
        supabaseAdmin
          .from('brands')
          .select('id, name, slug, is_active')
          .eq('organization_id', input.orgId),
        supabaseAdmin
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', input.orgId),
      ])

      return {
        ...org,
        members: membersResult.data ?? [],
        brands: brandsResult.data ?? [],
        projectCount: projectsResult.count ?? 0,
      }
    }),

  // Disable/enable an organization
  toggleOrganization: superAdminProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        disabled: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { error } = await supabaseAdmin
        .from('organizations')
        .update({
          is_disabled: input.disabled,
          disabled_at: input.disabled ? new Date().toISOString() : null,
          disabled_reason: input.disabled ? (input.reason ?? null) : null,
        })
        .eq('id', input.orgId)

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return { success: true }
    }),

  // Ban/unban a user
  toggleUser: superAdminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        disabled: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        input.userId,
        {
          ban_duration: input.disabled ? '876600h' : 'none',
        }
      )
      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return { success: true }
    }),

  // Override an organization's subscription plan
  overrideSubscription: superAdminProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        plan: z.enum(['starter', 'pro', 'agency']),
        status: z.enum(['active', 'canceled', 'paused']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { data: existing } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('organization_id', input.orgId)
        .single()

      if (existing) {
        const updates: Record<string, unknown> = { plan: input.plan }
        if (input.status) updates.status = input.status
        await supabaseAdmin
          .from('subscriptions')
          .update(updates)
          .eq('organization_id', input.orgId)
      } else {
        await supabaseAdmin.from('subscriptions').insert({
          organization_id: input.orgId,
          stripe_subscription_id: `manual_override_${input.orgId}`,
          plan: input.plan,
          status: input.status ?? 'active',
        })
      }

      return { success: true }
    }),

  // Impersonate an organization (switch context)
  switchOrgContext: superAdminProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        ctx.user.id,
        {
          app_metadata: {
            ...ctx.user.app_metadata,
            organization_id: input.orgId,
            user_role: 'admin',
            impersonating_org: true,
          },
        }
      )
      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })
      return { success: true }
    }),

  // Return to own organization
  returnToOwnOrg: superAdminProcedure.mutation(async ({ ctx }) => {
    const { data: ownMembership } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', ctx.user.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!ownMembership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No organization membership found',
      })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      ctx.user.id,
      {
        app_metadata: {
          ...ctx.user.app_metadata,
          organization_id: ownMembership.organization_id,
          user_role: ownMembership.role,
          impersonating_org: false,
        },
      }
    )
    if (error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      })
    return { success: true }
  }),

  // List platform admins
  listAdmins: superAdminProcedure.query(async () => {
    const { data } = await supabaseAdmin
      .from('platform_admins')
      .select('*')
      .order('granted_at')
    return data ?? []
  }),

  // Add a platform admin
  addAdmin: superAdminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabaseAdmin.from('platform_admins').insert({
        user_id: input.userId,
        granted_by: ctx.user.id,
        notes: input.notes ?? null,
      })
      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })

      // Update the user's app_metadata
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(
        input.userId
      )
      if (targetUser?.user) {
        await supabaseAdmin.auth.admin.updateUserById(input.userId, {
          app_metadata: {
            ...targetUser.user.app_metadata,
            is_super_admin: true,
          },
        })
      }

      return { success: true }
    }),

  // Remove a platform admin
  removeAdmin: superAdminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot remove yourself as super admin',
        })
      }

      const { error } = await supabaseAdmin
        .from('platform_admins')
        .delete()
        .eq('user_id', input.userId)

      if (error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        })

      // Update the user's app_metadata
      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(
        input.userId
      )
      if (targetUser?.user) {
        await supabaseAdmin.auth.admin.updateUserById(input.userId, {
          app_metadata: {
            ...targetUser.user.app_metadata,
            is_super_admin: false,
          },
        })
      }

      return { success: true }
    }),
})
