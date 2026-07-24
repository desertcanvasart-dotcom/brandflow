import { z } from 'zod/v4'
import { createTRPCRouter, orgProcedure } from '../init'
import { searchSimilar } from '@/lib/ai/embedding-service'

export const searchRouter = createTRPCRouter({
  semantic: orgProcedure
    .input(z.object({
      query: z.string().min(1),
      sourceType: z.enum(['brand_guidelines', 'meeting_transcript', 'content_item', 'brief', 'comment', 'document']).optional(),
      limit: z.number().min(1).max(20).optional(),
      brandId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return searchSimilar({
        orgId: ctx.orgId,
        query: input.query,
        sourceType: input.sourceType,
        limit: input.limit ?? 10,
        brandId: input.brandId,
      })
    }),
})
