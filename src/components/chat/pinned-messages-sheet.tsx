'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pin, PinOff } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import type { MessageWithUser } from '@/trpc/routers/chat'

interface PinnedMessagesSheetProps {
  open: boolean
  onClose: () => void
  channelId: string
}

export function PinnedMessagesSheet({
  open,
  onClose,
  channelId,
}: PinnedMessagesSheetProps) {
  const utils = trpc.useUtils()

  const { data: pinnedMessages, isLoading } = trpc.chat.getPinnedMessages.useQuery(
    { channelId },
    { enabled: open && !!channelId }
  )

  const unpinMutation = trpc.chat.unpinMessage.useMutation({
    onSuccess: () => {
      toast.success('Message unpinned')
      utils.chat.getPinnedMessages.invalidate({ channelId })
      utils.chat.getChannelStats.invalidate()
    },
  })

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Pinned Messages
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : !pinnedMessages || pinnedMessages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pinned messages
            </p>
          ) : (
            <div className="space-y-3 pr-4">
              {(pinnedMessages as MessageWithUser[]).map((msg) => {
                const initials = msg.user?.display_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) ?? '?'

                const time = new Date(msg.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                // Strip mention markup
                const content = msg.content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')

                return (
                  <div
                    key={msg.id}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        {msg.user?.avatar_url && (
                          <AvatarImage src={msg.user.avatar_url} alt={msg.user.display_name} />
                        )}
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold">
                        {msg.user?.display_name ?? 'Unknown'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0"
                        onClick={() =>
                          unpinMutation.mutate({
                            channelId,
                            messageId: msg.id,
                          })
                        }
                        disabled={unpinMutation.isPending}
                      >
                        <PinOff className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {content}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
