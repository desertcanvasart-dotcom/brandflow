'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { createClient } from '@/lib/supabase/client'
import { useChannelMessages } from '@/hooks/use-channel-messages'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import { ThreadPanel } from './thread-panel'
import { EnhancedChatHeader } from './enhanced-chat-header'
import { PinnedMessagesBanner } from './pinned-messages-banner'
import { PinnedMessagesSheet } from './pinned-messages-sheet'

interface ChatPanelProps {
  projectId: string
}

export function ChatPanel({ projectId }: ChatPanelProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [pinnedSheetOpen, setPinnedSheetOpen] = useState(false)

  // Get current user ID
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  // Fetch channel for this project
  const { data, isLoading } = trpc.chat.getChannelByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  )

  const channel = data?.channel
  const channelId = channel?.id

  // Subscribe to realtime messages
  useChannelMessages(channelId)

  // Mark as read when viewing
  const markAsRead = trpc.chat.markAsRead.useMutation()

  useEffect(() => {
    if (!channelId) return

    // Mark as read immediately
    markAsRead.mutate({ channelId })

    // Also mark as read when tab becomes visible
    function handleVisibility() {
      if (document.visibilityState === 'visible' && channelId) {
        markAsRead.mutate({ channelId })
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  if (isLoading || currentUserId === null) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg border">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border text-muted-foreground">
        <MessageCircle className="h-10 w-10 mb-3" />
        <p className="text-sm">No chat channel found for this project.</p>
        <p className="text-xs mt-1">A channel is created automatically when a project is set up.</p>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border bg-background">
      {/* Enhanced Header */}
      <EnhancedChatHeader
        channelId={channel.id}
        channelName={channel.name}
        projectId={projectId}
        onViewPinned={() => setPinnedSheetOpen(true)}
      />

      {/* Pinned messages banner */}
      <PinnedMessagesBanner
        channelId={channel.id}
        onViewPinned={() => setPinnedSheetOpen(true)}
      />

      {/* Messages */}
      <MessageList
        channelId={channel.id}
        currentUserId={currentUserId}
        projectId={channel.project_id}
        onOpenThread={setActiveThread}
      />

      {/* Input */}
      <ChatInput channelId={channel.id} projectId={projectId} />

      {/* Thread panel */}
      {activeThread && (
        <ThreadPanel
          parentMessageId={activeThread}
          channelId={channel.id}
          currentUserId={currentUserId}
          open={!!activeThread}
          onClose={() => setActiveThread(null)}
        />
      )}

      {/* Pinned messages sheet */}
      <PinnedMessagesSheet
        open={pinnedSheetOpen}
        onClose={() => setPinnedSheetOpen(false)}
        channelId={channel.id}
      />
    </div>
  )
}
