'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trpc } from '@/trpc/client'

/**
 * Subscribe to realtime changes for thread replies.
 * Invalidates the thread replies query + main messages (for reply_count updates).
 */
export function useThreadMessages(parentMessageId: string | undefined) {
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!parentMessageId) return

    const supabase = createClient()

    const threadChannel = supabase
      .channel(`thread-messages:${parentMessageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_messages',
        },
        () => {
          utils.chat.getThreadReplies.invalidate({ parentMessageId })
          // Also invalidate main messages list for reply_count update
          utils.chat.getMessages.invalidate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(threadChannel)
    }
  }, [parentMessageId, utils])
}
