'use client'

import { MessageCircle, Users, CheckSquare, Pin, Target } from 'lucide-react'
import { trpc } from '@/trpc/client'

interface EnhancedChatHeaderProps {
  channelId: string
  channelName: string
  projectId?: string
  onViewPinned?: () => void
}

export function EnhancedChatHeader({
  channelId,
  channelName,
  projectId,
  onViewPinned,
}: EnhancedChatHeaderProps) {
  const { data: stats } = trpc.chat.getChannelStats.useQuery(
    { channelId, projectId },
    { enabled: !!channelId, staleTime: 30_000 }
  )

  return (
    <div className="flex items-center gap-2 border-b px-4 py-3">
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{channelName}</h3>

      {stats && (
        <div className="ml-auto flex items-center gap-3">
          <StatCounter
            icon={Users}
            value={stats.memberCount}
            label="Members"
          />
          {projectId && (
            <StatCounter
              icon={CheckSquare}
              value={stats.taskCount}
              label="Tasks"
            />
          )}
          <button
            type="button"
            onClick={onViewPinned}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pin className="h-3 w-3" />
            <span>{stats.pinnedCount}</span>
          </button>
          {projectId && (
            <StatCounter
              icon={Target}
              value={stats.decisionCount}
              label="Decisions"
            />
          )}
        </div>
      )}
    </div>
  )
}

function StatCounter({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users
  value: number
  label: string
}) {
  return (
    <div
      className="flex items-center gap-1 text-xs text-muted-foreground"
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span>{value}</span>
    </div>
  )
}
