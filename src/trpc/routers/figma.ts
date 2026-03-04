import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure } from '../init'
import {
  getMe,
  getTeamProjects,
  getProjectFiles,
  getFile,
  exportImages,
} from '@/lib/figma/client'
import { createPresignedUploadUrl } from '@/lib/r2/presign'
import type { Database } from '@/types/database'

type FigmaConnectionRow = Database['public']['Tables']['figma_connections']['Row']
type DeliverableRow = Database['public']['Tables']['deliverables']['Row']

// ---------------------------------------------------------------------------
// Helper: fetch the user's Figma connection (with access_token)
// ---------------------------------------------------------------------------

async function getConnectionWithToken(supabase: any, userId: string, orgId: string) {
  const { data } = await supabase
    .from('figma_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle()
  return data as FigmaConnectionRow | null
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const figmaRouter = createTRPCRouter({
  // -------------------------------------------------------------------------
  // 1. getConnection — return connection info without tokens
  // -------------------------------------------------------------------------
  getConnection: orgProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from('figma_connections')
      .select('*')
      .eq('user_id', ctx.user.id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()

    if (!data) return null

    const connection = data as FigmaConnectionRow
    // Strip sensitive token fields before returning
    const {
      access_token: _accessToken,
      refresh_token: _refreshToken,
      ...strippedConnection
    } = connection

    return strippedConnection
  }),

  // -------------------------------------------------------------------------
  // 2. disconnect — remove the user's Figma connection
  // -------------------------------------------------------------------------
  disconnect: orgProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase
      .from('figma_connections')
      .delete()
      .eq('user_id', ctx.user.id)
      .eq('organization_id', ctx.orgId)

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to disconnect Figma: ${error.message}`,
      })
    }

    return { success: true }
  }),

  // -------------------------------------------------------------------------
  // 3. listTeams — return stored team IDs from connection
  // -------------------------------------------------------------------------
  listTeams: orgProcedure.query(async ({ ctx }) => {
    const connection = await getConnectionWithToken(ctx.supabase, ctx.user.id, ctx.orgId)

    if (!connection) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No Figma connection found. Please connect your Figma account first.',
      })
    }

    return { teamIds: connection.figma_team_ids }
  }),

  // -------------------------------------------------------------------------
  // 4. listProjects — list projects within a Figma team
  // -------------------------------------------------------------------------
  listProjects: orgProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await getConnectionWithToken(ctx.supabase, ctx.user.id, ctx.orgId)

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Figma connection found. Please connect your Figma account first.',
        })
      }

      try {
        const projects = await getTeamProjects(input.teamId, connection.access_token)
        return projects
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch Figma projects: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }),

  // -------------------------------------------------------------------------
  // 5. listFiles — list files within a Figma project
  // -------------------------------------------------------------------------
  listFiles: orgProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await getConnectionWithToken(ctx.supabase, ctx.user.id, ctx.orgId)

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Figma connection found. Please connect your Figma account first.',
        })
      }

      try {
        const files = await getProjectFiles(Number(input.projectId), connection.access_token)
        return files
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch Figma files: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }),

  // -------------------------------------------------------------------------
  // 6. getFile — get file detail with top-level pages
  // -------------------------------------------------------------------------
  getFile: orgProcedure
    .input(z.object({ fileKey: z.string() }))
    .query(async ({ ctx, input }) => {
      const connection = await getConnectionWithToken(ctx.supabase, ctx.user.id, ctx.orgId)

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Figma connection found. Please connect your Figma account first.',
        })
      }

      try {
        const file = await getFile(input.fileKey, connection.access_token)
        return {
          name: file.name,
          lastModified: file.lastModified,
          thumbnailUrl: file.thumbnailUrl,
          pages: file.document.children.map((child) => ({
            id: child.id,
            name: child.name,
            type: child.type,
          })),
        }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch Figma file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }
    }),

  // -------------------------------------------------------------------------
  // 7. importAsDeliverable — export a Figma node as image and create deliverable
  // -------------------------------------------------------------------------
  importAsDeliverable: orgProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        fileKey: z.string(),
        nodeId: z.string().optional(),
        fileName: z.string(),
        figmaUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const connection = await getConnectionWithToken(ctx.supabase, ctx.user.id, ctx.orgId)

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Figma connection found. Please connect your Figma account first.',
        })
      }

      let publicUrl: string | null = null

      try {
        // Export an image from Figma
        const images = await exportImages(
          input.fileKey,
          [input.nodeId ?? '0:1'],
          connection.access_token,
          'png'
        )

        // Get the first image URL from the result
        const imageUrl = Object.values(images)[0]

        if (imageUrl) {
          // Upload to R2
          const { uploadUrl, publicUrl: r2PublicUrl } = await createPresignedUploadUrl(
            'figma-import.png',
            'image/png',
            'figma'
          )
          const imageResponse = await fetch(imageUrl)
          const imageBlob = await imageResponse.blob()
          await fetch(uploadUrl, {
            method: 'PUT',
            body: imageBlob,
            headers: { 'Content-Type': 'image/png' },
          })
          publicUrl = r2PublicUrl
        }
      } catch (err) {
        // Log but don't fail — deliverable is still created without thumbnail
        console.error(
          'Failed to export/upload Figma image:',
          err instanceof Error ? err.message : err
        )
      }

      // Create the deliverable record
      const { data, error } = await ctx.supabase
        .from('deliverables')
        .insert({
          task_id: input.taskId,
          type: 'mockup',
          file_url: publicUrl ?? null,
          file_name: input.fileName,
          metadata: {
            figma_file_key: input.fileKey,
            figma_node_id: input.nodeId ?? null,
            figma_file_name: input.fileName,
            figma_url: input.figmaUrl,
            figma_thumbnail_url: publicUrl ?? null,
            figma_last_modified: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create deliverable: ${error.message}`,
        })
      }

      return data
    }),

  // -------------------------------------------------------------------------
  // 8. refreshThumbnail — re-export a Figma node and update the deliverable
  // -------------------------------------------------------------------------
  refreshThumbnail: orgProcedure
    .input(z.object({ deliverableId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch the existing deliverable
      const { data: deliverable } = await ctx.supabase
        .from('deliverables')
        .select('*')
        .eq('id', input.deliverableId)
        .single<DeliverableRow>()

      if (!deliverable) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deliverable not found',
        })
      }

      const metadata = deliverable.metadata as Record<string, unknown> | null

      if (!metadata?.figma_file_key) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deliverable has no linked Figma file',
        })
      }

      const fileKey = metadata.figma_file_key as string
      const nodeId = (metadata.figma_node_id as string) ?? '0:1'

      // Get connection for the access token
      const connection = await getConnectionWithToken(ctx.supabase, ctx.user.id, ctx.orgId)

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No Figma connection found. Please connect your Figma account first.',
        })
      }

      let publicUrl: string | null = null

      try {
        // Re-export image from Figma
        const images = await exportImages(fileKey, [nodeId], connection.access_token, 'png')
        const imageUrl = Object.values(images)[0]

        if (imageUrl) {
          const { uploadUrl, publicUrl: r2PublicUrl } = await createPresignedUploadUrl(
            'figma-import.png',
            'image/png',
            'figma'
          )
          const imageResponse = await fetch(imageUrl)
          const imageBlob = await imageResponse.blob()
          await fetch(uploadUrl, {
            method: 'PUT',
            body: imageBlob,
            headers: { 'Content-Type': 'image/png' },
          })
          publicUrl = r2PublicUrl
        }
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to refresh Figma thumbnail: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
      }

      // Merge updated metadata with existing
      const updatedMetadata: Record<string, unknown> = {
        ...metadata,
        figma_thumbnail_url: publicUrl ?? (metadata.figma_thumbnail_url as string | null),
        figma_last_modified: new Date().toISOString(),
      }

      const { data: updated, error } = await ctx.supabase
        .from('deliverables')
        .update({
          file_url: publicUrl ?? deliverable.file_url,
          metadata: updatedMetadata as Database['public']['Tables']['deliverables']['Update']['metadata'],
        })
        .eq('id', input.deliverableId)
        .select()
        .single<DeliverableRow>()

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update deliverable: ${error.message}`,
        })
      }

      return updated
    }),

  // -------------------------------------------------------------------------
  // 9. updateTeamIds — update the stored Figma team IDs for the user
  // -------------------------------------------------------------------------
  updateTeamIds: orgProcedure
    .input(z.object({ teamIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('figma_connections')
        .update({ figma_team_ids: input.teamIds })
        .eq('user_id', ctx.user.id)
        .eq('organization_id', ctx.orgId)

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to update team IDs: ${error.message}`,
        })
      }

      return { success: true }
    }),
})
