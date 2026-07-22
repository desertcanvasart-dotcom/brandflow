'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────

interface PresenceUser {
  userId: string
  name: string
  avatarUrl?: string
  activeField: string | null
}

interface PresenceAvatarsProps {
  documentId: string
  currentUser: { id: string; name: string; avatarUrl?: string }
  maxVisible?: number
}

// ── Color ring per user (deterministic from userId) ──────────

const RING_COLORS = [
  'ring-blue-500',
  'ring-green-500',
  'ring-purple-500',
  'ring-orange-500',
  'ring-pink-500',
  'ring-cyan-500',
  'ring-yellow-500',
  'ring-red-500',
]

function colorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return RING_COLORS[Math.abs(hash) % RING_COLORS.length]
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Component ────────────────────────────────────────────────

export function PresenceAvatars({
  documentId,
  currentUser,
  maxVisible = 4,
}: PresenceAvatarsProps) {
  const [others, setOthers] = useState<PresenceUser[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!documentId) return

    const supabase = createClient()
    const channel = supabase.channel(`kb-doc:${documentId}`)
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: PresenceUser[] = []

      for (const key of Object.keys(state)) {
        const presences = state[key] as unknown as PresenceUser[]
        for (const p of presences) {
          // Skip self
          if (p.userId !== currentUser.id) {
            users.push(p)
          }
        }
      }

      setOthers(users)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
          activeField: null,
        })
      }
    })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [documentId, currentUser.id, currentUser.name, currentUser.avatarUrl])

  if (others.length === 0) return null

  const visible = others.slice(0, maxVisible)
  const overflow = others.length - maxVisible

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        <div className="flex -space-x-2">
          {visible.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'relative h-7 w-7 rounded-full ring-2 bg-muted flex items-center justify-center text-[10px] font-medium cursor-default',
                    colorForUser(user.userId)
                  )}
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{initials(user.name)}</span>
                  )}
                  {/* Active editing indicator (green dot) */}
                  {user.activeField && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {user.name}
                {user.activeField && (
                  <span className="text-muted-foreground"> — editing {user.activeField}</span>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {overflow > 0 && (
          <span className="text-[10px] text-muted-foreground ml-1">
            +{overflow} {overflow === 1 ? 'other' : 'others'}
          </span>
        )}
      </div>
    </TooltipProvider>
  )
}
