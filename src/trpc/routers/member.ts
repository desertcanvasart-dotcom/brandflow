import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, adminProcedure, authedProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { resend } from '@/lib/email/client'
import { canAddSeat } from '@/lib/stripe/helpers'
import { logActivity } from '@/lib/activity/log'
import type { Database } from '@/types/database'

type InvitationRow = Database['public']['Tables']['invitations']['Row']
type MemberRow = Database['public']['Tables']['organization_members']['Row']
type MemberWithDepartment = MemberRow & {
  department: { id: string; name: string; color: string } | null
}

export const memberRouter = createTRPCRouter({
  list: orgProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('organization_members')
      .select('*, department:departments(id, name, color)')
      .eq('organization_id', ctx.orgId)
      .order('created_at', { ascending: true })
      .returns<MemberWithDepartment[]>()

    return data ?? []
  }),

  listInvitations: adminProcedure.query(async ({ ctx }) => {
    // `token` is deliberately not selected — it is a bearer credential that
    // grants org access, and nothing in the UI needs it.
    const { data } = await ctx.supabase
      .from('invitations')
      .select('id, email, role, status, expires_at, created_at, department_id, job_title')
      .eq('organization_id', ctx.orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const now = Date.now()
    return (data ?? []).map((invitation) => ({
      ...invitation,
      isExpired: new Date(invitation.expires_at).getTime() < now,
    }))
  }),

  cancelInvitation: adminProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Revoke rather than delete: keeps an audit trail, and acceptInvite /
      // signupViaInvite both filter on status='pending', so the outstanding
      // link stops working the moment this lands.
      const { data, error } = await supabaseAdmin
        .from('invitations')
        .update({ status: 'revoked' as const })
        .eq('id', input.invitationId)
        .eq('organization_id', ctx.orgId)
        .eq('status', 'pending')
        .select('id, email')
        .maybeSingle<Pick<InvitationRow, 'id' | 'email'>>()

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      }
      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'That invitation is no longer pending — it may have been accepted or already cancelled.',
        })
      }

      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'invitation_revoked',
        entityType: 'member',
        entityId: data.id,
        metadata: { email: data.email },
      })

      return { success: true }
    }),

  invite: adminProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'manager', 'creator', 'developer', 'viewer']),
      departmentId: z.string().uuid().optional(),
      jobTitle: z.string().max(100).optional(),
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

      // Supersede any invite already outstanding for this address, so one
      // email never has two live tokens pointing at different roles.
      await supabaseAdmin
        .from('invitations')
        .update({ status: 'revoked' as const })
        .eq('organization_id', ctx.orgId)
        .eq('email', input.email)
        .eq('status', 'pending')

      // Create invitation record
      const { data: invitation, error } = await supabaseAdmin
        .from('invitations')
        .insert({
          organization_id: ctx.orgId,
          email: input.email,
          role: input.role,
          invited_by: ctx.user.id,
          department_id: input.departmentId ?? null,
          job_title: input.jobTitle ?? null,
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
          from: 'Agency Beats <noreply@agencybeats.app>',
          to: input.email,
          subject: 'You\'ve been invited to Agency Beats',
          html: `
            <h2>You've been invited to join an organization on Agency Beats</h2>
            <p>Click the link below to accept the invitation:</p>
            <a href="${inviteUrl}">${inviteUrl}</a>
            <p>This invitation expires in 7 days.</p>
          `,
        })
      } catch {
        // Email sending is non-critical in development
        console.warn('Failed to send invite email. Invite token:', invitation.token)
      }

      // Audit log
      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'user_invited',
        entityType: 'member',
        entityId: invitation.id,
        metadata: { email: invitation.email, role: invitation.role },
      })

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
          department_id: invitation.department_id ?? null,
          job_title: invitation.job_title ?? null,
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

      // Post "member joined" system message in all project channels
      const memberName = ctx.user!.email?.split('@')[0] || 'A new member'
      const { data: orgChannels } = await supabaseAdmin
        .from('channels')
        .select('id')
        .eq('organization_id', invitation.organization_id)
        .eq('type', 'project')

      if (orgChannels?.length) {
        await supabaseAdmin.from('channel_messages').insert(
          orgChannels.map((ch) => ({
            channel_id: ch.id,
            user_id: null as unknown as string,
            content: `${memberName} has joined the team`,
            attachments: JSON.stringify([{ type: 'system', event: 'member_joined' }]),
          }))
        )
      }

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

        // Audit log
        await logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'role_changed',
          entityType: 'member',
          entityId: data.id,
          metadata: { newRole: input.role },
        })
      }

      return data
    }),

  updateMember: adminProcedure
    .input(z.object({
      memberId: z.string().uuid(),
      role: z.enum(['admin', 'manager', 'creator', 'developer', 'viewer']).optional(),
      departmentId: z.string().uuid().nullable().optional(),
      jobTitle: z.string().max(100).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.role !== undefined) updates.role = input.role
      if (input.departmentId !== undefined) updates.department_id = input.departmentId
      if (input.jobTitle !== undefined) updates.job_title = input.jobTitle

      const { data, error } = await supabaseAdmin
        .from('organization_members')
        .update(updates)
        .eq('id', input.memberId)
        .eq('organization_id', ctx.orgId)
        .select('*, department:departments(id, name, color)')
        .single()
        .returns<MemberWithDepartment>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Update JWT metadata if role changed
      if (input.role && data) {
        await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
          app_metadata: { user_role: input.role },
        })
      }

      return data
    }),

  getWorkloads: orgProcedure.query(async ({ ctx }) => {
    // 1. Get all project IDs for this org
    const { data: projects } = await ctx.supabase
      .from('projects')
      .select('id')
      .eq('organization_id', ctx.orgId)

    const projectIds = (projects ?? []).map((p) => p.id)
    if (projectIds.length === 0) return []

    // 2. Fetch all tasks with assignees in one query
    const COMPLETED_STATUSES = ['done', 'published']
    const { data: tasks } = await ctx.supabase
      .from('tasks')
      .select('assignee_id, status, due_date, project_id')
      .in('project_id', projectIds)
      .not('assignee_id', 'is', null)

    // 3. Aggregate per-member in memory
    const now = new Date().toISOString()
    const byMember: Record<string, {
      activeTasks: number
      projectIds: Set<string>
      overdueTasks: number
    }> = {}

    for (const t of tasks ?? []) {
      if (!t.assignee_id) continue
      if (!byMember[t.assignee_id]) {
        byMember[t.assignee_id] = { activeTasks: 0, projectIds: new Set(), overdueTasks: 0 }
      }
      const isCompleted = COMPLETED_STATUSES.includes(t.status)
      if (!isCompleted) {
        byMember[t.assignee_id].activeTasks++
        byMember[t.assignee_id].projectIds.add(t.project_id)
        if (t.due_date && t.due_date < now) {
          byMember[t.assignee_id].overdueTasks++
        }
      }
    }

    // 4. Convert Sets to counts and return
    return Object.entries(byMember).map(([userId, data]) => ({
      userId,
      activeTasks: data.activeTasks,
      projectCount: data.projectIds.size,
      overdueTasks: data.overdueTasks,
    }))
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
