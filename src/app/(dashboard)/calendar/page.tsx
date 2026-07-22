'use client'

import { useMemo, useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListChecks,
  FileText,
  Video,
  AlertTriangle,
  Calendar,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { CALENDAR_EVENT_STYLES } from '@/lib/constants'
import { useCalendarStore } from '@/stores/calendar-store'
import { MonthView } from '@/components/calendar/month-view'
import { WeekView } from '@/components/calendar/week-view'
import { DayView } from '@/components/calendar/day-view'
import { UpcomingPanel } from '@/components/calendar/upcoming-panel'
import { QuickCreateDialog } from '@/components/calendar/quick-create-dialog'
import type { CalendarEvent } from '@/components/calendar/types'

// ─── Icon mapping ─────────────────────────────────────
const LEGEND_ICONS = {
  task: ListChecks,
  content: FileText,
  meeting: Video,
  calendar_event: Calendar,
} as const

// ─── Date helpers ─────────────────────────────────────
function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  return d
}

// ─── Component ────────────────────────────────────────
export default function CalendarPage() {
  const { view, setView, currentDate, setCurrentDate, selectedDate, setSelectedDate } =
    useCalendarStore()

  const [brandFilter, setBrandFilter] = useState('all')
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [quickCreateDate, setQuickCreateDate] = useState(new Date())
  const [pendingMoves, setPendingMoves] = useState<Map<string, string>>(new Map())

  const utils = trpc.useUtils()

  // ─── Date range based on view ─────────────────────
  const { startDate, endDate } = useMemo(() => {
    if (view === 'day' && selectedDate) {
      const key = formatDateKey(selectedDate)
      return { startDate: key, endDate: key }
    }
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate)
      const weekEnd = endOfWeek(currentDate)
      return { startDate: formatDateKey(weekStart), endDate: formatDateKey(weekEnd) }
    }
    // month
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth()
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`
    const lastDay = new Date(y, m + 1, 0).getDate()
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { startDate: start, endDate: end }
  }, [view, currentDate, selectedDate])

  // ─── Data fetching ────────────────────────────────
  const brandId = brandFilter === 'all' ? undefined : brandFilter

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: tasks } = trpc.calendar.getTasksByRange.useQuery({ startDate, endDate, brandId })
  const { data: contentItems } = trpc.calendar.getContentByRange.useQuery({ startDate, endDate, brandId })
  const { data: meetings } = trpc.meeting.list.useQuery({
    dateFrom: startDate,
    dateTo: endDate + 'T23:59:59',
    brandId,
  })

  // ─── Brand lookup ─────────────────────────────────
  const brandMap = useMemo(() => {
    const map = new Map<string, { name: string; color?: string }>()
    for (const b of brands ?? []) {
      const colors = b.colors as Array<{ name: string; hex: string }> | null
      map.set(b.id, { name: b.name, color: colors?.[0]?.hex })
    }
    return map
  }, [brands])

  // ─── Merge into CalendarEvent[] ───────────────────
  const events = useMemo<CalendarEvent[]>(() => {
    const result: CalendarEvent[] = []

    for (const task of tasks ?? []) {
      if (!task.due_date) continue
      result.push({
        id: task.id,
        type: 'task',
        title: task.title,
        date: task.due_date.split('T')[0],
        status: task.status,
        brandName: task.projects?.brands?.name,
        projectName: task.projects?.name,
        brandId: task.projects?.brand_id,
        projectId: task.project_id,
        originalTask: task as CalendarEvent['originalTask'],
      })
    }

    for (const item of contentItems ?? []) {
      if (!item.scheduled_at) continue
      result.push({
        id: item.id,
        type: 'content',
        title: item.tasks?.title ?? 'Content',
        date: item.scheduled_at.split('T')[0],
        time: formatTime(item.scheduled_at),
        platform: item.platform,
        brandName: item.tasks?.projects?.brands?.name,
        projectName: undefined,
        brandId: item.tasks?.projects?.brand_id,
        projectId: item.task_id,
        originalContent: item as CalendarEvent['originalContent'],
      })
    }

    for (const meeting of meetings ?? []) {
      const dateTime = new Date(meeting.scheduled_at)
      const endTime = new Date(dateTime.getTime() + (meeting.duration_minutes ?? 30) * 60000)
      const brand = meeting.brand_id ? brandMap.get(meeting.brand_id) : undefined

      result.push({
        id: meeting.id,
        type: 'meeting',
        title: meeting.title,
        date: meeting.scheduled_at.split('T')[0],
        time: formatTime(meeting.scheduled_at),
        endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
        status: meeting.status,
        meetingType: meeting.meeting_type,
        brandName: brand?.name,
        brandId: meeting.brand_id ?? undefined,
        projectId: meeting.project_id ?? undefined,
        originalMeeting: meeting as CalendarEvent['originalMeeting'],
      })
    }

    // Apply pending drag-and-drop moves for instant visual feedback
    if (pendingMoves.size > 0) {
      for (const ev of result) {
        const newDate = pendingMoves.get(ev.id)
        if (newDate) ev.date = newDate
      }
    }

    return result
  }, [tasks, contentItems, meetings, brandMap, pendingMoves])

  // ─── Group by date ────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const existing = map.get(event.date) ?? []
      existing.push(event)
      map.set(event.date, existing)
    }
    // Sort each day's events: timed first (by time), then untimed
    for (const [, dayEvents] of map) {
      dayEvents.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time)
        if (a.time && !b.time) return -1
        if (!a.time && b.time) return 1
        return 0
      })
    }
    return map
  }, [events])

  // ─── Stats ────────────────────────────────────────
  const stats = useMemo(
    () => ({
      tasks: events.filter((e) => e.type === 'task').length,
      meetings: events.filter((e) => e.type === 'meeting').length,
      content: events.filter((e) => e.type === 'content').length,
      deadlines: events.filter(
        (e) => e.type === 'task' && e.status !== 'done' && e.status !== 'published'
      ).length,
    }),
    [events]
  )

  // ─── Mutations (with optimistic updates to prevent snap-back) ──
  const rescheduleContent = trpc.calendar.reschedule.useMutation({
    onMutate: async ({ contentItemId, scheduledAt }) => {
      const input = { startDate, endDate, brandId }
      await utils.calendar.getContentByRange.cancel()
      const prev = utils.calendar.getContentByRange.getData(input)
      utils.calendar.getContentByRange.setData(input, (old) =>
        old?.map((item) =>
          item.id === contentItemId ? { ...item, scheduled_at: scheduledAt } : item
        )
      )
      return { prev, input }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.calendar.getContentByRange.setData(ctx.input, ctx.prev)
      toast.error('Failed to reschedule content')
    },
    onSettled: (_d, _e, vars, ctx) => {
      setPendingMoves((prev) => { const next = new Map(prev); next.delete(vars.contentItemId); return next })
      utils.calendar.getContentByRange.invalidate(ctx?.input)
    },
    onSuccess: () => toast.success('Content rescheduled'),
  })

  const updateTask = trpc.task.update.useMutation({
    onMutate: async ({ id, dueDate }) => {
      if (!dueDate) return
      const input = { startDate, endDate, brandId }
      await utils.calendar.getTasksByRange.cancel()
      const prev = utils.calendar.getTasksByRange.getData(input)
      utils.calendar.getTasksByRange.setData(input, (old) =>
        old?.map((task) =>
          task.id === id ? { ...task, due_date: dueDate } : task
        )
      )
      return { prev, input }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.calendar.getTasksByRange.setData(ctx.input, ctx.prev)
      toast.error('Failed to reschedule task')
    },
    onSettled: (_d, _e, vars, ctx) => {
      setPendingMoves((prev) => { const next = new Map(prev); next.delete(vars.id); return next })
      utils.calendar.getTasksByRange.invalidate(ctx?.input)
    },
    onSuccess: () => toast.success('Task rescheduled'),
  })

  const updateMeeting = trpc.meeting.update.useMutation({
    onMutate: async ({ id, scheduledAt }) => {
      if (!scheduledAt) return
      const input = { dateFrom: startDate, dateTo: endDate + 'T23:59:59', brandId }
      await utils.meeting.list.cancel()
      const prev = utils.meeting.list.getData(input)
      utils.meeting.list.setData(input, (old) =>
        old?.map((m) =>
          m.id === id ? { ...m, scheduled_at: scheduledAt } : m
        )
      )
      return { prev, input }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.meeting.list.setData(ctx.input, ctx.prev)
      toast.error('Failed to reschedule meeting')
    },
    onSettled: (_d, _e, vars, ctx) => {
      setPendingMoves((prev) => { const next = new Map(prev); next.delete(vars.id); return next })
      utils.meeting.list.invalidate(ctx?.input)
    },
    onSuccess: () => toast.success('Meeting rescheduled'),
  })

  const handleEventDrop = useCallback(
    (event: CalendarEvent, newDate: string) => {
      // Apply move instantly via local state — same React batch as DragOverlay removal
      setPendingMoves((prev) => new Map(prev).set(event.id, newDate))

      switch (event.type) {
        case 'content':
          if (event.originalContent?.scheduled_at) {
            const oldDateTime = new Date(event.originalContent.scheduled_at)
            const [y, m, d] = newDate.split('-').map(Number)
            oldDateTime.setFullYear(y, m - 1, d)
            rescheduleContent.mutate({
              contentItemId: event.originalContent.id,
              scheduledAt: oldDateTime.toISOString(),
            })
          }
          break
        case 'task':
          updateTask.mutate({ id: event.id, dueDate: newDate })
          break
        case 'meeting':
          if (event.originalMeeting) {
            const oldDateTime = new Date(event.originalMeeting.scheduled_at)
            const [y, m, d] = newDate.split('-').map(Number)
            oldDateTime.setFullYear(y, m - 1, d)
            updateMeeting.mutate({
              id: event.id,
              scheduledAt: oldDateTime.toISOString(),
            })
          }
          break
      }
    },
    [rescheduleContent, updateTask, updateMeeting]
  )

  // ─── Navigation ───────────────────────────────────
  function navigate(direction: 'prev' | 'next') {
    const d = new Date(currentDate)
    if (view === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (view === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      const sd = selectedDate ?? currentDate
      const nd = new Date(sd)
      nd.setDate(nd.getDate() + (direction === 'next' ? 1 : -1))
      setSelectedDate(nd)
      return
    }
    setCurrentDate(d)
  }

  function goToday() {
    const today = new Date()
    setCurrentDate(today)
    if (view === 'day') setSelectedDate(today)
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date)
    setView('day')
  }

  function handleQuickCreate(date: Date) {
    setQuickCreateDate(date)
    setQuickCreateOpen(true)
  }

  // ─── Title ────────────────────────────────────────
  const viewTitle = useMemo(() => {
    if (view === 'day' && selectedDate) {
      return selectedDate.toLocaleDateString('default', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    if (view === 'week') {
      const ws = startOfWeek(currentDate)
      const we = endOfWeek(currentDate)
      const sameMonth = ws.getMonth() === we.getMonth()
      if (sameMonth) {
        return `${ws.toLocaleDateString('default', { month: 'long' })} ${ws.getDate()}–${we.getDate()}, ${we.getFullYear()}`
      }
      return `${ws.toLocaleDateString('default', { month: 'short' })} ${ws.getDate()} – ${we.toLocaleDateString('default', { month: 'short' })} ${we.getDate()}, ${we.getFullYear()}`
    }
    return currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })
  }, [view, currentDate, selectedDate])

  return (
    <>
      <TopBar title="Calendar" />
      <div className="flex flex-col gap-6 p-6">
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListChecks className="h-3 w-3" />
                  Tasks: <span className="font-semibold text-foreground">{stats.tasks}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Video className="h-3 w-3" />
                  Meetings: <span className="font-semibold text-foreground">{stats.meetings}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Content: <span className="font-semibold text-foreground">{stats.content}</span>
                </span>
                {stats.deadlines > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertTriangle className="h-3 w-3" />
                    Deadlines: <span className="font-semibold">{stats.deadlines}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((b) => {
                const colors = b.colors as Array<{ name: string; hex: string }> | null
                const dotColor = colors?.[0]?.hex
                return (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="flex items-center gap-2">
                      {dotColor && (
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                      )}
                      {b.name}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* ─── Navigation + View Switcher + Legend ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>
              Today
            </Button>
            <h3 className="text-lg font-semibold ml-2">{viewTitle}</h3>
          </div>

          <div className="flex items-center gap-4">
            {/* View switcher */}
            <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'day')}>
              <TabsList>
                <TabsTrigger value="month" className="text-xs px-3">
                  Month
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">
                  Week
                </TabsTrigger>
                <TabsTrigger value="day" className="text-xs px-3">
                  Day
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {Object.entries(CALENDAR_EVENT_STYLES).map(([type, style]) => {
                const Icon = LEGEND_ICONS[type as keyof typeof LEGEND_ICONS]
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span>{style.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ─── Main Content + Upcoming Panel ─── */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            {view === 'month' && (
              <MonthView
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                eventsByDate={eventsByDate}
                onEventDrop={handleEventDrop}
                onDayClick={handleDayClick}
                onQuickCreate={handleQuickCreate}
              />
            )}
            {view === 'week' && (
              <WeekView
                currentDate={currentDate}
                eventsByDate={eventsByDate}
                onEventDrop={handleEventDrop}
                onDayClick={handleDayClick}
                onQuickCreate={handleQuickCreate}
              />
            )}
            {view === 'day' && (
              <DayView
                date={selectedDate ?? currentDate}
                events={eventsByDate.get(formatDateKey(selectedDate ?? currentDate)) ?? []}
                onQuickCreate={handleQuickCreate}
              />
            )}
          </div>

          {/* Upcoming panel */}
          <UpcomingPanel events={events} />
        </div>
      </div>

      {/* Quick create dialog */}
      <QuickCreateDialog
        open={quickCreateOpen}
        onOpenChange={setQuickCreateOpen}
        defaultDate={quickCreateDate}
      />
    </>
  )
}
