'use client'

import { memo } from 'react'
import { Diamond } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { TimelineMilestone } from './gantt-types'
import { formatDate, startOfDay, diffDays } from './gantt-utils'

interface GanttMilestoneProps {
  milestone: TimelineMilestone
  rangeStart: Date
  cellWidth: number
  yOffset: number
  rowHeight: number
}

export const GanttMilestone = memo(function GanttMilestone({
  milestone,
  rangeStart,
  cellWidth,
  yOffset,
  rowHeight,
}: GanttMilestoneProps) {
  const milestoneDate = startOfDay(new Date(milestone.milestone_date))
  const dayOffset = diffDays(rangeStart, milestoneDate)
  const leftPx = (dayOffset + 0.5) * cellWidth

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute flex items-center justify-center pointer-events-auto cursor-default z-10"
          style={{
            left: `${leftPx}px`,
            top: `${yOffset}px`,
            height: `${rowHeight}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <Diamond className="h-4 w-4 fill-amber-400 text-amber-500 drop-shadow-sm" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-semibold">{milestone.milestone_name ?? 'Milestone'}</p>
        <p className="text-muted-foreground">{formatDate(milestoneDate)}</p>
      </TooltipContent>
    </Tooltip>
  )
})
