'use client'

import { memo } from 'react'
import { Filter, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TASK_STATUS_LABELS } from '@/lib/constants'
import { PRIORITY_CONFIG } from './gantt-types'
import type { ViewMode, GanttFilters } from './gantt-types'
import type { TaskStatus } from '@/types/enums'

interface Brand {
  id: string
  name: string
}

interface Project {
  id: string
  name: string
}

interface Member {
  user_id: string
  display_name: string | null
}

interface GanttToolbarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  zoomLevel: number
  onZoomChange: (level: number) => void
  filters: GanttFilters
  onFiltersChange: (filters: Partial<GanttFilters>) => void
  onResetFilters: () => void
  brands: Brand[]
  projects: Project[]
  members: Member[]
  hasActiveFilters: boolean
}

export const GanttToolbar = memo(function GanttToolbar({
  viewMode,
  onViewModeChange,
  zoomLevel,
  onZoomChange,
  filters,
  onFiltersChange,
  onResetFilters,
  brands,
  projects,
  members,
  hasActiveFilters,
}: GanttToolbarProps) {
  const viewModes: ViewMode[] = ['Day', 'Week', 'Month', 'Quarter']

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* View mode toggle */}
      <div className="flex border rounded-lg p-0.5 bg-muted/30">
        {viewModes.map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'ghost'}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => onViewModeChange(mode)}
          >
            {mode}
          </Button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Filters */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />

        {/* Brand filter */}
        <Select
          value={filters.brandIds[0] ?? 'all'}
          onValueChange={(v) =>
            onFiltersChange({ brandIds: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="w-32 h-7 text-[11px]">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project filter */}
        <Select
          value={filters.projectIds[0] ?? 'all'}
          onValueChange={(v) =>
            onFiltersChange({ projectIds: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="w-36 h-7 text-[11px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assignee filter */}
        <Select
          value={filters.assigneeIds[0] ?? 'all'}
          onValueChange={(v) =>
            onFiltersChange({ assigneeIds: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="w-32 h-7 text-[11px]">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name ?? 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filters.statuses[0] ?? 'all'}
          onValueChange={(v) =>
            onFiltersChange({ statuses: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="w-28 h-7 text-[11px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select
          value={filters.priorities[0]?.toString() ?? 'all'}
          onValueChange={(v) =>
            onFiltersChange({
              priorities: v === 'all' ? [] : [parseInt(v)],
            })
          }
        >
          <SelectTrigger className="w-28 h-7 text-[11px]">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {[1, 2, 3, 4].map((p) => (
              <SelectItem key={p} value={p.toString()}>
                {PRIORITY_CONFIG[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            onClick={onResetFilters}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.25))}
          disabled={zoomLevel <= 0.5}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.25"
          value={zoomLevel}
          onChange={(e) => onZoomChange(parseFloat(e.target.value))}
          className="w-20 h-1.5 accent-primary"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.min(3, zoomLevel + 0.25))}
          disabled={zoomLevel >= 3}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground tabular-nums w-8">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>
    </div>
  )
})
