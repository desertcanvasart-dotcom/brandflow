'use client'

import { memo } from 'react'
import { isSameDay, isWeekend, getMonthGroups, getWeekGroups } from './gantt-utils'
import type { ViewMode } from './gantt-types'

interface GanttHeaderProps {
  days: Date[]
  today: Date
  viewMode: ViewMode
  cellWidth: number
  todayRef: React.RefObject<HTMLDivElement | null>
}

export const GanttHeader = memo(function GanttHeader({
  days,
  today,
  viewMode,
  cellWidth,
  todayRef,
}: GanttHeaderProps) {
  const totalDays = days.length
  const monthGroups = getMonthGroups(days)
  const showWeekRow = viewMode === 'Quarter'
  const weekGroups = showWeekRow ? getWeekGroups(days) : []

  return (
    <div className="sticky top-0 z-20 bg-white">
      {/* Month row */}
      <div className="h-8 flex border-b bg-slate-50/60">
        {monthGroups.map((g, i) => (
          <div
            key={i}
            className="flex items-center justify-center text-[11px] font-semibold text-slate-500 border-r border-slate-200"
            style={{ width: `${g.span * cellWidth}px` }}
          >
            {g.label}
          </div>
        ))}
      </div>

      {/* Day/Week sub-header row */}
      <div className="h-8 flex border-b">
        {showWeekRow
          ? weekGroups.map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-center text-[10px] font-medium text-slate-400 border-r border-slate-100"
                style={{ width: `${g.span * cellWidth}px` }}
              >
                {g.label}
              </div>
            ))
          : days.map((day, i) => {
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
                  style={{ width: `${cellWidth}px` }}
                >
                  <span className="text-[9px] leading-none">
                    {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                  <span className="text-[11px] leading-tight font-medium">{day.getDate()}</span>
                </div>
              )
            })}
      </div>
    </div>
  )
})
