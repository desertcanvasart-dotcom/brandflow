'use client'

import { Loader2, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/trpc/client'
import { useThreadMessages } from '@/hooks/use-thread-messages'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'

interface ThreadPanelProps {
  parentMessageId: string
  channelId: string
  currentUserId: string
  open: boolean
  onClose: () => void
}

export function ThreadPanel({
  parentMessageId,
  channelId,
  currentUserId,
  open,
  onClose,
}: ThreadPanelProps) {
  // Subscribe to realtime thread changes
  useThreadMessages(open ? parentMessageId : undefined)

  const { data, isLoading } = trpc.chat.getThreadReplies.useQuery(
    { parentMessageId },
    { enabled: open }
  )

  // Batch-fetch reactions for parent + replies
  const allMessageIds = data
    ? [data.parentMessage.id, ...data.replies.map((r) => r.id)]
    : []
  const { data: reactionsMap } = trpc.chat.getReactions.useQuery(
    { messageIds: allMessageIds },
    { enabled: allMessageIds.length > 0 }
  )

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[400px] p-0 flex flex-col">
        <SheetHeader className="border-b px-4 py-3 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-sm font-semibold">Thread</SheetTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Message not found
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="flex flex-col py-2">
                {/* Parent message */}
                <div className="border-b pb-2">
                  <MessageBubble
                    message={data.parentMessage}
                    isOwn={data.parentMessage.user_id === currentUserId}
                    projectId={null}
                    channelId={channelId}
                    currentUserId={currentUserId}
                    reactions={reactionsMap?.[data.parentMessage.id]}
                  />
                </div>

                {/* Reply count divider */}
                <div className="flex items-center px-4 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="px-3 text-xs text-muted-foreground">
                    {data.replies.length} {data.replies.length === 1 ? 'reply' : 'replies'}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Reply messages */}
                {data.replies.map((reply) => (
                  <MessageBubble
                    key={reply.id}
                    message={reply}
                    isOwn={reply.user_id === currentUserId}
                    projectId={null}
                    channelId={channelId}
                    currentUserId={currentUserId}
                    reactions={reactionsMap?.[reply.id]}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Thread reply input */}
            <ChatInput
              channelId={channelId}
              parentMessageId={parentMessageId}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
