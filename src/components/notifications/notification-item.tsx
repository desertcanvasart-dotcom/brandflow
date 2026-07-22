'use client'

import { useState } from 'react'
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
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  notification: NotificationRow & { groupCount?: number }
  onRead?: () => void
  onDelete?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onAction?: (actionType: string) => void
  isArchived?: boolean
}

export function NotificationItem({
  notification,
  onRead,
  onDelete,
  onArchive,
  onUnarchive,
  onAction,
  isArchived = false,
}: NotificationItemProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const type = notification.type as NotificationType
  const Icon = NOTIFICATION_ICONS[type] ?? MessageSquare
  const iconColor = NOTIFICATION_ICON_COLORS[type] ?? 'text-muted-foreground'
  const groupCount = (notification as unknown as { groupCount?: number }).groupCount ?? 1

  function handleClick() {
    if (!notification.is_read) {
      onRead?.()
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const hasAction = notification.action_type && !notification.action_taken

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 rounded-md px-3 py-3 transition-colors',
        !isArchived && 'cursor-pointer hover:bg-accent/50',
        !notification.is_read && !isArchived && 'bg-accent/20'
      )}
    >
      {/* Unread dot */}
      {!notification.is_read && !isArchived && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" />
      )}

      {/* Icon */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted cursor-pointer"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleClick()
        }}
      >
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleClick()
          }}
        >
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'text-sm leading-snug',
                !notification.is_read && !isArchived ? 'font-semibold' : 'font-normal'
              )}
            >
              {notification.title}
            </p>
            {groupCount > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(!expanded)
                }}
                className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/80"
              >
                {groupCount}
                {expanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>

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

        {/* In-notification action buttons */}
        {hasAction && onAction && (
          <div className="flex gap-2 mt-2">
            {notification.action_type === 'approve_task' && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={() => onAction('approve_task')}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAction('reject_task')}
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            {notification.action_type === 'mark_complete' && (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onAction('mark_complete')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Mark Complete
              </Button>
            )}
            {notification.action_type === 'acknowledge' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onAction('acknowledge')}
              >
                <Check className="h-3 w-3 mr-1" />
                Acknowledge
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isArchived && onArchive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onArchive()
            }}
            className="rounded-sm p-1 hover:bg-muted"
            aria-label="Archive notification"
            title="Archive"
          >
            <Archive className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        {isArchived && onUnarchive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onUnarchive()
            }}
            className="rounded-sm p-1 hover:bg-muted"
            aria-label="Restore notification"
            title="Restore"
          >
            <ArchiveRestore className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="rounded-sm p-1 hover:bg-muted"
            aria-label="Delete notification"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}
