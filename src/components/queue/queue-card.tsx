'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Music2,
  BookOpen,
  Mail,
  Globe,
  CalendarIcon,
  CheckCircle2,
  X,
  ExternalLink,
  MoreHorizontal,
  Clock,
  Send,
  History,
  Loader2,
} from 'lucide-react'
import { PLATFORM_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { PublishLogDialog } from '@/components/social/publish-log-dialog'
import type { Database } from '@/types/database'
import type { LucideIcon } from 'lucide-react'

type ContentPlatform = Database['public']['Enums']['content_platform']

// ─── Platform icon mapping ────────────────────────────
const PLATFORM_ICONS: Record<ContentPlatform, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
  blog: BookOpen,
  newsletter: Mail,
  other: Globe,
}

const PLATFORM_ICON_COLORS: Record<ContentPlatform, string> = {
  instagram: 'text-pink-500',
  facebook: 'text-blue-600',
  twitter: 'text-gray-800',
  linkedin: 'text-blue-700',
  youtube: 'text-red-600',
  tiktok: 'text-gray-900',
  blog: 'text-orange-500',
  newsletter: 'text-purple-500',
  other: 'text-gray-500',
}

// ─── Types ────────────────────────────────────────────
export type PipelineItem = {
  id: string
  task_id: string
  platform: string
  body: string | null
  media_urls: string[]
  hashtags: string[]
  scheduled_at: string | null
  published_at: string | null
  published_url: string | null
  metadata: unknown
  created_at: string
  updated_at: string
  tasks: {
    id: string
    title: string
    status: string
    assignee_id: string | null
    due_date: string | null
    projects: {
      organization_id: string
      brand_id: string
      name: string
      brands: { name: string; logo_url: string | null }
    }
  }
}

export type SocialConnectionStatus = {
  isConnected: boolean
  isActive: boolean
} | null

export interface QueueCardProps {
  item: PipelineItem
  columnId: string
  isSelected: boolean
  anySelected: boolean
  onSelect: (id: string) => void
  onSchedule: (item: PipelineItem) => void
  onPublish: (contentItemId: string) => void
  onUnschedule: (contentItemId: string) => void
  isDragging?: boolean
  isOverlay?: boolean
  isPending?: boolean
  socialConnection?: SocialConnectionStatus
}

// ─── Helpers ──────────────────────────────────────────
function stripHtml(html: string) {
  if (typeof window !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    return el.textContent ?? el.innerText ?? ''
  }
  return html.replace(/<[^>]*>/g, '')
}

function formatScheduleDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()

  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  if (isToday) return `Today • ${timeStr}`
  if (isTomorrow) return `Tomorrow • ${timeStr}`

  return `${date.toLocaleDateString('default', { month: 'short', day: 'numeric' })} • ${timeStr}`
}

