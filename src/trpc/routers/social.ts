import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { publishToFacebook, publishToInstagram } from '@/lib/social/meta'
import { publishTweet } from '@/lib/social/twitter'
import { publishToLinkedIn } from '@/lib/social/linkedin'
import { isTokenExpired, refreshConnectionToken } from '@/lib/social/oauth'
import type { SocialPublishRequest, SocialPublishResult } from '@/lib/social/types'

// ---------------------------------------------------------------------------
// Helper: strip sensitive token fields from a social connection row
// ---------------------------------------------------------------------------

function stripTokens<T extends Record<string, unknown>>(connection: T) {
  const {
    access_token: _accessToken,
    refresh_token: _refreshToken,
    page_access_token: _pageAccessToken,
    ...safe
  } = connection
  return safe
}

// ---------------------------------------------------------------------------
// Helper: strip HTML tags (content items store rich-text from Tiptap)
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

// ---------------------------------------------------------------------------
// Helper: core publish logic (shared by publishNow and retryPublish)
// ---------------------------------------------------------------------------

async function executePublish(
  contentItemId: string,
  supabase: any,
  orgId: string,
): Promise<SocialPublishResult & { contentItemId: string }> {
  // a. Fetch the content item (RLS-scoped)
  const { data: contentItem, error: ciError } = await supabase
    .from('content_items' as any)
    .select('*')
    .eq('id', contentItemId)
    .single()

  if (ciError || !contentItem) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Content item not found',
    })
  }

  // b. Chain: task -> project -> brand_id
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, project_id, status')
    .eq('id', contentItem.task_id)
    .single()

  if (taskError || !task) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Associated task not found',
    })
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, brand_id')
    .eq('id', task.project_id)
    .single()

  if (projectError || !project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Associated project not found',
    })
  }

  // c. Find social connection for brand + platform (service role to bypass RLS)
  const { data: connection, error: connError } = await supabaseAdmin
    .from('social_connections' as any)
    .select('*')
    .eq('brand_id', project.brand_id)
    .eq('platform', contentItem.platform)
    .eq('organization_id', orgId)
    .maybeSingle()

  // d. No connection found
  if (connError || !connection) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No ${contentItem.platform} connection found for this brand. Please connect the account first.`,
    })
  }

  // e. Connection is inactive
  if (connection.is_active === false) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `The ${contentItem.platform} connection is inactive. Please reconnect the account.`,
    })
  }

  // f. Check token expiry
  let activeToken = connection.access_token as string
  let activePageToken = (connection.page_access_token as string) ?? null

  if (isTokenExpired(connection.token_expires_at as string | null)) {
    // g. Try to refresh
    const refreshed = await refreshConnectionToken(connection as any)

    // h. Refresh failed
    if (!refreshed) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Failed to refresh ${contentItem.platform} token. Please reconnect the account.`,
      })
    }

    activeToken = refreshed.accessToken
    if (refreshed.pageAccessToken) {
      activePageToken = refreshed.pageAccessToken
    }
  }

  // i. Build publish request
  const plainText = stripHtml(contentItem.body ?? '')
  const publishRequest: SocialPublishRequest = {
    text: plainText,
    mediaUrls: contentItem.media_urls ?? undefined,
    hashtags: contentItem.hashtags ?? undefined,
    platform: contentItem.platform,
  }

  // j. Call the platform-specific publisher
  let result: SocialPublishResult

  try {
    const platform = contentItem.platform as string
    const metadata = (connection.metadata ?? {}) as Record<string, any>

    switch (platform) {
      case 'facebook':
        result = await publishToFacebook(
          connection.platform_page_id as string,
          activePageToken ?? activeToken,
          publishRequest,
        )
        break

      case 'instagram':
        result = await publishToInstagram(
          metadata.instagram_business_account_id as string,
          activePageToken ?? activeToken,
          publishRequest,
        )
        break

      case 'twitter':
        result = await publishTweet(activeToken, publishRequest)
        break

      case 'linkedin':
        result = await publishToLinkedIn(
          connection.platform_page_id as string,
          activeToken,
          publishRequest,
        )
        break

      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  } catch (publishErr) {
    // o. On failure: log and re-throw
    await supabaseAdmin
      .from('publish_log' as any)
      .insert({
        content_item_id: contentItemId,
        platform: contentItem.platform,
        status: 'failed',
        error_message: publishErr instanceof Error ? publishErr.message : 'Unknown publish error',
        attempted_at: new Date().toISOString(),
      })

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to publish to ${contentItem.platform}: ${publishErr instanceof Error ? publishErr.message : 'Unknown error'}`,
    })
  }

  // Check if the platform publisher returned a failure result (non-throwing)
  if (!result.success) {
    await supabaseAdmin
      .from('publish_log' as any)
      .insert({
        content_item_id: contentItemId,
        platform: contentItem.platform,
        status: 'failed',
        error_message: result.error ?? 'Unknown publish error',
        attempted_at: new Date().toISOString(),
      })

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Failed to publish to ${contentItem.platform}: ${result.error}`,
    })
  }

  // k. On success: update content_item
  const existingMetadata = (contentItem.metadata ?? {}) as Record<string, any>
  await supabase
    .from('content_items' as any)
    .update({
      published_at: new Date().toISOString(),
      published_url: result.platformPostUrl ?? null,
      metadata: {
        ...existingMetadata,
        platform_post_id: result.platformPostId,
      },
    })
    .eq('id', contentItemId)

  // l. Check if all content items for this task are published, then update task
  const { data: siblings } = await supabase
    .from('content_items' as any)
    .select('id, published_at')
    .eq('task_id', contentItem.task_id)

  const allPublished = siblings?.every(
    (item: any) => item.published_at !== null || item.id === contentItemId,
  )

  if (allPublished) {
    await supabase
      .from('tasks')
      .update({ status: 'published' })
      .eq('id', contentItem.task_id)
  }

  // m. Insert publish_log with success
  await supabaseAdmin
    .from('publish_log' as any)
    .insert({
      content_item_id: contentItemId,
      platform: contentItem.platform,
      status: 'success',
      platform_post_id: result.platformPostId ?? null,
      platform_post_url: result.platformPostUrl ?? null,
      attempted_at: new Date().toISOString(),
    })

  // n. Return the publish result
  return {
    ...result,
    contentItemId,
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const socialRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // 1. getConnections — list social connections for a specific brand
  // -------------------------------------------------------------------------
  getConnections: orgProcedure
    .input(z.object({ brandId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('social_connections' as any)
        .select('*')
        .eq('brand_id', input.brandId)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch social connections: ${error.message}`,
        })
      }

      return (data ?? []).map((conn: any) => stripTokens(conn))
    }),

  // -------------------------------------------------------------------------
  // 2. getConnectionsByOrg — list all social connections for the organization
  // -------------------------------------------------------------------------
  getConnectionsByOrg: orgProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('social_connections' as any)
      .select('*')
      .eq('organization_id', ctx.orgId)

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch social connections: ${error.message}`,
      })
    }

    const connections = (data ?? []) as any[]

    // Fetch brand names for each unique brand_id
    const brandIds = [...new Set(connections.map((c) => c.brand_id).filter(Boolean))]
    let brandMap: Record<string, string> = {}

    if (brandIds.length > 0) {
      const { data: brands } = await ctx.supabase
        .from('brands')
        .select('id, name')
        .in('id', brandIds)

      if (brands) {
        brandMap = Object.fromEntries(brands.map((b: any) => [b.id, b.name]))
      }
    }

    return connections.map((conn) => ({
      ...stripTokens(conn),
      brand_name: brandMap[conn.brand_id] ?? null,
    }))
  }),

  // -------------------------------------------------------------------------
  // 3. disconnect — remove a social connection (admin only)
  // -------------------------------------------------------------------------
  disconnect: adminProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('social_connections' as any)
        .delete()
        .eq('id', input.connectionId)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to disconnect social account: ${error.message}`,
        })
      }

      return { success: true }
    }),

  // -------------------------------------------------------------------------
  // 4. publishNow — publish a content item to its target platform
  // -------------------------------------------------------------------------
  publishNow: orgProcedure
    .input(z.object({ contentItemId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return executePublish(input.contentItemId, ctx.supabase, ctx.orgId)
    }),

  // -------------------------------------------------------------------------
  // 5. getPublishLog — fetch publish history for a content item
  // -------------------------------------------------------------------------
  getPublishLog: orgProcedure
    .input(z.object({ contentItemId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('publish_log' as any)
        .select('*')
        .eq('content_item_id', input.contentItemId)
        .order('attempted_at', { ascending: false })

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch publish log: ${error.message}`,
        })
      }

      return data ?? []
    }),

  // -------------------------------------------------------------------------
  // 6. retryPublish — retry a failed publish attempt
  // -------------------------------------------------------------------------
  retryPublish: orgProcedure
    .input(z.object({ publishLogId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the publish log entry to get the content_item_id
      const { data: logEntry, error: logError } = await ctx.supabase
        .from('publish_log' as any)
        .select('*')
        .eq('id', input.publishLogId)
        .single()

      if (logError || !logEntry) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Publish log entry not found',
        })
      }

      // Re-execute the publish logic
      const result = await executePublish(
        (logEntry as any).content_item_id,
        ctx.supabase,
        ctx.orgId,
      )

      // Update the retry count on the original log entry
      const currentRetryCount = ((logEntry as any).retry_count as number) ?? 0
      await supabaseAdmin
        .from('publish_log' as any)
        .update({ retry_count: currentRetryCount + 1 })
        .eq('id', input.publishLogId)

      return result
    }),

  // -------------------------------------------------------------------------
  // 7. checkConnection — verify if a connection's token is still valid
  // -------------------------------------------------------------------------
  checkConnection: orgProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: connection, error } = await supabaseAdmin
        .from('social_connections' as any)
        .select('*')
        .eq('id', input.connectionId)
        .eq('organization_id', ctx.orgId)
        .single()

      if (error || !connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Social connection not found',
        })
      }

      const tokenExpiresAt = (connection as any).token_expires_at as string | null
      const expired = isTokenExpired(tokenExpiresAt)

      if (expired) {
        // Try to refresh the token
        const refreshed = await refreshConnectionToken(connection as any)

        if (!refreshed) {
          return {
            isValid: false,
            expiresAt: tokenExpiresAt ?? null,
          }
        }

        // Token was refreshed — compute new expiry
        const newExpiresAt = refreshed.expiresIn
          ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
          : null

        return {
          isValid: true,
          expiresAt: newExpiresAt,
        }
      }

      return {
        isValid: true,
        expiresAt: tokenExpiresAt ?? null,
      }
    }),
})
