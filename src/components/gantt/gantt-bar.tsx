'use client'

import { memo, useState, useCallback } from 'react'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/constants'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TimelineTask } from './gantt-types'
import { PRIORITY_CONFIG } from './gantt-types'
import { formatDate, startOfDay, diffDays, addDays } from './gantt-utils'
import type { TaskStatus } from '@/types/enums'

interface GanttBarProps {
  task: TimelineTask
  leftPx: number
  widthPx: number
  cellWidth: number
  today: Date
  onDateChange?: (taskId: string, startDate: string, dueDate: string) => void
}

export const GanttBar = memo(function GanttBar({
  task,
  leftPx,
  widthPx,
  cellWidth,
  today,
  onDateChange,
}: GanttBarProps) {
  const [dragState, setDragState] = useState<{
    mode: 'move' | 'resize-end'
    initialX: number
    deltaPx: number
    deltaWidthPx: number
  } | null>(null)

  const color = TASK_STATUS_COLORS[task.status as TaskStatus] ?? TASK_STATUS_COLORS.todo
  const isDone = task.status === 'done' || task.status === 'published'
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < today &&
    !isDone

  const taskStart = startOfDay(new Date(task.start_date || task.created_at.split('T')[0]))
  const taskEnd = startOfDay(new Date(task.due_date || addDays(taskStart, 3).toISOString().split('T')[0]))
  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[0]

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, mode: 'move' | 'resize-end') => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragState({
        mode,
        initialX: e.clientX,
        deltaPx: 0,
        deltaWidthPx: 0,
      })
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return
      const deltaX = e.clientX - dragState.initialX
      if (dragState.mode === 'move') {
        setDragState((prev) => (prev ? { ...prev, deltaPx: deltaX } : null))
      } else {
        setDragState((prev) => (prev ? { ...prev, deltaWidthPx: deltaX } : null))
      }
    },
    [dragState]
  )

  const handlePointerUp = useCallback(() => {
    if (!dragState || !onDateChange) {
      setDragState(null)
      return
    }

    if (dragState.mode === 'move') {
      const deltaDays = Math.round(dragState.deltaPx / cellWidth)
      if (deltaDays !== 0) {
        const newStart = addDays(taskStart, deltaDays)
        const newEnd = addDays(taskEnd, deltaDays)
        onDateChange(task.id, newStart.toISOString().split('T')[0], newEnd.toISOString().split('T')[0])
      }
    } else {
      const deltaDays = Math.round(dragState.deltaWidthPx / cellWidth)
      if (deltaDays !== 0) {
        const newEnd = addDays(taskEnd, deltaDays)
        if (diffDays(taskStart, newEnd) >= 1) {
          onDateChange(task.id, taskStart.toISOString().split('T')[0], newEnd.toISOString().split('T')[0])
        }
      }
    }

    setDragState(null)
  }, [dragState, onDateChange, cellWidth, task.id, taskStart, taskEnd])

  const currentLeft = leftPx + (dragState?.deltaPx ?? 0)
  const currentWidth = Math.max(widthPx + (dragState?.deltaWidthPx ?? 0), cellWidth)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`absolute top-1 flex items-center rounded-md text-white text-[10px] font-medium cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg ${isDone ? 'opacity-50' : ''}`}
          style={{
            left: `${Math.max(currentLeft, 0)}px`,
            width: `${Math.max(currentWidth, 20)}px`,
            height: '28px',
            backgroundColor: color,
            outline: isOverdue ? '2px solid rgba(239,68,68,0.5)' : undefined,
            outlineOffset: '1px',
            zIndex: dragState ? 30 : undefined,
          }}
          onPointerDown={(e) => handlePointerDown(e, 'move')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Left content */}
          <div className="flex items-center gap-1 px-2 min-w-0 flex-1 overflow-hidden">
            {task.assignee && (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[8px] font-bold shrink-0">
                {task.assignee.display_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
              {task.title}
            </span>
          </div>

          {/* Right resize handle */}
          <div
            className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-white/20 rounded-r-md"
            onPointerDown={(e) => handlePointerDown(e, 'resize-end')}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs p-3 space-y-1.5"
        sideOffset={8}
      >
        <p className="font-semibold text-sm">{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{TASK_STATUS_LABELS[task.status as TaskStatus]}</span>
          {task.priority > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <span className={priorityCfg.color}>{priorityCfg.label}</span>
            </>
          )}
        </div>
        {task.assignee && (
          <p className="text-xs text-muted-foreground">
            Assigned to: {task.assignee.display_name ?? 'Unknown'}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {formatDate(taskStart)} &rarr; {formatDate(taskEnd)}
        </p>
        {isOverdue && (
          <p className="text-xs text-red-500 font-medium">Overdue</p>
        )}
      </TooltipContent>
    </Tooltip>
  )
})
