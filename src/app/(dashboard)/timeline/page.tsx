'use client'

import { useMemo, useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { trpc } from '@/trpc/client'
import { GanttChart } from '@/components/gantt/gantt-chart'
import { GanttToolbar } from '@/components/gantt/gantt-toolbar'
import { useGanttStore } from '@/stores/gantt-store'
import type { ViewMode } from '@/components/gantt/gantt-types'
import { Diamond } from 'lucide-react'

export default function TimelinePage() {
  const {
    zoomLevel,
    setZoomLevel,
    filters,
    setFilters,
    resetFilters,
    collapsedBrands,
    collapsedProjects,
    toggleBrand,
    toggleProject,
  } = useGanttStore()

  // We store viewMode in local state so it doesn't need to persist across sessions
  const [viewMode, setViewMode] = useState<ViewMode>('Month')

  const { data: projects, isLoading } = trpc.project.list.useQuery({
    status: 'active',
  })

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: membersRaw } = trpc.member.list.useQuery()

  const members = useMemo(
    () =>
      (membersRaw ?? []).map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
      })),
    [membersRaw]
  )

  const brandOptions = useMemo(
    () => (brands ?? []).map((b) => ({ id: b.id, name: b.name })),
    [brands]
  )

  const projectOptions = useMemo(
    () => (projects ?? []).map((p) => ({ id: p.id, name: p.name })),
    [projects]
  )

  const hasActiveFilters =
    filters.brandIds.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0

  return (
    <>
      <TopBar title="Timeline" />
      <div className="flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Visualize tasks across brands and projects
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <GanttToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          zoomLevel={zoomLevel}
          onZoomChange={setZoomLevel}
          filters={filters}
          onFiltersChange={setFilters}
          onResetFilters={resetFilters}
          brands={brandOptions}
          projects={projectOptions}
          members={members}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
          {[
            { color: '#3b82f6', label: 'In Progress' },
            { color: '#f59e0b', label: 'In Review' },
            { color: '#a855f7', label: 'Client Review' },
            { color: '#22c55e', label: 'Done' },
            { color: '#ef4444', label: 'Blocked' },
            { color: '#94a3b8', label: 'Other' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pl-2 border-l">
            <div className="h-3.5 w-0.5 bg-blue-500 rounded-full" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l">
            <Diamond className="h-3 w-3 fill-amber-400 text-amber-500" />
            <span>Milestone</span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l text-muted-foreground/60">
            <span>Double-click chart to add task</span>
          </div>
        </div>

        {/* Chart */}
        {isLoading ? (
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="h-16 animate-pulse bg-muted/40" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse bg-muted/20 border-t" />
            ))}
          </div>
        ) : (
          <GanttChart
            projects={projects ?? []}
            viewMode={viewMode}
            zoomLevel={zoomLevel}
            filters={filters}
            collapsedBrands={collapsedBrands}
            collapsedProjects={collapsedProjects}
            onToggleBrand={toggleBrand}
            onToggleProject={toggleProject}
            members={members}
          />
        )}
      </div>
    </>
  )
}

