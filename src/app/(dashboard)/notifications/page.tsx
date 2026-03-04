'use client'

import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { trpc } from '@/trpc/client'
import { NotificationItem } from '@/components/notifications/notification-item'
import { cn } from '@/lib/utils'

type TabValue = 'all' | 'unread'

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabValue>('all')
  const unreadOnly = tab === 'unread'

  const utils = trpc.useUtils()

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  )

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.notification.list.useInfiniteQuery(
    { limit: 20, unreadOnly },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  )

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate()
      utils.notification.list.invalidate()
    },
  })

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate()
      utils.notification.list.invalidate()
    },
  })

  const deleteNotification = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate()
      utils.notification.list.invalidate()
    },
  })

  const notifications = data?.pages.flatMap((page) => page.items) ?? []
  const count = unreadCount ?? 0

  return (
    <>
      <TopBar title="Notifications" />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Notifications
              </h2>
              <p className="text-sm text-muted-foreground">
                {count > 0
                  ? `You have ${count} unread notification${count !== 1 ? 's' : ''}`
                  : 'You\u2019re all caught up'}
              </p>
            </div>
          </div>
          {count > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab('unread')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === 'unread'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Unread
            {count > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-md px-3 py-3 animate-pulse"
              >
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-64 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-0.5">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead.mutate({ id: notification.id })}
                onDelete={() =>
                  deleteNotification.mutate({ id: notification.id })
                }
              />
            ))}

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="text-lg font-medium mt-4">No notifications</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {unreadOnly
                  ? 'You have no unread notifications'
                  : 'When something happens, you\u2019ll see it here'}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
