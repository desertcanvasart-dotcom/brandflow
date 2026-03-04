'use client'

import { useMemo, useRef, useEffect } from 'react'
import { trpc } from '@/trpc/client'
import { TASK_STATUS_LABELS } from '@/lib/constants'
import type { Database } from '@/types/database'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type TaskStatus = Database['public']['Enums']['task_status']

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#94a3b8',
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  in_review: '#f59e0b',
  client_review: '#a855f7',
  approved: '#10b981',
  scheduled: '#06b6d4',
  published: '#22c55e',
  blocked: '#ef4444',
  done: '#22c55e',
}

interface GanttChartProps {
  projects: (ProjectRow & { brands: { name: string; logo_url: string | null } })[]
  projectFilter: string
  viewMode: 'Day' | 'Week' | 'Month'
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function diffDays(a: Date, b: Date) {
  const aStart = startOfDay(a)
  const bStart = startOfDay(b)
  return Math.round((bStart.getTime() - aStart.getTime()) / (1000 * 60 * 60 * 24))
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function GanttChart({ projects, projectFilter, viewMode }: GanttChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  const filteredProjects = useMemo(
    () => projectFilter === 'all' ? projects : projects.filter((p) => p.id === projectFilter),
    [projects, projectFilter]
  )

  const projectIds = useMemo(
    () => filteredProjects.map((p) => p.id),
    [filteredProjects]
  )

  const { data: allTasks, isLoading } = trpc.task.listForTimeline.useQuery(
    { projectIds },
    { enabled: projectIds.length > 0 }
  )

  const projectTaskMap = useMemo(() => {
    const map: Record<string, typeof allTasks> = {}
    for (const task of allTasks ?? []) {
      if (!map[task.project_id]) map[task.project_id] = []
      map[task.project_id]!.push(task)
    }
    return map
  }, [allTasks])

  // Compute visible range based on view mode
  const { rangeStart, days } = useMemo(() => {
    const today = startOfDay(new Date())
    const tasks = allTasks ?? []

    let rStart: Date
    let rEnd: Date

    if (viewMode === 'Month') {
      rStart = new Date(today.getFullYear(), today.getMonth(), 1)
      rEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0)
    } else if (viewMode === 'Week') {
      rStart = addDays(today, -7)
      rEnd = addDays(today, 21)
    } else {
      rStart = addDays(today, -3)
      rEnd = addDays(today, 11)
    }

    // Expand if tasks go beyond
    for (const task of tasks) {
      const tStart = startOfDay(new Date(task.start_date || task.created_at.split('T')[0]))
      const tEnd = startOfDay(new Date(task.due_date || addDays(tStart, 3).toISOString().split('T')[0]))
      if (tStart < rStart) rStart = addDays(tStart, -2)
      if (tEnd > rEnd) rEnd = addDays(tEnd, 2)
    }

    const total = diffDays(rStart, rEnd) + 1
    const dayArray: Date[] = []
    for (let i = 0; i < total; i++) {
      dayArray.push(addDays(rStart, i))
    }
    return { rangeStart: rStart, days: dayArray }
  }, [allTasks, viewMode])

  const totalDays = days.length
  const today = startOfDay(new Date())

  // Auto-scroll to today on mount
  useEffect(() => {
    if (todayRef.current && chartRef.current) {
      const container = chartRef.current
      const todayEl = todayRef.current
      const containerRect = container.getBoundingClientRect()
      const todayRect = todayEl.getBoundingClientRect()
      const offset = todayRect.left - containerRect.left - containerRect.width / 3
      container.scrollLeft += offset
    }
  }, [days])

  // Month groupings for top header
  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = []
    let currentMonth = ''
    let currentSpan = 0
    for (const day of days) {
      const month = day.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (month !== currentMonth) {
        if (currentMonth) groups.push({ label: currentMonth, span: currentSpan })
        currentMonth = month
        currentSpan = 1
      } else {
        currentSpan++
      }
    }
    if (currentMonth) groups.push({ label: currentMonth, span: currentSpan })
    return groups
  }, [days])

  if (projectIds.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-16 bg-muted/10">
        <div className="text-center space-y-2">
          <h3 className="text-base font-semibold text-slate-700">No projects</h3>
          <p className="text-sm text-muted-foreground">
            Create active projects to see them on the timeline
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="h-16 animate-pulse bg-muted/40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse bg-muted/20 border-t" />
        ))}
      </div>
    )
  }

  if (!allTasks || allTasks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed p-16 bg-muted/10">
        <div className="text-center space-y-2">
          <h3 className="text-base font-semibold text-slate-700">No timeline data</h3>
          <p className="text-sm text-muted-foreground">
            Add tasks with due dates to your projects
          </p>
        </div>
      </div>
    )
  }

  const cellMinWidth = viewMode === 'Day' ? 56 : viewMode === 'Week' ? 32 : 20

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="flex">
        {/* ── Sidebar ── */}
        <div className="w-52 shrink-0 border-r bg-slate-50/80 relative z-10">
          <div className="h-8 border-b" />
          <div className="h-8 border-b" />
          {filteredProjects.map((project) => {
            const tasks = projectTaskMap[project.id] ?? []
            if (tasks.length === 0) return null
            return (
              <div key={project.id}>
                <div className="h-8 px-3 flex items-center gap-2 bg-slate-100/80 border-b">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary shrink-0">
                    {project.brands?.name?.charAt(0)?.toUpperCase() ?? 'P'}
                  </div>
                  <span className="text-[11px] font-semibold truncate text-slate-700">{project.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto tabular-nums">{tasks.length}</span>
                </div>
                {tasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < today &&
                    task.status !== 'done' && task.status !== 'published'
                  return (
                    <div key={task.id} className="h-9 px-3 flex items-center border-b hover:bg-slate-50 transition-colors">
                      <div className="h-2 w-2 rounded-full shrink-0 mr-2" style={{ backgroundColor: STATUS_COLORS[task.status] }} />
                      <span className="text-[11px] truncate text-slate-600" title={task.title}>{task.title}</span>
                      {isOverdue && <span className="text-[9px] text-red-500 font-medium ml-auto shrink-0">overdue</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* ── Chart ── */}
        <div className="flex-1 overflow-x-auto" ref={chartRef}>
          <div style={{ minWidth: `${totalDays * cellMinWidth}px` }}>
            {/* Month row */}
            <div className="h-8 flex border-b bg-slate-50/60">
              {monthGroups.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center text-[11px] font-semibold text-slate-500 border-r border-slate-200"
                  style={{ width: `${(g.span / totalDays) * 100}%` }}
                >
                  {g.label}
                </div>
              ))}
            </div>

            {/* Day row */}
            <div className="h-8 flex border-b">
              {days.map((day, i) => {
                const isToday = isSameDay(day, today)
                const isWkEnd = isWeekend(day)
                return (
                  <div
                    key={i}
                    ref={isToday ? todayRef : undefined}
                    className={`flex flex-col items-center justify-center border-r ${
                      isToday
                        ? 'bg-blue-500 text-white'
                        : isWkEnd
                          ? 'bg-slate-50 text-slate-400'
                          : 'text-slate-500'
                    }`}
                    style={{ width: `${(1 / totalDays) * 100}%`, minWidth: `${cellMinWidth}px` }}
                  >
                    <span className="text-[9px] leading-none">
                      {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </span>
                    <span className="text-[11px] leading-tight font-medium">
                      {day.getDate()}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Bar rows */}
            <div className="relative">
              {/* Grid + weekend shading */}
              <div className="absolute inset-0 flex pointer-events-none">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`border-r border-slate-100 ${
                      isSameDay(day, today) ? 'bg-blue-50/30' : isWeekend(day) ? 'bg-slate-50/30' : ''
                    }`}
                    style={{ width: `${(1 / totalDays) * 100}%`, minWidth: `${cellMinWidth}px` }}
                  />
                ))}
              </div>

              {/* Today line */}
              {(() => {
                const todayIdx = days.findIndex((d) => isSameDay(d, today))
                if (todayIdx < 0) return null
                return (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{ left: `${((todayIdx + 0.5) / totalDays) * 100}%` }}
                  >
                    <div className="w-0.5 h-full bg-blue-500/50 -translate-x-1/2" />
                  </div>
                )
              })()}

              {/* Project groups */}
              {filteredProjects.map((project) => {
                const tasks = projectTaskMap[project.id] ?? []
                if (tasks.length === 0) return null
                return (
                  <div key={project.id}>
                    <div className="h-8 border-b bg-slate-50/20" />
                    {tasks.map((task) => {
                      const taskStart = startOfDay(new Date(task.start_date || task.created_at.split('T')[0]))
                      const taskEnd = startOfDay(new Date(task.due_date || addDays(taskStart, 3).toISOString().split('T')[0]))
                      const startIdx = diffDays(rangeStart, taskStart)
                      const duration = Math.max(diffDays(taskStart, taskEnd), 1)
                      const leftPct = (startIdx / totalDays) * 100
                      const widthPct = (duration / totalDays) * 100
                      const color = STATUS_COLORS[task.status] ?? STATUS_COLORS.todo
                      const isOverdue = task.due_date && new Date(task.due_date) < today &&
                        task.status !== 'done' && task.status !== 'published'
                      const isDone = task.status === 'done' || task.status === 'published'

                      return (
                        <div key={task.id} className="h-9 border-b relative">
                          <div
                            className={`absolute top-1.5 h-6 rounded-[5px] flex items-center px-2 text-white text-[10px] font-medium truncate cursor-default transition-all hover:brightness-110 hover:shadow-md ${isDone ? 'opacity-60' : ''}`}
                            style={{
                              left: `${Math.max(leftPct, 0)}%`,
                              width: `${Math.max(widthPct, 1.5)}%`,
                              minWidth: '20px',
                              backgroundColor: color,
                              outline: isOverdue ? '2px solid rgba(239,68,68,0.5)' : undefined,
                              outlineOffset: '1px',
                            }}
                            title={`${task.title}\n${TASK_STATUS_LABELS[task.status]}\n${taskStart.toLocaleDateString()} → ${taskEnd.toLocaleDateString()}`}
                          >
                            <span className="truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                              {task.title}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
