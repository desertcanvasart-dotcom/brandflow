'use client'

import { Hash, Megaphone, PenSquare } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ConversationItem {
  channel: {
    id: string
    name: string
    type: string
    created_at: string
  }
  lastMessage: {
    content: string
    user_id: string
    created_at: string
  } | null
  unreadCount: number
  otherUser: {
    user_id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface ConversationListProps {
  conversations: ConversationItem[]
  activeChannelId: string | null
  onSelect: (channelId: string) => void
  onNewDm: () => void
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function truncateMessage(content: string, maxLen = 60): string {
  // Strip mention markup: @[Name](userId) → @Name
  const cleaned = content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen) + '...'
}

export function ConversationList({
  conversations,
  activeChannelId,
  onSelect,
  onNewDm,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Messages</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={onNewDm}
        >
          <PenSquare className="h-3.5 w-3.5" />
          New DM
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col py-1">
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          )}

          {conversations.map((conv) => {
            const isActive = conv.channel.id === activeChannelId
            const isGeneral = conv.channel.type === 'general'
            const isAnnouncement = conv.channel.type === 'announcement'
            const isDm = conv.channel.type === 'direct'

            const displayName = isDm
              ? (conv.otherUser?.display_name ?? 'Unknown')
              : conv.channel.name

            const initials = (isDm ? conv.otherUser?.display_name : conv.channel.name)
              ?.split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) ?? '?'

            return (
              <button
                key={conv.channel.id}
                type="button"
                onClick={() => onSelect(conv.channel.id)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50',
                  isActive && 'bg-muted'
                )}
              >
                {/* Avatar / Icon */}
                {isDm ? (
                  <Avatar className="h-9 w-9 shrink-0">
                    {conv.otherUser?.avatar_url && (
                      <AvatarImage src={conv.otherUser.avatar_url} alt={displayName} />
                    )}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {isGeneral ? (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Megaphone className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                {/* Name + last message */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-sm truncate',
                      conv.unreadCount > 0 ? 'font-semibold' : 'font-medium'
                    )}>
                      {displayName}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatRelativeTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        'text-xs truncate',
                        conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {truncateMessage(conv.lastMessage.content)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-4 min-w-4 shrink-0 rounded-full px-1 text-[10px] leading-none"
                        >
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
