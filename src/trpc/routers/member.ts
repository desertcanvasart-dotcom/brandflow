import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, adminProcedure, authedProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/email/client'
import { canAddSeat } from '@/lib/stripe/helpers'
import type { Database } from '@/types/database'

type InvitationRow = Database['public']['Tables']['invitations']['Row']
type MemberRow = Database['public']['Tables']['organization_members']['Row']

export const memberRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', ctx.orgId)
      .order('created_at', { ascending: true })
      .returns<MemberRow[]>()

    return data ?? []
  }),

  invite: adminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'manager', 'creator', 'developer', 'viewer']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Plan enforcement: check seat limits
      const seatCheck = await canAddSeat(ctx.orgId)
      if (!seatCheck.allowed) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: seatCheck.reason ?? 'Seat limit reached for your current plan',
        })
      }

      // Create invitation record
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          organization_id: ctx.orgId,
          email: input.email,
          role: input.role,
          invited_by: ctx.user.id,
        })
        .select()
        .single<InvitationRow>()

      if (error || !invitation) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message ?? 'Failed to create invitation',
        })
      }

      // Send invite email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${appUrl}/invite/${invitation.token}`

      try {
        await resend.emails.send({
          from: 'BrandFlow <noreply@brandflow.app>',
          to: input.email,
          subject: 'You\'ve been invited to BrandFlow',
          html: `
            <h2>You've been invited to join an organization on BrandFlow</h2>
            <p>Click the link below to accept the invitation:</p>
            <a href="${inviteUrl}">${inviteUrl}</a>
            <p>This invitation expires in 7 days.</p>
          `,
        })
      } catch {
        // Email sending is non-critical in development
        console.warn('Failed to send invite email. Invite token:', invitation.token)
      }

      return invitation
    }),

  acceptInvite: authedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id

      // Look up the invitation
      const { data: invitation } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('token', input.token)
        .eq('status', 'pending')
        .single<InvitationRow>()

      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired invitation' })
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseAdmin
          .from('invitations')
          .update({ status: 'expired' as const })
          .eq('id', invitation.id)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' })
      }

      // Create org membership
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
          display_name: ctx.user!.email?.split('@')[0] || 'User',
        })

      if (memberError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: memberError.message,
        })
      }

      // Update user app_metadata
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          organization_id: invitation.organization_id,
          user_role: invitation.role,
        },
      })

      // Mark invitation as accepted
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'accepted' as const })
        .eq('id', invitation.id)

      return { organizationId: invitation.organization_id }
    }),

  updateRole: adminProcedure
    .input(z.object({
      memberId: z.string().uuid(),
      role: z.enum(['admin', 'manager', 'creator', 'developer', 'viewer']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await supabaseAdmin
        .from('organization_members')
        .update({ role: input.role })
        .eq('id', input.memberId)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<MemberRow>()

      if (error) throw error

      // Update user's JWT metadata
      if (data) {
        await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
          app_metadata: { user_role: input.role },
        })
      }

      return data
    }),

  remove: adminProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await supabaseAdmin
        .from('organization_members')
        .delete()
        .eq('id', input.memberId)
        .eq('organization_id', ctx.orgId)

      if (error) throw error
      return { success: true }
    }),
})
