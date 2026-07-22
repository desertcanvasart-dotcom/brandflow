'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trpc } from '@/trpc/client'

/**
 * Subscribe to realtime changes on channel_messages and message_reactions
 * for a specific channel. Invalidates the relevant TanStack Query caches.
 */
export function useChannelMessages(channelId: string | undefined) {
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!channelId) return

    const supabase = createClient()

    // Subscribe to message changes (insert/update/delete)
    const messagesChannel = supabase
      .channel(`channel-messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          utils.chat.getMessages.invalidate({ channelId })
          utils.chat.getUnreadCount.invalidate({ channelId })
          utils.chat.getTotalUnreadCount.invalidate()
          utils.chat.getMyConversations.invalidate()
          utils.chat.getMessagesUnreadCount.invalidate()
        }
      )
      .subscribe()

    // Subscribe to reaction changes (broad — table lacks channel_id column)
    const reactionsChannel = supabase
      .channel(`channel-reactions:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        () => {
          utils.chat.getReactions.invalidate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesChannel)
      supabase.removeChannel(reactionsChannel)
    }
  }, [channelId, utils])
}
