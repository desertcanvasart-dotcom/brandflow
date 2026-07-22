'use client'

import { useState, useMemo } from 'react'
import { Bell, CheckCheck, Search, Filter, X } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trpc } from '@/trpc/client'
import { NotificationItem } from '@/components/notifications/notification-item'
import { cn } from '@/lib/utils'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import type { NotificationType } from '@/types/enums'

type TabValue = 'all' | 'unread' | 'archived'

const EVENT_TYPES: NotificationType[] = [
  'task_assigned',
  'task_status_changed',
  'comment_added',
  'due_date_approaching',
  'content_scheduled',
  'content_published',
  'meeting_starting',
]

export default function NotificationsPage() {
  const [tab, setTab] = useState<TabValue>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  const isArchived = tab === 'archived'
  const unreadOnly = tab === 'unread'

  const utils = trpc.useUtils()

  // Debounce search
  const debounceRef = useMemo(() => {
    let timeout: NodeJS.Timeout
    return (value: string) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => setDebouncedQuery(value), 300)
    }
  }, [])

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    debounceRef(value)
  }

  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  )

  // Use search endpoint if filters are active, otherwise use list
  const hasFilters = debouncedQuery || typeFilters.length > 0
  const useSearch = hasFilters

  const listQuery = trpc.notification.list.useInfiniteQuery(
    { limit: 20, unreadOnly, isArchived, grouped: !isArchived },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !useSearch,
    }
  )

  const searchQueryResult = trpc.notification.search.useInfiniteQuery(
    {
      limit: 20,
      query: debouncedQuery || undefined,
      types: typeFilters.length > 0 ? typeFilters : undefined,
      isRead: unreadOnly ? false : undefined,
      isArchived,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: useSearch,
    }
  )

  const activeQuery = useSearch ? searchQueryResult : listQuery
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = activeQuery

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate()
      utils.notification.list.invalidate()
      utils.notification.search.invalidate()
    },
  })

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate()
      utils.notification.list.invalidate()
      utils.notification.search.invalidate()
    },
  })

  const deleteNotification = trpc.notification.delete.useMutation({
    onSuccess: () => {
      utils.notification.unreadCount.invalidate()
      utils.notification.list.invalidate()
      utils.notification.search.invalidate()
    },
  })

  const archiveNotification = trpc.notification.archive.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate()
      utils.notification.search.invalidate()
      toast.success('Notification archived')
    },
  })

  const unarchiveNotification = trpc.notification.unarchive.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate()
      utils.notification.search.invalidate()
      toast.success('Notification restored')
    },
  })

  const executeAction = trpc.notification.executeAction.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message)
        utils.notification.list.invalidate()
        utils.notification.search.invalidate()
      } else {
        toast.error(result.message)
      }
    },
    onError: (err) => toast.error(err.message),
  })

  const notifications = data?.pages.flatMap((page) => page.items) ?? []
  const count = unreadCount ?? 0

  const activeFilterCount = typeFilters.length

  function toggleTypeFilter(type: string) {
    setTypeFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

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

        {/* Search + Filter bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setDebouncedQuery('')
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <div className="text-sm font-medium">Filter by type</div>
                <div className="space-y-2">
                  {EVENT_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={typeFilters.includes(type)}
                        onCheckedChange={() => toggleTypeFilter(type)}
                      />
                      {NOTIFICATION_TYPE_LABELS[type]}
                    </label>
                  ))}
                </div>
                {typeFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTypeFilters([])}
                    className="w-full"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          {(['all', 'unread', 'archived'] as TabValue[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                tab === t
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'all' && 'All'}
              {t === 'unread' && (
                <>
                  Unread
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </>
              )}
              {t === 'archived' && 'Archived'}
            </button>
          ))}
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
                isArchived={isArchived}
                onRead={() => markAsRead.mutate({ id: notification.id })}
                onDelete={() =>
                  deleteNotification.mutate({ id: notification.id })
                }
                onArchive={() =>
                  archiveNotification.mutate({ id: notification.id })
                }
                onUnarchive={() =>
                  unarchiveNotification.mutate({ id: notification.id })
                }
                onAction={(actionType) =>
                  executeAction.mutate({
                    notificationId: notification.id,
                    actionType: actionType as 'approve_task' | 'reject_task' | 'mark_complete' | 'acknowledge',
                  })
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
                {isArchived
                  ? 'No archived notifications'
                  : unreadOnly
                    ? 'You have no unread notifications'
                    : hasFilters
                      ? 'No notifications match your filters'
                      : 'When something happens, you\u2019ll see it here'}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