// ─── Component ────────────────────────────────────────
export function QueueCard({
  item,
  columnId,
  isSelected,
  anySelected,
  onSelect,
  onSchedule,
  onPublish,
  onUnschedule,
  isDragging,
  isOverlay,
  isPending,
  socialConnection,
}: QueueCardProps) {
  const utils = trpc.useUtils()
  const platform = item.platform as ContentPlatform
  const PlatformIcon = PLATFORM_ICONS[platform] ?? Globe
  const iconColor = PLATFORM_ICON_COLORS[platform] ?? 'text-gray-500'
  const statusColor = TASK_STATUS_COLORS[item.tasks.status as keyof typeof TASK_STATUS_COLORS] ?? '#6B7280'
  const bodyPreview = item.body ? stripHtml(item.body) : ''
  const truncatedPreview = bodyPreview.length > 60 ? bodyPreview.slice(0, 60) + '…' : bodyPreview
  const isPublished = !!item.published_at
  const hasThumb = item.media_urls && item.media_urls.length > 0

  // Social publishing state
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const canPublishSocial = socialConnection?.isConnected && socialConnection?.isActive

  const publishNowMutation = trpc.social.publishNow.useMutation({
    onSuccess: () => {
      toast.success('Content published to ' + (PLATFORM_LABELS[platform] ?? platform))
      utils.content.listPipeline.invalidate()
      utils.content.listQueue.invalidate()
      utils.task.listByBoard.invalidate()
      utils.task.list.invalidate()
      utils.social.getPublishLog.invalidate({ contentItemId: item.id })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div
      className={cn(
        'group/card rounded-lg border bg-white p-3 transition-all',
        isDragging && 'opacity-30',
        isOverlay && 'shadow-lg ring-2 ring-primary/20 rotate-1 scale-105',
        isPending && 'opacity-60 pointer-events-none',
        !isDragging && !isOverlay && 'hover:shadow-sm',
        isSelected && 'ring-2 ring-primary/40',
      )}
    >
      {/* Top row: checkbox + platform badge + actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Checkbox */}
          <div
            className={cn(
              'transition-opacity',
              anySelected ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-100'
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(item.id)}
              className="h-3.5 w-3.5"
            />
          </div>

          {/* Platform badge */}
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 gap-1"
          >
            <PlatformIcon className={cn('h-3 w-3', iconColor)} />
            {PLATFORM_LABELS[platform] ?? platform}
          </Badge>

          {/* Social connection status indicator */}
          {socialConnection && (
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                canPublishSocial ? 'bg-green-500' : 'bg-red-500',
              )}
              title={canPublishSocial ? 'Social account connected' : 'Social account disconnected'}
            />
          )}
        </div>

        {/* Status dot */}
        <div
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: statusColor }}
          title={item.tasks.status}
        />
      </div>

      {/* Title + brand */}
      <div className="mb-2">
        <p className="text-sm font-medium leading-tight truncate">{item.tasks.title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {item.tasks.projects.brands?.name ?? item.tasks.projects.name}
        </p>
      </div>

      {/* Body preview + thumbnail */}
      {(truncatedPreview || hasThumb) && (
        <div className="flex gap-2 mb-2">
          {hasThumb && (
            <img
              src={item.media_urls[0]}
              alt=""
              className="h-8 w-8 rounded object-cover shrink-0 bg-muted"
            />
          )}
          {truncatedPreview && (
            <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
              {truncatedPreview}
            </p>
          )}
        </div>
      )}

      {/* Schedule info */}
      {item.scheduled_at && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formatScheduleDate(item.scheduled_at)}</span>
        </div>
      )}

      {/* Actions — contextual per column */}
      <div className="flex items-center justify-between pt-1 border-t border-dashed">
        <div className="flex items-center gap-1">
          {columnId === 'approved' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => onSchedule(item)}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              Schedule
            </Button>
          )}
          {columnId === 'scheduled' && !isPublished && (
            <>
              {canPublishSocial ? (
                <Button
                  variant="default"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => publishNowMutation.mutate({ contentItemId: item.id })}
                  disabled={publishNowMutation.isPending}
                >
                  {publishNowMutation.isPending ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  Publish Now
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-green-600 hover:text-green-700"
                  onClick={() => onPublish(item.id)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Publish
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => onSchedule(item)}
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Reschedule
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5 text-destructive hover:text-destructive"
                onClick={() => onUnschedule(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
          {columnId === 'published' && item.published_url && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" asChild>
              <a href={item.published_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
          )}
          {columnId === 'published' && !item.published_url && (
            <span className="text-[10px] text-green-600 font-medium px-1">Published</span>
          )}
          {columnId === 'review' && (
            <span className="text-[10px] text-amber-600 font-medium px-1">Awaiting Review</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* View Log button */}
          {socialConnection && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity"
              onClick={() => setLogDialogOpen(true)}
              title="View publish log"
            >
              <History className="h-3 w-3" />
            </Button>
          )}

          {/* More menu (edit link) */}
          {(columnId === 'approved' || columnId === 'scheduled') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
              asChild
            >
              <a
                href={`/projects/${item.tasks.projects.name}?task=${item.tasks.id}`}
                title="Open task"
              >
                <MoreHorizontal className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Publish Log Dialog */}
      {socialConnection && (
        <PublishLogDialog
          contentItemId={item.id}
          open={logDialogOpen}
          onOpenChange={setLogDialogOpen}
        />
      )}
    </div>
  )
}
