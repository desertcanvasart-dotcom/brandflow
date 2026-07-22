'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { trpc } from '@/trpc/client'
import { cn } from '@/lib/utils'

// Curated grid of 30 common emojis — no external library needed
const EMOJI_GRID = [
  '👍', '👎', '❤️', '😂', '😍', '🎉',
  '🔥', '👀', '🙌', '💯', '✅', '❌',
  '👏', '🤔', '😊', '😢', '😮', '🚀',
  '💪', '🙏', '👋', '💡', '⭐', '🎯',
  '📌', '✨', '💬', '🤝', '⚡', '🏆',
]

export interface ReactionData {
  count: number
  userIds: string[]
  hasReacted: boolean
}

interface EmojiReactionsProps {
  messageId: string
  reactions: Record<string, ReactionData> | undefined
}

export function EmojiReactions({ messageId, reactions }: EmojiReactionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const utils = trpc.useUtils()

  const toggleMutation = trpc.chat.toggleReaction.useMutation({
    onSuccess: () => {
      utils.chat.getReactions.invalidate()
    },
  })

  const handleReact = (emoji: string) => {
    toggleMutation.mutate({ messageId, emoji })
    setPickerOpen(false)
  }

  const reactionEntries = reactions ? Object.entries(reactions) : []

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Existing reaction chips */}
      {reactionEntries.map(([emoji, data]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleReact(emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors hover:bg-accent',
            data.hasReacted
              ? 'border-primary/50 bg-primary/10 text-primary'
              : 'border-border bg-muted/50'
          )}
          disabled={toggleMutation.isPending}
        >
          <span>{emoji}</span>
          <span className="font-medium">{data.count}</span>
        </button>
      ))}

      {/* Add reaction button (emoji picker trigger) */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <Smile className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2" side="top">
          <div className="grid grid-cols-6 gap-1">
            {EMOJI_GRID.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-accent transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
