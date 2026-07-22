'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/trpc/client'
import { MessageBubble } from './message-bubble'
import { SystemMessage } from './system-message'
import { AIResponseMessage } from './ai-response-message'
import { CreateTaskDialog } from './create-task-dialog'
import type { MessageWithUser } from '@/trpc/routers/chat'

interface MessageListProps {
  channelId: string
  currentUserId: string
  projectId: string | null
  onOpenThread?: (messageId: string) => void
}

export function MessageList({ channelId, currentUserId, projectId, onOpenThread }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevMessageCountRef = useRef(0)

  // Create Task dialog state
  const [createTaskMessage, setCreateTaskMessage] = useState<MessageWithUser | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.chat.getMessages.useInfiniteQuery(
    { channelId, limit: 50 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchOnWindowFocus: false,
    }
  )

  const allMessages: MessageWithUser[] =
    data?.pages.flatMap((page) => page.messages) ?? []

  // Batch-fetch reactions for all visible messages
  const messageIds = allMessages.map((m) => m.id)
  const { data: reactionsMap } = trpc.chat.getReactions.useQuery(
    { messageIds },
    { enabled: messageIds.length > 0 }
  )

  // Fetch decisions for project channels
  const { data: decisions } = trpc.chat.getProjectDecisions.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  )
  const decisionMessageIds = new Set(
    (decisions ?? []).map((d: { message_id: string }) => d.message_id)
  )

  // Fetch pinned messages
  const { data: pinnedMessages } = trpc.chat.getPinnedMessages.useQuery(
    { channelId },
    { enabled: !!channelId }
  )
  const pinnedMessageIds = new Set(
    (pinnedMessages ?? []).map((m: { id: string }) => m.id)
  )

  // Auto-scroll to bottom on mount and when new messages arrive (if user is at bottom)
  useEffect(() => {
    const newCount = allMessages.length
    if (newCount > prevMessageCountRef.current) {
      if (isAtBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    prevMessageCountRef.current = newCount
  }, [allMessages.length])

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && allMessages.length > 0) {
      bottomRef.current?.scrollIntoView()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // Track if user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const threshold = 100
    isAtBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // IntersectionObserver for infinite scroll upward
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (allMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No messages yet. Start the conversation!
        </p>
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex flex-col py-4"
        >
          {/* Sentinel for loading older messages */}
          <div ref={sentinelRef} className="h-1" />

          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Date separators and messages */}
          {allMessages.map((msg, index) => {
            const isSystem = msg.user_id === null
            const isOwn = msg.user_id === currentUserId

            // Check if this is an AI response
            const isAiResponse = (() => {
              if (!isSystem) return false
              try {
                const att = typeof msg.attachments === 'string'
                  ? JSON.parse(msg.attachments)
                  : msg.attachments
                return Array.isArray(att) && att[0]?.type === 'ai_response'
              } catch {
                return false
              }
            })()

            // Show date separator if date changes
            const prevMsg = index > 0 ? allMessages[index - 1] : null
            const currDate = new Date(msg.created_at).toLocaleDateString()
            const prevDate = prevMsg
              ? new Date(prevMsg.created_at).toLocaleDateString()
              : null
            const showDate = currDate !== prevDate

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center py-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="px-3 text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}

                {isAiResponse ? (
                  <AIResponseMessage message={msg} />
                ) : isSystem ? (
                  <SystemMessage message={msg} />
                ) : (
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    projectId={projectId}
                    channelId={channelId}
                    currentUserId={currentUserId}
                    reactions={reactionsMap?.[msg.id]}
                    onOpenThread={onOpenThread}
                    onCreateTask={(m) => setCreateTaskMessage(m)}
                    isDecision={decisionMessageIds.has(msg.id)}
                    isPinned={pinnedMessageIds.has(msg.id)}
                  />
                )}
              </div>
            )
          })}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Create Task Dialog */}
      {projectId && (
        <CreateTaskDialog
          open={!!createTaskMessage}
          onOpenChange={(open) => !open && setCreateTaskMessage(null)}
          message={createTaskMessage}
          projectId={projectId}
          channelId={channelId}
        />
      )}
    </>
  )
}
