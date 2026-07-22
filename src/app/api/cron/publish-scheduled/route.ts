import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { publishToFacebook, publishToInstagram } from '@/lib/social/meta'
import { publishTweet } from '@/lib/social/twitter'
import { publishToLinkedIn } from '@/lib/social/linkedin'
import { isTokenExpired, refreshConnectionToken } from '@/lib/social/oauth'
import type { SocialPublishRequest } from '@/lib/social/types'

const MAX_BATCH_SIZE = 50
const MAX_RETRIES = 3

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = { processed: 0, succeeded: 0, failed: 0, skipped: 0 }

    // -----------------------------------------------------------------------
    // Step 1: Find content items that are ready to publish
    // -----------------------------------------------------------------------
    const { data: readyItems } = await supabaseAdmin
      .from('content_items' as any)
      .select('task_id')
      .lte('scheduled_at', new Date().toISOString())
      .is('published_at', null)
      .limit(MAX_BATCH_SIZE)

    if (!readyItems?.length) {
      return NextResponse.json(stats)
    }

    const readyTaskIds = [...new Set((readyItems as any[]).map((item: any) => item.task_id))]

    // -----------------------------------------------------------------------
    // Step 2: Atomically claim tasks by setting status to 'publishing'
    //         Only tasks currently in 'scheduled' status can be claimed.
    //         This prevents duplicate publishes if the cron fires twice.
    // -----------------------------------------------------------------------
    const { data: claimedTasks } = await supabaseAdmin
      .from('tasks')
      .update({ status: 'publishing' } as any)
      .in('id', readyTaskIds)
      .eq('status', 'scheduled' as any)
      .select('id')

    if (!claimedTasks?.length) {
      return NextResponse.json(stats)
    }

    const claimedTaskIds = claimedTasks.map((t: any) => t.id)

    // -----------------------------------------------------------------------
    // Step 3: Fetch content items for claimed tasks
    // -----------------------------------------------------------------------
    const { data: contentItems } = await supabaseAdmin
      .from('content_items' as any)
      .select('*')
      .in('task_id', claimedTaskIds)
      .lte('scheduled_at', new Date().toISOString())
      .is('published_at', null)

    if (!contentItems?.length) {
      // Revert claimed tasks back to scheduled since there's nothing to publish
      await supabaseAdmin
        .from('tasks')
        .update({ status: 'scheduled' } as any)
        .in('id', claimedTaskIds)

      return NextResponse.json(stats)
    }

    // -----------------------------------------------------------------------
    // Step 4: Process each content item
    // -----------------------------------------------------------------------
    for (const item of contentItems as any[]) {
      stats.processed++

      try {
        const contentItem = item as {
          id: string
          task_id: string
          platform: string
          body: string | null
          media_urls: string[] | null
          hashtags: string[] | null
          metadata: Record<string, any> | null
        }

        // Fetch the task's project to get brand_id
        const { data: task } = await supabaseAdmin
          .from('tasks')
          .select('id, project_id, assignee_id')
          .eq('id', contentItem.task_id)
          .single()

        if (!task) {
          console.error('[publish-scheduled] Task not found:', contentItem.task_id)
          stats.failed++
          continue
        }

        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('id, brand_id, organization_id')
          .eq('id', (task as any).project_id)
          .single()

        if (!project) {
          console.error('[publish-scheduled] Project not found for task:', contentItem.task_id)
          await revertTaskStatus(contentItem.task_id)
          stats.failed++
          continue
        }

        // Look up social connection for brand + platform
        const { data: connection } = await supabaseAdmin
          .from('social_connections' as any)
          .select('*')
          .eq('brand_id', (project as any).brand_id)
          .eq('platform', contentItem.platform)
          .eq('is_active', true)
          .single()

        if (!connection) {
          console.warn(
            `[publish-scheduled] No active ${contentItem.platform} connection for brand ${(project as any).brand_id}`,
          )
          await revertTaskStatus(contentItem.task_id)

          // Create notification for missing connection
          if ((task as any).assignee_id) {
            await createNotification({
              userId: (task as any).assignee_id,
              organizationId: (project as any).organization_id,
              title: 'Publishing skipped — no social connection',
              body: `No active ${contentItem.platform} connection found. Please reconnect the account.`,
              type: 'task_updated',
              link: `/brands/${(project as any).brand_id}`,
            })
          }

          stats.skipped++
          continue
        }

        const conn = connection as any

        // Check token expiry and refresh if needed
        if (isTokenExpired(conn.token_expires_at)) {
          const refreshResult = await refreshConnectionToken({
            id: conn.id,
            platform: conn.platform,
            access_token: conn.access_token,
            refresh_token: conn.refresh_token,
            token_expires_at: conn.token_expires_at,
            page_access_token: conn.page_access_token,
            platform_page_id: conn.platform_page_id,
            is_active: conn.is_active,
          })

          if (!refreshResult) {
            console.error(
              `[publish-scheduled] Token refresh failed for connection ${conn.id}`,
            )
            await revertTaskStatus(contentItem.task_id)

            if ((task as any).assignee_id) {
              await createNotification({
                userId: (task as any).assignee_id,
                organizationId: (project as any).organization_id,
                title: 'Publishing failed — token expired',
                body: `The ${contentItem.platform} token has expired and could not be refreshed. Please reconnect.`,
                type: 'task_updated',
                link: `/brands/${(project as any).brand_id}`,
              })
            }

            stats.failed++
            continue
          }

          // Update local reference with refreshed tokens
          conn.access_token = refreshResult.accessToken
          if (refreshResult.pageAccessToken) {
            conn.page_access_token = refreshResult.pageAccessToken
          }
        }

        // Strip HTML from body
        const plainText = contentItem.body
          ? contentItem.body.replace(/<[^>]+>/g, '')
          : ''

        // Build publish request
        const publishRequest: SocialPublishRequest = {
          text: plainText,
          mediaUrls: contentItem.media_urls ?? undefined,
          hashtags: contentItem.hashtags ?? undefined,
          platform: contentItem.platform as any,
        }

        // Dispatch to the appropriate platform publisher
        let result
        switch (contentItem.platform) {
          case 'facebook':
            result = await publishToFacebook(
              conn.platform_page_id,
              conn.page_access_token,
              publishRequest,
            )
            break

          case 'instagram':
            result = await publishToInstagram(
              conn.metadata?.instagram_business_account_id,
              conn.page_access_token,
              publishRequest,
            )
            break

          case 'twitter':
            result = await publishTweet(conn.access_token, publishRequest)
            break

          case 'linkedin':
            result = await publishToLinkedIn(
              conn.platform_page_id,
              conn.access_token,
              publishRequest,
            )
            break

          default:
            console.warn(`[publish-scheduled] Unsupported platform: ${contentItem.platform}`)
            await revertTaskStatus(contentItem.task_id)
            stats.skipped++
            continue
        }

        // Handle publish result
        if (result.success) {
          // Update content item with published info
          await supabaseAdmin
            .from('content_items' as any)
            .update({
              published_at: new Date().toISOString(),
              published_url: result.platformPostUrl ?? null,
              metadata: {
                ...(contentItem.metadata ?? {}),
                platform_post_id: result.platformPostId,
              },
            })
            .eq('id', contentItem.id)

          // Update task status to published
          await supabaseAdmin
            .from('tasks')
            .update({ status: 'published' } as any)
            .eq('id', contentItem.task_id)

          // Insert success log
          await supabaseAdmin.from('publish_log' as any).insert({
            content_item_id: contentItem.id,
            task_id: contentItem.task_id,
            platform: contentItem.platform,
            status: 'success',
            platform_post_id: result.platformPostId ?? null,
            platform_post_url: result.platformPostUrl ?? null,
            published_at: new Date().toISOString(),
          })

          // Notify assignee of successful publish
          if ((task as any).assignee_id) {
            await createNotification({
              userId: (task as any).assignee_id,
              organizationId: (project as any).organization_id,
              title: 'Content published successfully',
              body: `Your ${contentItem.platform} post has been published.`,
              type: 'task_updated',
              link: result.platformPostUrl ?? `/projects/${(project as any).id}`,
            })
          }

          stats.succeeded++
        } else {
          // Publish failed — check retry count
          const { data: previousLogs } = await supabaseAdmin
            .from('publish_log' as any)
            .select('retry_count')
            .eq('content_item_id', contentItem.id)
            .eq('status', 'failed')
            .order('created_at', { ascending: false })
            .limit(1)

          const lastRetryCount = (previousLogs as any)?.[0]?.retry_count ?? 0
          const newRetryCount = lastRetryCount + 1

          if (newRetryCount >= MAX_RETRIES) {
            // Permanent failure — max retries exceeded
            await revertTaskStatus(contentItem.task_id)

            await supabaseAdmin.from('publish_log' as any).insert({
              content_item_id: contentItem.id,
              task_id: contentItem.task_id,
              platform: contentItem.platform,
              status: 'failed',
              error_message: result.error ?? 'Unknown error',
              retry_count: newRetryCount,
              is_permanent_failure: true,
            })

            if ((task as any).assignee_id) {
              await createNotification({
                userId: (task as any).assignee_id,
                organizationId: (project as any).organization_id,
                title: 'Publishing permanently failed',
                body: `Failed to publish to ${contentItem.platform} after ${MAX_RETRIES} attempts: ${result.error ?? 'Unknown error'}`,
                type: 'task_updated',
                link: `/projects/${(project as any).id}`,
              })
            }
          } else {
            // Recoverable failure — revert for retry
            await revertTaskStatus(contentItem.task_id)

            await supabaseAdmin.from('publish_log' as any).insert({
              content_item_id: contentItem.id,
              task_id: contentItem.task_id,
              platform: contentItem.platform,
              status: 'failed',
              error_message: result.error ?? 'Unknown error',
              retry_count: newRetryCount,
              is_permanent_failure: false,
            })

            if ((task as any).assignee_id) {
              await createNotification({
                userId: (task as any).assignee_id,
                organizationId: (project as any).organization_id,
                title: 'Publishing failed — will retry',
                body: `Failed to publish to ${contentItem.platform} (attempt ${newRetryCount}/${MAX_RETRIES}): ${result.error ?? 'Unknown error'}`,
                type: 'task_updated',
                link: `/projects/${(project as any).id}`,
              })
            }
          }

          stats.failed++
        }
      } catch (error) {
        console.error('[publish-scheduled] Error processing content item:', item.id, error)
        // Revert task status on unexpected errors
        await revertTaskStatus((item as any).task_id).catch(() => {})
        stats.failed++
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[publish-scheduled] Cron failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Revert a task from 'publishing' back to 'scheduled' */
async function revertTaskStatus(taskId: string) {
  await supabaseAdmin
    .from('tasks')
    .update({ status: 'scheduled' } as any)
    .eq('id', taskId)
    .eq('status', 'publishing' as any)
}

/** Create an in-app notification via direct insert */
async function createNotification(params: {
  userId: string
  organizationId: string
  title: string
  body: string
  type: string
  link?: string
}) {
  await supabaseAdmin.from('notifications').insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    title: params.title,
    body: params.body,
    type: params.type,
    link: params.link ?? null,
    is_read: false,
  } as any)
}
