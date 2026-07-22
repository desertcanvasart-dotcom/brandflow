'use client'

import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { trpc } from '@/trpc/client'
import { TASK_STATUS_COLORS } from '@/lib/constants'
import { TooltipProvider } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import type { Database } from '@/types/database'
import type { TimelineTask, TimelineMilestone, ViewMode, GanttFilters, TaskPosition } from './gantt-types'
import {
  startOfDay,
  isSameDay,
  isWeekend,
  diffDays,
  addDays,
  getCellWidth,
  computeDateRange,
} from './gantt-utils'
import { GanttSidebar } from './gantt-sidebar'
import { GanttHeader } from './gantt-header'
import { GanttBar } from './gantt-bar'
import { GanttDependencyLayer } from './gantt-dependency-layer'
import { GanttMilestone } from './gantt-milestone'
import { GanttQuickCreate } from './gantt-quick-create'

type ProjectRow = Database['public']['Tables']['projects']['Row']

interface GanttChartProps {
  projects: (ProjectRow & { brands: { name: string; logo_url: string | null } })[]
  viewMode: ViewMode
  zoomLevel: number
  filters: GanttFilters
  collapsedBrands: Set<string>
  collapsedProjects: Set<string>
  onToggleBrand: (brandId: string) => void
  onToggleProject: (projectId: string) => void
  members: { user_id: string; display_name: string | null }[]
}

const ROW_HEIGHT = 32
const HEADER_HEIGHT = 64

interface BrandGroup {
  brandId: string
  brandName: string
  logoUrl: string | null
  projects: {
    projectId: string
    projectName: string
    tasks: TimelineTask[]
  }[]
}

