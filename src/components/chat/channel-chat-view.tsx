'use client'

import { useEffect, useState } from 'react'
import { Hash, Megaphone, MessageCircle, Lock } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useChannelMessages } from '@/hooks/use-channel-messages'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ThreadPanel } from './thread-panel'
import { PinnedMessagesBanner } from './pinned-messages-banner'
import { PinnedMessagesSheet } from './pinned-messages-sheet'

interface ChannelChatViewProps {
  channelId: string
  channelType: string
  channelName: string
  currentUserId: string
  isReadOnly?: boolean
  onOpenThread?: (messageId: string) => void
}

export function ChannelChatView({
  channelId,
  channelType,
  channelName,
  currentUserId,
  isReadOnly = false,
}: ChannelChatViewProps) {
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [pinnedSheetOpen, setPinnedSheetOpen] = useState(false)

  // Subscribe to realtime messages
  useChannelMessages(channelId)

  // Mark as read when viewing
  const markAsRead = trpc.chat.markAsRead.useMutation()

  useEffect(() => {
    markAsRead.mutate({ channelId })

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        markAsRead.mutate({ channelId })
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  const typeIcon = channelType === 'general'
    ? Hash
    : channelType === 'announcement'
      ? Megaphone
      : MessageCircle

  const TypeIcon = typeIcon

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <TypeIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{channelName}</h3>
        {channelType === 'announcement' && (
          <span className="text-xs text-muted-foreground">Announcements</span>
        )}
        {channelType === 'general' && (
          <span className="text-xs text-muted-foreground">Everyone</span>
        )}
      </div>

      {/* Pinned messages banner */}
      <PinnedMessagesBanner
        channelId={channelId}
        onViewPinned={() => setPinnedSheetOpen(true)}
      />

      {/* Messages */}
      <MessageList
        channelId={channelId}
        currentUserId={currentUserId}
        projectId={null}
        onOpenThread={setActiveThread}
      />

      {/* Input or read-only bar */}
      {isReadOnly ? (
        <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Only admins can post in this channel</span>
        </div>
      ) : (
        <ChatInput channelId={channelId} />
      )}

      {/* Thread panel */}
      {activeThread && (
        <ThreadPanel
          parentMessageId={activeThread}
          channelId={channelId}
          currentUserId={currentUserId}
          open={!!activeThread}
          onClose={() => setActiveThread(null)}
        />
      )}

      {/* Pinned messages sheet */}
      <PinnedMessagesSheet
        open={pinnedSheetOpen}
        onClose={() => setPinnedSheetOpen(false)}
        channelId={channelId}
      />
    </div>
  )
}
