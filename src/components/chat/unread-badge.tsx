'use client'

import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'

interface UnreadBadgeProps {
  projectId: string
}

export function UnreadBadge({ projectId }: UnreadBadgeProps) {
  const { data } = trpc.chat.getChannelByProject.useQuery(
    { projectId },
    { refetchInterval: 30_000 } // Fallback polling every 30s
  )

  if (!data?.unreadCount || data.unreadCount === 0) return null

  return (
    <Badge
      variant="destructive"
      className="ml-1 h-4 min-w-4 rounded-full px-1 text-[10px] leading-none"
    >
      {data.unreadCount > 99 ? '99+' : data.unreadCount}
    </Badge>
  )
}
