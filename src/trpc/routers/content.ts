import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import { logActivity } from '@/lib/activity/log'
import { createNotification } from '@/lib/notifications/create'
import type { Database } from '@/types/database'

type ContentItemRow = Database['public']['Tables']['content_items']['Row']
type ContentVersionRow = Database['public']['Tables']['content_versions']['Row']

const platformEnum = z.enum([
  'instagram', 'facebook', 'twitter', 'linkedin',
  'tiktok', 'youtube', 'blog', 'newsletter', 'other',
])

export const contentRouter = createTRPCRouter({
  create: orgProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      platform: platformEnum.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('content_items')
        .insert({
          task_id: input.taskId,
          platform: input.platform ?? 'other',
        })
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  listByTaskId: orgProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('content_items')
        .select('*')
        .eq('task_id', input.taskId)
        .order('created_at', { ascending: true })
        .returns<ContentItemRow[]>()

      return data ?? []
    }),

  update: orgProcedure
    .input(z.object({
      id: z.string().uuid(),
      body: z.string().optional(),
      mediaUrls: z.array(z.string()).optional(),
      hashtags: z.array(z.string()).optional(),
      scheduledAt: z.string().optional().nullable(),
      platform: platformEnum.optional(),
      changeNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current content item by its own ID
      const { data: existing } = await ctx.supabase
        .from('content_items')
        .select('*')
        .eq('id', input.id)
        .single<ContentItemRow>()

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Content item not found' })
      }

      // Auto-create version before update (only if body exists)
      if (existing.body) {
        const { data: versions } = await ctx.supabase
          .from('content_versions')
          .select('version_number')
          .eq('content_item_id', existing.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .returns<{ version_number: number }[]>()

        const nextVersion = (versions?.[0]?.version_number ?? 0) + 1

        await ctx.supabase.from('content_versions').insert({
          content_item_id: existing.id,
          version_number: nextVersion,
          body: existing.body,
          media_urls: existing.media_urls,
          change_note: input.changeNote ?? null,
          created_by: ctx.user.id,
        })
      }

      // Update the content item
      const updates: Record<string, unknown> = {}
      if (input.body !== undefined) updates.body = input.body
      if (input.mediaUrls) updates.media_urls = input.mediaUrls
      if (input.hashtags) updates.hashtags = input.hashtags
      if (input.scheduledAt !== undefined) updates.scheduled_at = input.scheduledAt
      if (input.platform) updates.platform = input.platform

      const { data, error } = await ctx.supabase
        .from('content_items')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('content_items')
        .delete()
        .eq('id', input.id)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),

  getVersions: orgProcedure
    .input(z.object({ contentItemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from('content_versions')
        .select('*')
        .eq('content_item_id', input.contentItemId)
        .order('version_number', { ascending: false })
        .returns<ContentVersionRow[]>()

      return data ?? []
    }),

  // ── Scheduling procedures ──

  listQueue: orgProcedure
    .input(z.object({
      brandId: z.string().uuid().optional(),
      platform: platformEnum.optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      type QueueItem = ContentItemRow & {
        tasks: {
          id: string
          title: string
          status: string
          projects: {
            organization_id: string
            brand_id: string
            name: string
            brands: { name: string }
          }
        }
      }

      const { data } = await ctx.supabase
        .from('content_items')
        .select('*, tasks!inner(id, title, status, projects!inner(organization_id, brand_id, name, brands(name)))')
        .not('scheduled_at', 'is', null)
        .order('scheduled_at', { ascending: true })

      // Filter by org
      let filtered = ((data ?? []) as QueueItem[]).filter(
        (item) => item.tasks.projects.organization_id === ctx.orgId
      )

      // Apply optional filters
      if (input?.brandId) {
        filtered = filtered.filter((item) => item.tasks.projects.brand_id === input.brandId)
      }
      if (input?.platform) {
        filtered = filtered.filter((item) => item.platform === input.platform)
      }
      if (input?.status) {
        filtered = filtered.filter((item) => item.tasks.status === input.status)
      }

      return filtered
    }),

  schedule: orgProcedure
    .input(z.object({
      contentItemId: z.string().uuid(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update scheduled_at on content item
      const { data, error } = await ctx.supabase
        .from('content_items')
        .update({ scheduled_at: input.scheduledAt })
        .eq('id', input.contentItemId)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Auto-transition task to 'scheduled'
      await ctx.supabase
        .from('tasks')
        .update({ status: 'scheduled' as const })
        .eq('id', data.task_id)

      // ── Automation hooks ──
      try {
        const { data: task } = await ctx.supabase
          .from('tasks')
          .select('id, title, project_id, assignee_id, projects(name)')
          .eq('id', data.task_id)
          .single<{
            id: string; title: string; project_id: string
            assignee_id: string | null
            projects: { name: string } | null
          }>()

        const { data: actor } = await ctx.supabase
          .from('organization_members')
          .select('display_name')
          .eq('user_id', ctx.user.id)
          .eq('organization_id', ctx.orgId)
          .single<{ display_name: string | null }>()

        const actorName = actor?.display_name ?? 'Someone'

        await logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'content_scheduled',
          entityType: 'content_item',
          entityId: data.id,
          projectId: task?.project_id ?? null,
          metadata: {
            task_title: task?.title,
            project_name: task?.projects?.name,
            platform: data.platform,
            scheduled_at: input.scheduledAt,
            actor_name: actorName,
          },
        })

        if (task?.assignee_id && task.assignee_id !== ctx.user.id) {
          const taskUrl = `/projects/${task.project_id}?task=${task.id}`
          await createNotification({
            supabase: ctx.supabase,
            orgId: ctx.orgId,
            actorId: ctx.user.id,
            recipientUserId: task.assignee_id,
            type: 'content_scheduled',
            title: `Content scheduled for "${task.title}"`,
            body: `${actorName} scheduled ${data.platform} content for ${new Date(input.scheduledAt).toLocaleDateString()}`,
            link: taskUrl,
            metadata: { task_id: task.id, content_item_id: data.id },
          })
        }
      } catch {
        // Never break the main operation
      }

      return data
    }),

  unschedule: orgProcedure
    .input(z.object({
      contentItemId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get content item to find task_id
      const { data: item } = await ctx.supabase
        .from('content_items')
        .select('*')
        .eq('id', input.contentItemId)
        .single<ContentItemRow>()

      if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Content item not found' })

      // Clear scheduled_at
      const { data, error } = await ctx.supabase
        .from('content_items')
        .update({ scheduled_at: null })
        .eq('id', input.contentItemId)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Check if any other content items on this task still have a schedule
      const { data: siblings } = await ctx.supabase
        .from('content_items')
        .select('id')
        .eq('task_id', item.task_id)
        .not('scheduled_at', 'is', null)
        .neq('id', input.contentItemId)

      // Only revert task status if no siblings are scheduled
      if (!siblings || siblings.length === 0) {
        await ctx.supabase
          .from('tasks')
          .update({ status: 'approved' as const })
          .eq('id', item.task_id)
      }

      return data
    }),

  markPublished: orgProcedure
    .input(z.object({
      contentItemId: z.string().uuid(),
      publishedUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {
        published_at: new Date().toISOString(),
      }
      if (input.publishedUrl) updates.published_url = input.publishedUrl

      const { data, error } = await ctx.supabase
        .from('content_items')
        .update(updates)
        .eq('id', input.contentItemId)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })

      // Auto-transition task to 'published'
      await ctx.supabase
        .from('tasks')
        .update({ status: 'published' as const })
        .eq('id', data.task_id)

      // ── Automation hooks ──
      try {
        const { data: task } = await ctx.supabase
          .from('tasks')
          .select('id, title, project_id, assignee_id, projects(name)')
          .eq('id', data.task_id)
          .single<{
            id: string; title: string; project_id: string
            assignee_id: string | null
            projects: { name: string } | null
          }>()

        const { data: actor } = await ctx.supabase
          .from('organization_members')
          .select('display_name')
          .eq('user_id', ctx.user.id)
          .eq('organization_id', ctx.orgId)
          .single<{ display_name: string | null }>()

        const actorName = actor?.display_name ?? 'Someone'

        await logActivity({
          supabase: ctx.supabase,
          orgId: ctx.orgId,
          actorId: ctx.user.id,
          action: 'content_published',
          entityType: 'content_item',
          entityId: data.id,
          projectId: task?.project_id ?? null,
          metadata: {
            task_title: task?.title,
            project_name: task?.projects?.name,
            platform: data.platform,
            published_url: input.publishedUrl,
            actor_name: actorName,
          },
        })

        if (task?.assignee_id && task.assignee_id !== ctx.user.id) {
          const taskUrl = `/projects/${task.project_id}?task=${task.id}`
          await createNotification({
            supabase: ctx.supabase,
            orgId: ctx.orgId,
            actorId: ctx.user.id,
            recipientUserId: task.assignee_id,
            type: 'content_published',
            title: `"${task.title}" has been published`,
            body: `${actorName} marked ${data.platform} content as published`,
            link: taskUrl,
            metadata: { task_id: task.id, content_item_id: data.id },
          })
        }
      } catch {
        // Never break the main operation
      }

      return data
    }),

  restoreVersion: orgProcedure
    .input(z.object({
      contentItemId: z.string().uuid(),
      versionId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: version } = await ctx.supabase
        .from('content_versions')
        .select('*')
        .eq('id', input.versionId)
        .single<ContentVersionRow>()

      if (!version) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' })
      }

      const { data, error } = await ctx.supabase
        .from('content_items')
        .update({
          body: version.body,
          media_urls: version.media_urls,
        })
        .eq('id', input.contentItemId)
        .select()
        .single<ContentItemRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),
})
