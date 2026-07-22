'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ListChecks, FileText, Video, CalendarDays } from 'lucide-react'
import { CALENDAR_EVENT_STYLES, PLATFORM_LABELS, MEETING_TYPE_LABELS } from '@/lib/constants'
import type { CalendarEvent } from './types'
import type { ContentPlatform, MeetingType } from '@/types/enums'

const EVENT_ICONS = {
  task: ListChecks,
  content: FileText,
  meeting: Video,
  calendar_event: CalendarDays,
} as const

interface CalendarEventBlockProps {
  event: CalendarEvent
  compact?: boolean
  isDragging?: boolean
  isOverlay?: boolean
  onClick?: () => void
}

export function CalendarEventBlock({
  event,
  compact,
  isDragging,
  isOverlay,
  onClick,
}: CalendarEventBlockProps) {
  const style = CALENDAR_EVENT_STYLES[event.type]
  const Icon = EVENT_ICONS[event.type]

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md border-l-[3px] px-2 py-1 text-xs transition-all',
        style.bg,
        style.border,
        isDragging && 'opacity-30',
        isOverlay && 'shadow-lg ring-2 ring-primary/20 rotate-1 scale-105',
        !isDragging && !isOverlay && 'hover:shadow-sm cursor-pointer',
      )}
      title={
        compact
          ? `${event.title}${event.time ? ` at ${event.time}` : ''}${event.brandName ? ` — ${event.brandName}` : ''}`
          : undefined
      }
    >
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{event.title}</span>
      {!compact && event.time && (
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {event.time}
          {event.endTime ? `–${event.endTime}` : ''}
        </span>
      )}
      {!compact && event.platform && (
        <Badge variant="outline" className="ml-auto text-[8px] px-1 py-0 h-3.5 shrink-0">
          {PLATFORM_LABELS[event.platform as ContentPlatform] ?? event.platform}
        </Badge>
      )}
      {!compact && event.meetingType && (
        <Badge variant="outline" className="ml-auto text-[8px] px-1 py-0 h-3.5 shrink-0">
          {MEETING_TYPE_LABELS[event.meetingType as MeetingType] ?? event.meetingType}
        </Badge>
      )}
    </div>
  )
}
