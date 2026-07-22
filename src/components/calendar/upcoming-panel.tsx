'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ListChecks, FileText, Video, CalendarClock, CalendarDays } from 'lucide-react'
import { CALENDAR_EVENT_STYLES } from '@/lib/constants'
import type { CalendarEvent } from './types'

const EVENT_ICONS = {
  task: ListChecks,
  content: FileText,
  meeting: Video,
  calendar_event: CalendarDays,
} as const

function formatUpcomingDate(dateStr: string): string {
  const today = new Date()
  const todayKey = formatDateKey(today)
  if (dateStr === todayKey) return 'Today'

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === formatDateKey(tomorrow)) return 'Tomorrow'

  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('default', { month: 'short', day: 'numeric' })
}

function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface UpcomingPanelProps {
  events: CalendarEvent[]
}

export function UpcomingPanel({ events }: UpcomingPanelProps) {
  const todayKey = formatDateKey(new Date())

  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.date >= todayKey)
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date)
        if (dateCmp !== 0) return dateCmp
        return (a.time ?? '23:59').localeCompare(b.time ?? '23:59')
      })
      .slice(0, 10)
  }, [events, todayKey])

  return (
    <div className="w-72 shrink-0 hidden xl:block">
      <Card className="sticky top-20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No upcoming events
            </p>
          ) : (
            <div className="space-y-1">
              {upcoming.map((event) => {
                const style = CALENDAR_EVENT_STYLES[event.type]
                const Icon = EVENT_ICONS[event.type]
                const isToday = event.date === todayKey

                return (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded shrink-0',
                        style.bg,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        <span className={isToday ? 'font-semibold text-primary' : ''}>
                          {formatUpcomingDate(event.date)}
                        </span>
                        {event.time && ` at ${event.time}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
