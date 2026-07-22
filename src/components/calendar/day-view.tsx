'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Plus, ListChecks, FileText, Video, CalendarDays } from 'lucide-react'
import { CALENDAR_EVENT_STYLES, PLATFORM_LABELS, MEETING_TYPE_LABELS } from '@/lib/constants'
import type { CalendarEvent } from './types'
import type { ContentPlatform, MeetingType } from '@/types/enums'

const EVENT_ICONS = {
  task: ListChecks,
  content: FileText,
  meeting: Video,
  calendar_event: CalendarDays,
} as const

interface DayViewProps {
  date: Date
  events: CalendarEvent[]
  onQuickCreate: (date: Date) => void
}

export function DayView({ date, events, onQuickCreate }: DayViewProps) {
  const dateLabel = date.toLocaleDateString('default', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const { timedEvents, untimedEvents } = useMemo(() => {
    const timed = events
      .filter((e) => e.time)
      .sort((a, b) => a.time!.localeCompare(b.time!))
    const untimed = events.filter((e) => !e.time)
    return { timedEvents: timed, untimedEvents: untimed }
  }, [events])

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{dateLabel}</h3>
          <p className="text-sm text-muted-foreground">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => onQuickCreate(date)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Event
        </Button>
      </div>

      {events.length === 0 && (
        <div className="flex items-center justify-center rounded-xl border border-dashed p-12">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              No events scheduled for this day.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => onQuickCreate(date)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Event
            </Button>
          </div>
        </div>
      )}

      {/* Timed events */}
      {timedEvents.length > 0 && (
        <div className="space-y-2">
          {timedEvents.map((event) => {
            const style = CALENDAR_EVENT_STYLES[event.type]
            const Icon = EVENT_ICONS[event.type]

            return (
              <Card key={`${event.type}-${event.id}`} className="overflow-hidden">
                <div className={cn('flex', style.border, 'border-l-4')}>
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      {/* Time column */}
                      <div className="shrink-0 w-16 text-right">
                        <p className="text-sm font-semibold">{event.time}</p>
                        {event.endTime && (
                          <p className="text-xs text-muted-foreground">{event.endTime}</p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="w-px bg-border self-stretch shrink-0" />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{event.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            {style.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          {event.brandName && <span>{event.brandName}</span>}
                          {event.brandName && event.projectName && <span>&middot;</span>}
                          {event.projectName && <span>{event.projectName}</span>}
                          {event.platform && (
                            <>
                              <span>&middot;</span>
                              <span>{PLATFORM_LABELS[event.platform as ContentPlatform] ?? event.platform}</span>
                            </>
                          )}
                          {event.meetingType && (
                            <>
                              <span>&middot;</span>
                              <span>{MEETING_TYPE_LABELS[event.meetingType as MeetingType] ?? event.meetingType}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Untimed / all-day events */}
      {untimedEvents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground px-1">All Day</h4>
          {untimedEvents.map((event) => {
            const style = CALENDAR_EVENT_STYLES[event.type]
            const Icon = EVENT_ICONS[event.type]

            return (
              <Card key={`${event.type}-${event.id}`} className="overflow-hidden">
                <div className={cn('flex', style.border, 'border-l-4')}>
                  <CardContent className="flex-1 p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded', style.bg)}>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{event.title}</span>
                        {(event.brandName || event.projectName) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[event.brandName, event.projectName].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      {event.status && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
