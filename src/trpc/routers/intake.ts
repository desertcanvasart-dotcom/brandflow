import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { triggerEmbedding, stringifyForEmbedding } from '@/lib/ai/embedding-triggers'
import { logActivity } from '@/lib/activity/log'
import type { Database } from '@/types/database'

type IntakeRow = Database['public']['Tables']['project_intake']['Row']
type BriefRow = Database['public']['Tables']['service_briefs']['Row']
type AgendaRow = Database['public']['Tables']['meeting_agenda_templates']['Row']

export const intakeRouter = createTRPCRouter({
  // ── Extract intake from meeting transcript ────────────────
  extractFromMeeting: orgProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      meetingId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the meeting transcript
      const { data: meeting, error: meetingError } = await ctx.supabase
        .from('meetings')
        .select('id, transcript, title')
        .eq('id', input.meetingId)
        .single()

      if (meetingError || !meeting) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' })
      }

      if (!meeting.transcript) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Meeting has no transcript. Complete the meeting first.',
        })
      }

      // Call AI extraction endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/extract-intake`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: ctx.supabase.auth.getSession
              ? `sb-access-token=${(await ctx.supabase.auth.getSession()).data.session?.access_token}`
              : '',
          },
          body: JSON.stringify({
            transcript: meeting.transcript,
            projectId: input.projectId,
          }),
        }
      )

      if (!response.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to extract intake from transcript',
        })
      }

      const extraction = await response.json()

      // Save to database
      const { data: intake, error: insertError } = await supabaseAdmin
        .from('project_intake')
        .upsert(
          {
            project_id: input.projectId,
            organization_id: ctx.orgId,
            meeting_id: input.meetingId,
            client_name: extraction.client_name,
            company_name: extraction.company_name,
            industry: extraction.industry,
            goals: extraction.goals,
            services_requested: extraction.services_requested,
            target_audience: extraction.target_audience,
            competitors: extraction.competitors,
            budget_range: extraction.budget_range,
            timeline: extraction.timeline,
            start_date: extraction.start_date,
            pain_points: extraction.pain_points,
            existing_assets: extraction.existing_assets,
            raw_extraction: extraction,
            confidence: extraction.confidence,
            status: 'draft',
            extracted_by: ctx.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'project_id' }
        )
        .select()
        .single<IntakeRow>()

      if (insertError) {
        // If upsert on project_id fails (no unique constraint), try insert
        const { data: newIntake, error: fallbackError } = await supabaseAdmin
          .from('project_intake')
          .insert({
            project_id: input.projectId,
            organization_id: ctx.orgId,
            meeting_id: input.meetingId,
            client_name: extraction.client_name,
            company_name: extraction.company_name,
            industry: extraction.industry,
            goals: extraction.goals,
            services_requested: extraction.services_requested,
            target_audience: extraction.target_audience,
            competitors: extraction.competitors,
            budget_range: extraction.budget_range,
            timeline: extraction.timeline,
            start_date: extraction.start_date,
            pain_points: extraction.pain_points,
            existing_assets: extraction.existing_assets,
            raw_extraction: extraction,
            confidence: extraction.confidence,
            status: 'draft',
            extracted_by: ctx.user.id,
          })
          .select()
          .single<IntakeRow>()

        if (fallbackError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save intake data',
          })
        }
        return newIntake
      }

      return intake
    }),

  // ── Get intake by project ─────────────────────────────────
  getIntake: orgProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('project_intake')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<IntakeRow>()

      return data
    }),

  // ── Update intake fields ──────────────────────────────────
  updateIntake: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      client_name: z.string().nullable().optional(),
      company_name: z.string().nullable().optional(),
      industry: z.string().nullable().optional(),
      goals: z.array(z.string()).optional(),
      services_requested: z.array(z.string()).optional(),
      target_audience: z.record(z.string(), z.unknown()).optional(),
      competitors: z.array(z.record(z.string(), z.unknown())).optional(),
      budget_range: z.string().nullable().optional(),
      timeline: z.string().nullable().optional(),
      start_date: z.string().nullable().optional(),
      pain_points: z.array(z.string()).optional(),
      existing_assets: z.array(z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('project_intake')
        .update({ ...updates, updated_at: new Date().toISOString() } as Database['public']['Tables']['project_intake']['Update'])
        .eq('id', id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<IntakeRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Intake not found' })
      }
      return data
    }),

  // ── Approve intake ────────────────────────────────────────
  approveIntake: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('project_intake')
        .update({
          status: 'approved',
          reviewed_by: ctx.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<IntakeRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Intake not found' })
      }
      return data
    }),

  // ── Generate brief for one service type ───────────────────
  generateBrief: orgProcedure
    .input(z.object({
      intakeId: z.string().uuid(),
      projectId: z.string().uuid(),
      serviceType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch intake data
      const { data: intake } = await ctx.supabase
        .from('project_intake')
        .select('*')
        .eq('id', input.intakeId)
        .single<IntakeRow>()

      if (!intake) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Intake not found' })
      }

      // Fetch project context
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, name, type, description')
        .eq('id', input.projectId)
        .single()

      // Call AI brief generation endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/extract-brief`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: ctx.supabase.auth.getSession
              ? `sb-access-token=${(await ctx.supabase.auth.getSession()).data.session?.access_token}`
              : '',
          },
          body: JSON.stringify({
            intakeData: {
              client_name: intake.client_name,
              company_name: intake.company_name,
              industry: intake.industry,
              goals: intake.goals,
              services_requested: intake.services_requested,
              target_audience: intake.target_audience,
              competitors: intake.competitors,
              budget_range: intake.budget_range,
              timeline: intake.timeline,
              pain_points: intake.pain_points,
              existing_assets: intake.existing_assets,
            },
            serviceType: input.serviceType,
            projectContext: project,
          }),
        }
      )

      if (!response.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to generate brief for ${input.serviceType}`,
        })
      }

      const briefData = await response.json()

      // Save to database
      const { data: brief, error } = await supabaseAdmin
        .from('service_briefs')
        .insert({
          intake_id: input.intakeId,
          project_id: input.projectId,
          organization_id: ctx.orgId,
          service_type: input.serviceType,
          title: briefData.title,
          overview: briefData.overview,
          objectives: briefData.objectives,
          deliverables: briefData.deliverables,
          timeline: briefData.timeline,
          requirements: briefData.requirements,
          kpis: briefData.kpis,
          status: 'draft',
          generated_by: ctx.user.id,
        })
        .select()
        .single<BriefRow>()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to save brief',
        })
      }

      // Embed generated brief for RAG
      if (brief) {
        const text = stringifyForEmbedding({
          title: briefData.title,
          service_type: input.serviceType,
          overview: briefData.overview,
          objectives: briefData.objectives,
          deliverables: briefData.deliverables,
          requirements: briefData.requirements,
          kpis: briefData.kpis,
        })
        triggerEmbedding(ctx.orgId, 'brief', brief.id, text)
      }

      return brief
    }),

  // ── Generate all briefs for requested services ────────────
  generateAllBriefs: orgProcedure
    .input(z.object({
      intakeId: z.string().uuid(),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch intake
      const { data: intake } = await ctx.supabase
        .from('project_intake')
        .select('*')
        .eq('id', input.intakeId)
        .single<IntakeRow>()

      if (!intake) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Intake not found' })
      }

      const services = intake.services_requested ?? []
      if (services.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No services requested in intake',
        })
      }

      // Check for existing briefs to avoid duplicates
      const { data: existingBriefs } = await ctx.supabase
        .from('service_briefs')
        .select('service_type')
        .eq('intake_id', input.intakeId)

      const existingTypes = new Set((existingBriefs ?? []).map((b: { service_type: string }) => b.service_type))
      const newServices = services.filter((s: string) => !existingTypes.has(s))

      if (newServices.length === 0) {
        return { generated: 0, message: 'All briefs already exist' }
      }

      // Fetch project context once
      const { data: project } = await ctx.supabase
        .from('projects')
        .select('id, name, type, description')
        .eq('id', input.projectId)
        .single()

      const intakeData = {
        client_name: intake.client_name,
        company_name: intake.company_name,
        industry: intake.industry,
        goals: intake.goals,
        services_requested: intake.services_requested,
        target_audience: intake.target_audience,
        competitors: intake.competitors,
        budget_range: intake.budget_range,
        timeline: intake.timeline,
        pain_points: intake.pain_points,
        existing_assets: intake.existing_assets,
      }

      // Generate briefs sequentially to avoid rate limiting
      const results: BriefRow[] = []
      for (const serviceType of newServices) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/extract-brief`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Cookie: ctx.supabase.auth.getSession
                  ? `sb-access-token=${(await ctx.supabase.auth.getSession()).data.session?.access_token}`
                  : '',
              },
              body: JSON.stringify({
                intakeData,
                serviceType,
                projectContext: project,
              }),
            }
          )

          if (!response.ok) continue

          const briefData = await response.json()

          const { data: brief } = await supabaseAdmin
            .from('service_briefs')
            .insert({
              intake_id: input.intakeId,
              project_id: input.projectId,
              organization_id: ctx.orgId,
              service_type: serviceType,
              title: briefData.title,
              overview: briefData.overview,
              objectives: briefData.objectives,
              deliverables: briefData.deliverables,
              timeline: briefData.timeline,
              requirements: briefData.requirements,
              kpis: briefData.kpis,
              status: 'draft',
              generated_by: ctx.user.id,
            })
            .select()
            .single<BriefRow>()

          if (brief) {
            results.push(brief)
            // Embed generated brief for RAG
            const text = stringifyForEmbedding({
              title: briefData.title,
              service_type: serviceType,
              overview: briefData.overview,
              objectives: briefData.objectives,
              deliverables: briefData.deliverables,
              requirements: briefData.requirements,
              kpis: briefData.kpis,
            })
            triggerEmbedding(ctx.orgId, 'brief', brief.id, text)
          }
        } catch {
          // Continue with other services if one fails
        }
      }

      return { generated: results.length, briefs: results }
    }),

  // ── List briefs by project ────────────────────────────────
  listBriefs: orgProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      status: z.enum(['draft', 'in_review', 'approved', 'active', 'complete']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('service_briefs')
        .select('*')
        .eq('project_id', input.projectId)
        .eq('organization_id', ctx.orgId)
        .order('created_at', { ascending: true })

      if (input.status) query = query.eq('status', input.status)

      const { data } = await query.returns<BriefRow[]>()
      return data ?? []
    }),

  // ── Get single brief ──────────────────────────────────────
  getBrief: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('service_briefs')
        .select('*')
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .single<BriefRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brief not found' })
      }
      return data
    }),

  // ── Update brief ──────────────────────────────────────────
  updateBrief: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      overview: z.string().optional(),
      objectives: z.array(z.record(z.string(), z.unknown())).optional(),
      deliverables: z.array(z.record(z.string(), z.unknown())).optional(),
      timeline: z.record(z.string(), z.unknown()).optional(),
      requirements: z.record(z.string(), z.unknown()).optional(),
      kpis: z.array(z.record(z.string(), z.unknown())).optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      const { data, error } = await ctx.supabase
        .from('service_briefs')
        .update({ ...updates, updated_at: new Date().toISOString() } as Database['public']['Tables']['service_briefs']['Update'])
        .eq('id', id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<BriefRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brief not found' })
      }

      // Re-embed updated brief for RAG
      const briefText = stringifyForEmbedding({
        title: data.title,
        service_type: data.service_type,
        overview: data.overview,
        objectives: data.objectives as Record<string, unknown>,
        deliverables: data.deliverables as Record<string, unknown>,
        requirements: data.requirements as Record<string, unknown>,
        kpis: data.kpis as Record<string, unknown>,
      })
      triggerEmbedding(ctx.orgId, 'brief', data.id, briefText)

      return data
    }),

  // ── Approve brief ─────────────────────────────────────────
  approveBrief: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('service_briefs')
        .update({
          status: 'approved',
          approved_by: ctx.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<BriefRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brief not found' })
      }

      // Audit log
      await logActivity({
        supabase: ctx.supabase,
        orgId: ctx.orgId,
        actorId: ctx.user.id,
        action: 'brief_approved',
        entityType: 'project',
        entityId: data.id,
        projectId: data.project_id,
        metadata: { service_type: data.service_type },
      })

      return data
    }),

  // ── Complete brief (approved → complete) ─────────────────
  completeBrief: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify brief is approved before completing
      const { data: existing } = await ctx.supabase
        .from('service_briefs')
        .select('status')
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .single()

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brief not found' })
      }
      if (existing.status !== 'approved') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Brief must be approved before it can be completed',
        })
      }

      const { data, error } = await ctx.supabase
        .from('service_briefs')
        .update({
          status: 'complete',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<BriefRow>()

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to complete brief' })
      }
      return data
    }),

  // ── Generate tasks from a completed brief ───────────────
  generateTasksFromBrief: orgProcedure
    .input(z.object({
      briefId: z.string().uuid(),
      projectId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the brief (must be 'complete')
      const { data: brief } = await ctx.supabase
        .from('service_briefs')
        .select('*')
        .eq('id', input.briefId)
        .eq('organization_id', ctx.orgId)
        .single<BriefRow>()

      if (!brief) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Brief not found' })
      }
      if (brief.status !== 'complete') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Brief must be in "complete" status to generate tasks',
        })
      }

      // 2. Fetch task templates for this service type
      const { data: templates } = await supabaseAdmin
        .from('task_templates')
        .select('phase_name, task_name, type, estimated_hours, description')
        .eq('service_type', brief.service_type)
        .order('phase_name')
        .order('task_name')

      if (!templates || templates.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No task templates found for service type "${brief.service_type}"`,
        })
      }

      // 3. Call AI endpoint
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/generate-tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: ctx.supabase.auth.getSession
              ? `sb-access-token=${(await ctx.supabase.auth.getSession()).data.session?.access_token}`
              : '',
          },
          body: JSON.stringify({
            serviceType: brief.service_type,
            briefFields: {
              objectives: brief.objectives,
              deliverables: brief.deliverables,
              requirements: brief.requirements,
              kpis: brief.kpis,
              timeline: brief.timeline,
            },
            templates,
          }),
        }
      )

      if (!response.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate tasks from AI',
        })
      }

      const aiResponse = await response.json()
      const allTasks = aiResponse.tasks as Array<{
        phase_name: string
        task_name: string
        type: string
        estimated_hours: number
        include: boolean
        reason: string
      }>

      const includedTasks = allTasks.filter((t) => t.include)
      const excludedTasks = allTasks.filter((t) => !t.include)

      // 4. Get max sort_order for this project
      const { data: lastTask } = await ctx.supabase
        .from('tasks')
        .select('sort_order')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      let nextOrder = (lastTask?.sort_order ?? 0) + 1

      // 5. Insert included tasks
      const insertedTasks = []
      for (const task of includedTasks) {
        const { data: created, error } = await supabaseAdmin
          .from('tasks')
          .insert({
            project_id: input.projectId,
            title: task.task_name,
            description: `[${task.phase_name}] ${task.type ?? ''} — AI-generated from ${brief.service_type} brief`,
            status: 'todo',
            priority: 0,
            estimated_hours: task.estimated_hours,
            tags: [brief.service_type, task.phase_name.toLowerCase(), task.type].filter(Boolean) as string[],
            sort_order: nextOrder++,
            generation_reason: task.reason,
            source_brief_id: brief.id,
            created_by: ctx.user.id,
          })
          .select()
          .single()

        if (!error && created) {
          insertedTasks.push(created)
        }
      }

      // 6. Log to task_generation_log
      await supabaseAdmin
        .from('task_generation_log')
        .insert({
          project_id: input.projectId,
          brief_id: brief.id,
          organization_id: ctx.orgId,
          service_type: brief.service_type,
          full_ai_response: allTasks as unknown as Database['public']['Tables']['task_generation_log']['Insert']['full_ai_response'],
          included_tasks: includedTasks as unknown as Database['public']['Tables']['task_generation_log']['Insert']['included_tasks'],
          excluded_tasks: excludedTasks as unknown as Database['public']['Tables']['task_generation_log']['Insert']['excluded_tasks'],
          generated_by: ctx.user.id,
        })

      return {
        created: insertedTasks.length,
        excluded: excludedTasks.length,
        tasks: insertedTasks,
      }
    }),

  // ── Get task generation log for a brief ─────────────────
  getTaskGenerationLog: orgProcedure
    .input(z.object({ briefId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      type LogRow = Database['public']['Tables']['task_generation_log']['Row']
      const { data } = await ctx.supabase
        .from('task_generation_log')
        .select('*')
        .eq('brief_id', input.briefId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle<LogRow>()

      return data
    }),

  // ── List task templates for a service type ──────────────
  listTaskTemplates: orgProcedure
    .input(z.object({ serviceType: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get system defaults + org-specific templates
      const { data } = await ctx.supabase
        .from('task_templates')
        .select('*')
        .eq('service_type', input.serviceType)
        .order('phase_name')
        .order('task_name')

      return data ?? []
    }),

  // ── Get agenda templates ──────────────────────────────────
  getAgendaTemplates: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('meeting_agenda_templates')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('is_default', { ascending: false })
        .order('name')
        .returns<AgendaRow[]>()

      return data ?? []
    }),
})
