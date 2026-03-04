'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  UserPlus,
  RefreshCw,
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle,
  Video,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'due_date_approaching'
  | 'content_scheduled'
  | 'content_published'
  | 'meeting_starting'

const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  task_assigned: UserPlus,
  task_status_changed: RefreshCw,
  comment_added: MessageSquare,
  due_date_approaching: Clock,
  content_scheduled: Calendar,
  content_published: CheckCircle,
  meeting_starting: Video,
}

const NOTIFICATION_ICON_COLORS: Record<NotificationType, string> = {
  task_assigned: 'text-blue-500',
  task_status_changed: 'text-orange-500',
  comment_added: 'text-violet-500',
  due_date_approaching: 'text-amber-500',
  content_scheduled: 'text-cyan-500',
  content_published: 'text-green-500',
  meeting_starting: 'text-rose-500',
}

interface NotificationItemProps {
  notification: NotificationRow
  onRead?: () => void
  onDelete?: () => void
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
}: NotificationItemProps) {
  const router = useRouter()

  const type = notification.type as NotificationType
  const Icon = NOTIFICATION_ICONS[type] ?? MessageSquare
  const iconColor = NOTIFICATION_ICON_COLORS[type] ?? 'text-muted-foreground'

  function handleClick() {
    if (!notification.is_read) {
      onRead?.()
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={cn(
        'group relative flex items-start gap-3 rounded-md px-3 py-3 transition-colors cursor-pointer hover:bg-accent/50',
        !notification.is_read && 'bg-accent/20'
      )}
    >
      {/* Unread dot */}
      {!notification.is_read && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
      )}

      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-snug',
            !notification.is_read ? 'font-semibold' : 'font-normal'
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>

      {/* Delete button (visible on hover) */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm p-1 hover:bg-muted"
          aria-label="Delete notification"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
