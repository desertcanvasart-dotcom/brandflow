'use client'

import { trpc } from '@/trpc/client'

export function SidebarUnreadBadge() {
  const { data } = trpc.chat.getTotalUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  )

  const count = data?.count ?? 0
  if (count === 0) return null

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