export function GanttChart({
  projects,
  viewMode,
  zoomLevel,
  filters,
  collapsedBrands,
  collapsedProjects,
  onToggleBrand,
  onToggleProject,
  members,
}: GanttChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects])

  const { data: allTasks, isLoading } = trpc.task.listForTimeline.useQuery(
    { projectIds },
    { enabled: projectIds.length > 0 }
  )

  const { data: milestones } = trpc.phase.listMilestones.useQuery(
    { projectIds },
    { enabled: projectIds.length > 0 }
  )

  const utils = trpc.useUtils()

  // Apply client-side filters
  const filteredTasks = useMemo(() => {
    let tasks = allTasks ?? []

    if (filters.brandIds.length > 0) {
      tasks = tasks.filter((t) => filters.brandIds.includes(t.projects.brands.id))
    }
    if (filters.projectIds.length > 0) {
      tasks = tasks.filter((t) => filters.projectIds.includes(t.project_id))
    }
    if (filters.assigneeIds.length > 0) {
      tasks = tasks.filter(
        (t) => t.assignee_id && filters.assigneeIds.includes(t.assignee_id)
      )
    }
    if (filters.statuses.length > 0) {
      tasks = tasks.filter((t) => filters.statuses.includes(t.status))
    }
    if (filters.priorities.length > 0) {
      tasks = tasks.filter((t) => filters.priorities.includes(t.priority))
    }

    return tasks
  }, [allTasks, filters])

  // Build Brand > Project > Task hierarchy
  const brandGroups = useMemo<BrandGroup[]>(() => {
    const brandMap = new Map<string, BrandGroup>()

    for (const task of filteredTasks) {
      const brandId = task.projects.brands.id
      const brandName = task.projects.brands.name
      const logoUrl = task.projects.brands.logo_url

      if (!brandMap.has(brandId)) {
        brandMap.set(brandId, { brandId, brandName, logoUrl, projects: [] })
      }

      const brand = brandMap.get(brandId)!
      let project = brand.projects.find((p) => p.projectId === task.project_id)
      if (!project) {
        project = { projectId: task.project_id, projectName: task.projects.name, tasks: [] }
        brand.projects.push(project)
      }
      project.tasks.push(task)
    }

    return Array.from(brandMap.values()).sort((a, b) =>
      a.brandName.localeCompare(b.brandName)
    )
  }, [filteredTasks])

  // Compute visible rows (for chart area alignment with sidebar)
  const visibleRows = useMemo(() => {
    const rows: {
      type: 'brand' | 'project' | 'task'
      id: string
      task?: TimelineTask
      projectId?: string
    }[] = []

    for (const brand of brandGroups) {
      rows.push({ type: 'brand', id: brand.brandId })
      if (collapsedBrands.has(brand.brandId)) continue

      for (const project of brand.projects) {
        rows.push({ type: 'project', id: project.projectId })
        if (collapsedProjects.has(project.projectId)) continue

        for (const task of project.tasks) {
          rows.push({ type: 'task', id: task.id, task, projectId: project.projectId })
        }
      }
    }

    return rows
  }, [brandGroups, collapsedBrands, collapsedProjects])

  // Compute date range
  const { rangeStart, days } = useMemo(
    () => computeDateRange(viewMode, filteredTasks),
    [filteredTasks, viewMode]
  )

  const today = startOfDay(new Date())
  const cellWidth = getCellWidth(viewMode, zoomLevel)
  const totalWidth = days.length * cellWidth

  // Auto-scroll to today
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

  // Compute task positions for bars and dependencies
  const taskPositions = useMemo(() => {
    const positions = new Map<string, TaskPosition>()
    let yOffset = 0

    for (const row of visibleRows) {
      if (row.type === 'task' && row.task) {
        const task = row.task
        const taskStart = startOfDay(
          new Date(task.start_date || task.created_at.split('T')[0])
        )
        const taskEnd = startOfDay(
          new Date(task.due_date || addDays(taskStart, 3).toISOString().split('T')[0])
        )
        const startIdx = diffDays(rangeStart, taskStart)
        const duration = Math.max(diffDays(taskStart, taskEnd), 1)

        positions.set(task.id, {
          x: startIdx * cellWidth,
          y: yOffset + 2,
          width: duration * cellWidth,
          height: 28,
        })
      }
      yOffset += ROW_HEIGHT
    }

    return positions
  }, [visibleRows, rangeStart, cellWidth])

  // Drag-and-drop date change with optimistic updates
  const updateDatesMutation = trpc.task.update.useMutation({
    onMutate: async ({ id, startDate, dueDate }) => {
      await utils.task.listForTimeline.cancel({ projectIds })
      const previousData = utils.task.listForTimeline.getData({ projectIds })

      if (previousData) {
        const updated = previousData.map((t) =>
          t.id === id
            ? { ...t, start_date: startDate ?? t.start_date, due_date: dueDate ?? t.due_date }
            : t
        )
        utils.task.listForTimeline.setData({ projectIds }, updated as typeof previousData)
      }
      return { previousData }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        utils.task.listForTimeline.setData({ projectIds }, context.previousData)
      }
      toast.error('Failed to update task dates')
    },
    onSettled: () => {
      utils.task.listForTimeline.invalidate({ projectIds })
    },
  })

  const handleDateChange = useCallback(
    (taskId: string, startDate: string, dueDate: string) => {
      updateDatesMutation.mutate({ id: taskId, startDate, dueDate })
    },
    [updateDatesMutation]
  )

  // Quick create state
  const [quickCreate, setQuickCreate] = useState<{
    projectId: string
    projectName: string
    startDate: string
  } | null>(null)

  const handleChartDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const chartArea = chartRef.current
      if (!chartArea) return

      const rect = chartArea.getBoundingClientRect()
      const scrollLeft = chartArea.scrollLeft
      const x = e.clientX - rect.left + scrollLeft
      const y = e.clientY - rect.top

      // Find which row was clicked
      const rowIndex = Math.floor((y - HEADER_HEIGHT) / ROW_HEIGHT)
      if (rowIndex < 0 || rowIndex >= visibleRows.length) return

      // Find nearest project context
      let projectId = ''
      let projectName = ''
      for (let i = rowIndex; i >= 0; i--) {
        const row = visibleRows[i]
        if (row.type === 'project') {
          projectId = row.id
          const project = projects.find((p) => p.id === row.id)
          projectName = project?.name ?? ''
          break
        }
        if (row.type === 'task' && row.projectId) {
          projectId = row.projectId
          const project = projects.find((p) => p.id === row.projectId)
          projectName = project?.name ?? ''
          break
        }
      }

      if (!projectId) return

      const dayIndex = Math.floor(x / cellWidth)
      const clickDate = addDays(rangeStart, dayIndex)
      const dateStr = clickDate.toISOString().split('T')[0]

      setQuickCreate({ projectId, projectName, startDate: dateStr })
    },
    [visibleRows, projects, cellWidth, rangeStart]
  )

  // Milestone Y positions
  const milestonePositions = useMemo(() => {
    const positions: { milestone: TimelineMilestone; yOffset: number }[] = []
    if (!milestones) return positions

    for (const ms of milestones) {
      let yOffset = 0
      for (const row of visibleRows) {
        if (row.type === 'project' && row.id === ms.project_id) {
          positions.push({ milestone: ms, yOffset })
          break
        }
        yOffset += ROW_HEIGHT
      }
    }

    return positions
  }, [milestones, visibleRows])

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

  const todayIdx = days.findIndex((d) => isSameDay(d, today))

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <GanttSidebar
            brandGroups={brandGroups}
            collapsedBrands={collapsedBrands}
            collapsedProjects={collapsedProjects}
            onToggleBrand={onToggleBrand}
            onToggleProject={onToggleProject}
            headerHeight={HEADER_HEIGHT}
            rowHeight={ROW_HEIGHT}
            today={today}
          />

          {/* Chart area */}
          <div
            className="flex-1 overflow-x-auto overflow-y-hidden"
            ref={chartRef}
            onDoubleClick={handleChartDoubleClick}
          >
            <div style={{ width: `${totalWidth}px` }}>
              {/* Header */}
              <GanttHeader
                days={days}
                today={today}
                viewMode={viewMode}
                cellWidth={cellWidth}
                todayRef={todayRef}
              />

              {/* Chart body */}
              <div className="relative">
                {/* Grid + weekend shading */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={`border-r border-slate-100 ${
                        isSameDay(day, today)
                          ? 'bg-blue-50/40'
                          : isWeekend(day)
                            ? 'bg-slate-50/30'
                            : ''
                      }`}
                      style={{ width: `${cellWidth}px` }}
                    />
                  ))}
                </div>

                {/* Today line with label */}
                {todayIdx >= 0 && (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{ left: `${(todayIdx + 0.5) * cellWidth}px` }}
                  >
                    <div className="w-0.5 h-full bg-blue-500 -translate-x-1/2" />
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-b-md whitespace-nowrap">
                      Today
                    </div>
                  </div>
                )}

                {/* Dependency arrows */}
                <GanttDependencyLayer
                  tasks={filteredTasks}
                  taskPositions={taskPositions}
                />

                {/* Milestones */}
                {milestonePositions.map(({ milestone, yOffset }) => (
                  <GanttMilestone
                    key={milestone.id}
                    milestone={milestone}
                    rangeStart={rangeStart}
                    cellWidth={cellWidth}
                    yOffset={yOffset}
                    rowHeight={ROW_HEIGHT}
                  />
                ))}

                {/* Row backgrounds + task bars */}
                {visibleRows.map((row) => {
                  if (row.type === 'brand') {
                    return (
                      <div
                        key={`row-${row.id}`}
                        className="border-b bg-slate-100/30"
                        style={{ height: ROW_HEIGHT }}
                      />
                    )
                  }

                  if (row.type === 'project') {
                    return (
                      <div
                        key={`row-${row.id}`}
                        className="border-b bg-slate-50/20"
                        style={{ height: ROW_HEIGHT }}
                      />
                    )
                  }

                  const task = row.task!
                  const pos = taskPositions.get(task.id)

                  return (
                    <div
                      key={`row-${row.id}`}
                      className="border-b relative"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {pos && (
                        <GanttBar
                          task={task}
                          leftPx={pos.x}
                          widthPx={pos.width}
                          cellWidth={cellWidth}
                          today={today}
                          onDateChange={handleDateChange}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick create dialog */}
      {quickCreate && (
        <GanttQuickCreate
          open={!!quickCreate}
          onOpenChange={(open) => !open && setQuickCreate(null)}
          projectId={quickCreate.projectId}
          projectName={quickCreate.projectName}
          startDate={quickCreate.startDate}
          members={members}
          onCreated={() => utils.task.listForTimeline.invalidate({ projectIds })}
        />
      )}
    </TooltipProvider>
  )
}
