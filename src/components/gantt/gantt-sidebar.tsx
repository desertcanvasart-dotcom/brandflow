'use client'

import { memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TASK_STATUS_COLORS } from '@/lib/constants'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TimelineTask } from './gantt-types'
import { PRIORITY_CONFIG } from './gantt-types'
import type { TaskStatus } from '@/types/enums'

interface BrandGroup {
  brandId: string
  brandName: string
  logoUrl: string | null
  projects: ProjectGroup[]
}

interface ProjectGroup {
  projectId: string
  projectName: string
  tasks: TimelineTask[]
}

interface GanttSidebarProps {
  brandGroups: BrandGroup[]
  collapsedBrands: Set<string>
  collapsedProjects: Set<string>
  onToggleBrand: (brandId: string) => void
  onToggleProject: (projectId: string) => void
  headerHeight: number
  rowHeight: number
  today: Date
}

export const GanttSidebar = memo(function GanttSidebar({
  brandGroups,
  collapsedBrands,
  collapsedProjects,
  onToggleBrand,
  onToggleProject,
  headerHeight,
  rowHeight,
  today,
}: GanttSidebarProps) {
  return (
    <div className="w-[300px] shrink-0 border-r bg-slate-50/80 relative z-10 overflow-y-auto">
      {/* Header spacer matching chart headers */}
      <div style={{ height: headerHeight }} className="border-b bg-slate-50/60 flex items-end px-3 pb-1">
        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider w-full">
          <span className="flex-1">Task</span>
          <span className="w-6 text-center">A</span>
          <span className="w-10 text-center">Status</span>
          <span className="w-6 text-center">P</span>
        </div>
      </div>

      {brandGroups.map((brand) => {
        const isBrandCollapsed = collapsedBrands.has(brand.brandId)
        const totalTasks = brand.projects.reduce((sum, p) => sum + p.tasks.length, 0)

        return (
          <div key={brand.brandId}>
            {/* Brand row */}
            <button
              onClick={() => onToggleBrand(brand.brandId)}
              className="w-full flex items-center gap-2 px-2 bg-slate-200/60 border-b hover:bg-slate-200/80 transition-colors"
              style={{ height: rowHeight }}
            >
              <ChevronRight
                className={cn(
                  'h-3 w-3 text-slate-400 transition-transform shrink-0',
                  !isBrandCollapsed && 'rotate-90'
                )}
              />
              <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary shrink-0">
                {brand.brandName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[11px] font-semibold text-slate-700 truncate flex-1 text-left">
                {brand.brandName}
              </span>
              <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                {totalTasks}
              </span>
            </button>

            {!isBrandCollapsed &&
              brand.projects.map((project) => {
                const isProjectCollapsed = collapsedProjects.has(project.projectId)

                return (
                  <div key={project.projectId}>
                    {/* Project row */}
                    <button
                      onClick={() => onToggleProject(project.projectId)}
                      className="w-full flex items-center gap-2 px-2 pl-5 bg-slate-100/80 border-b hover:bg-slate-100 transition-colors"
                      style={{ height: rowHeight }}
                    >
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 text-slate-400 transition-transform shrink-0',
                          !isProjectCollapsed && 'rotate-90'
                        )}
                      />
                      <span className="text-[11px] font-medium text-slate-600 truncate flex-1 text-left">
                        {project.projectName}
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                        {project.tasks.length}
                      </span>
                    </button>

                    {/* Task rows */}
                    {!isProjectCollapsed &&
                      project.tasks.map((task) => {
                        const isOverdue =
                          task.due_date &&
                          new Date(task.due_date) < today &&
                          task.status !== 'done' &&
                          task.status !== 'published'
                        const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[0]

                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-1.5 px-2 pl-9 border-b hover:bg-slate-50 transition-colors"
                            style={{ height: rowHeight }}
                          >
                            {/* Status dot */}
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: TASK_STATUS_COLORS[task.status as TaskStatus] }}
                            />
                            {/* Title */}
                            <span
                              className={cn(
                                'text-[11px] truncate flex-1',
                                isOverdue ? 'text-red-600' : 'text-slate-600'
                              )}
                              title={task.title}
                            >
                              {task.title}
                            </span>
                            {/* Assignee avatar */}
                            <div className="w-6 flex justify-center shrink-0">
                              {task.assignee ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
                                      {task.assignee.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    {task.assignee.display_name ?? 'Unassigned'}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="h-5 w-5 rounded-full border border-dashed border-slate-300" />
                              )}
                            </div>
                            {/* Status badge */}
                            <div className="w-10 flex justify-center shrink-0">
                              {isOverdue ? (
                                <span className="text-[9px] text-red-500 font-medium">overdue</span>
                              ) : (
                                <div
                                  className="h-1.5 w-6 rounded-full"
                                  style={{ backgroundColor: TASK_STATUS_COLORS[task.status as TaskStatus] }}
                                  title={task.status.replace(/_/g, ' ')}
                                />
                              )}
                            </div>
                            {/* Priority dot */}
                            <div className="w-6 flex justify-center shrink-0">
                              {task.priority > 0 && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: priorityCfg.dotColor }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    {priorityCfg.label}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
})
