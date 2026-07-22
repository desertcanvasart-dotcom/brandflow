'use client'

import { Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trpc } from '@/trpc/client'

interface PinnedMessagesBannerProps {
  channelId: string
  onViewPinned: () => void
}

export function PinnedMessagesBanner({
  channelId,
  onViewPinned,
}: PinnedMessagesBannerProps) {
  const { data: pinnedMessages } = trpc.chat.getPinnedMessages.useQuery(
    { channelId },
    { enabled: !!channelId }
  )

  const count = pinnedMessages?.length ?? 0
  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-1.5">
      <Pin className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {count} pinned {count === 1 ? 'message' : 'messages'}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-6 text-xs"
        onClick={onViewPinned}
      >
        View
      </Button>
    </div>
  )
}
