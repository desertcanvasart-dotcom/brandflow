import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, publicProcedure, orgProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import type { Database } from '@/types/database'

type OrgRow = Database['public']['Tables']['organizations']['Row']
type MemberRow = Database['public']['Tables']['organization_members']['Row']

export const authRouter = createTRPCRouter({
  // Full signup: creates user (admin API, no email), org, and membership
  signup: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      orgName: z.string().min(2),
      displayName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // Create user via admin API — auto-confirmed, no email sent
      const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { display_name: input.displayName },
      })

      if (createError || !user) {
        const msg = createError?.message ?? 'Failed to create account'
        if (msg.includes('already been registered')) {
          throw new TRPCError({ code: 'CONFLICT', message: 'An account with this email already exists' })
        }
        throw new TRPCError({ code: 'BAD_REQUEST', message: msg })
      }

      const orgSlug = slugify(input.orgName)

      // Create organization
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: input.orgName, slug: orgSlug })
        .select()
        .single<OrgRow>()

      if (orgError || !org) {
        // Clean up the user if org creation fails
        await supabaseAdmin.auth.admin.deleteUser(user.id)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create organization: ${orgError?.message}`,
        })
      }

      // Create org membership with admin role
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: 'admin' as const,
          display_name: input.displayName,
        })

      if (memberError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create membership: ${memberError.message}`,
        })
      }

      // Check if this is the first user on the platform (auto-promote to super admin)
      const { count: totalMembers } = await supabaseAdmin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })

      const isFirstUser = (totalMembers ?? 0) <= 1

      if (isFirstUser) {
        await supabaseAdmin.from('platform_admins').insert({
          user_id: user.id,
          notes: 'Auto-promoted: first user on platform',
        })
      }

      // Set app_metadata so JWT contains org info
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        app_metadata: {
          organization_id: org.id,
          user_role: 'admin',
          ...(isFirstUser && { is_super_admin: true }),
        },
      })

      return { organizationId: org.id }
    }),

  me: orgProcedure.query(async ({ ctx }) => {
    const { data: member } = await ctx.supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', ctx.user.id)
      .eq('organization_id', ctx.orgId)
      .single<MemberRow & { organizations: OrgRow }>()

    return {
      user: ctx.user,
      member,
      orgId: ctx.orgId,
      role: ctx.userRole,
    }
  }),
})
