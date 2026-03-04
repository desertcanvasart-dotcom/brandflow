'use client'

import { useState, useMemo } from 'react'
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
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PLATFORM_LABELS } from '@/lib/constants'
import type { Database } from '@/types/database'

type TaskStatus = Database['public']['Enums']['task_status']
type ContentPlatform = Database['public']['Enums']['content_platform']

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const days: (Date | null)[] = []

  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function formatISO(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [brandFilter, setBrandFilter] = useState('all')

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: tasks } = trpc.calendar.getTasksByRange.useQuery({
    startDate,
    endDate,
    brandId: brandFilter === 'all' ? undefined : brandFilter,
  })

  const { data: contentItems } = trpc.calendar.getContentByRange.useQuery({
    startDate,
    endDate,
    brandId: brandFilter === 'all' ? undefined : brandFilter,
  })

  const days = useMemo(() => getMonthDays(year, month), [year, month])

  const tasksByDate = useMemo(() => {
    const map: Record<string, NonNullable<typeof tasks>> = {}
    for (const task of tasks ?? []) {
      if (!task.due_date) continue
      const dateKey = task.due_date.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(task)
    }
    return map
  }, [tasks])

  const contentByDate = useMemo(() => {
    const map: Record<string, NonNullable<typeof contentItems>> = {}
    for (const item of contentItems ?? []) {
      if (!item.scheduled_at) continue
      const dateKey = item.scheduled_at.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(item)
    }
    return map
  }, [contentItems])

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })
  const totalTasks = tasks?.length ?? 0
  const totalContent = contentItems?.length ?? 0

  return (
    <>
      <TopBar title="Calendar" />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
              <p className="text-sm text-muted-foreground">
                {totalTasks > 0 || totalContent > 0
                  ? [
                      totalTasks > 0 ? `${totalTasks} task${totalTasks !== 1 ? 's' : ''} due` : '',
                      totalContent > 0 ? `${totalContent} content item${totalContent !== 1 ? 's' : ''} scheduled` : '',
                    ].filter(Boolean).join(', ') + ' this month'
                  : 'No tasks or content this month'}
              </p>
            </div>
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month Nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={goToday}>
              Today
            </Button>
          </div>
          <h3 className="text-lg font-semibold">{monthName}</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Task due dates
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-sm bg-cyan-500" />
              Scheduled content
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-gray-50 text-center text-xs font-medium text-muted-foreground border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="min-h-[110px] border-t border-r bg-gray-50/40" />
              const dateKey = formatISO(day)
              const isToday = dateKey === formatISO(today)
              const dayTasks = tasksByDate[dateKey] ?? []
              const dayContent = contentByDate[dateKey] ?? []
              const totalDayItems = dayTasks.length + dayContent.length
              const maxVisible = 3

              return (
                <div
                  key={dateKey}
                  className={`min-h-[110px] border-t border-r p-1.5 transition-colors ${isToday ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground'
                    }`}>
                      {day.getDate()}
                    </span>
                    {totalDayItems > 0 && (
                      <span className="text-[10px] text-muted-foreground">{totalDayItems}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {/* Task items */}
                    {dayTasks.slice(0, maxVisible).map((task) => {
                      const color = TASK_STATUS_COLORS[task.status as TaskStatus]
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs truncate cursor-default hover:bg-accent/50"
                          title={`${task.title} — ${TASK_STATUS_LABELS[task.status as TaskStatus]} — ${task.projects?.name}`}
                        >
                          <div
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{task.title}</span>
                        </div>
                      )
                    })}
                    {/* Content items */}
                    {dayContent.slice(0, Math.max(0, maxVisible - dayTasks.length)).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs truncate cursor-default bg-cyan-50 hover:bg-cyan-100/70"
                        title={`${item.tasks?.title} — ${PLATFORM_LABELS[item.platform as ContentPlatform] ?? item.platform}`}
                      >
                        <div className="h-1.5 w-1.5 rounded-sm bg-cyan-500 shrink-0" />
                        <span className="truncate">{item.tasks?.title}</span>
                        <Badge variant="outline" className="ml-auto text-[8px] px-1 py-0 h-3.5 shrink-0">
                          {PLATFORM_LABELS[item.platform as ContentPlatform] ?? item.platform}
                        </Badge>
                      </div>
                    ))}
                    {totalDayItems > maxVisible && (
                      <p className="text-[10px] text-muted-foreground pl-1">
                        +{totalDayItems - maxVisible} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
