'use client'

import { memo, useMemo } from 'react'
import type { TimelineTask, TaskPosition } from './gantt-types'
import { computeDependencyPath } from './gantt-utils'

interface GanttDependencyLayerProps {
  tasks: TimelineTask[]
  taskPositions: Map<string, TaskPosition>
}

export const GanttDependencyLayer = memo(function GanttDependencyLayer({
  tasks,
  taskPositions,
}: GanttDependencyLayerProps) {
  const paths = useMemo(() => {
    const result: { d: string; key: string }[] = []

    for (const task of tasks) {
      if (!task.depends_on || task.depends_on.length === 0) continue

      const to = taskPositions.get(task.id)
      if (!to) continue

      for (const depId of task.depends_on) {
        const from = taskPositions.get(depId)
        if (!from) continue

        result.push({
          key: `${depId}-${task.id}`,
          d: computeDependencyPath(
            from.x,
            from.y,
            from.width,
            from.height,
            to.x,
            to.y,
            to.height
          ),
        })
      }
    }

    return result
  }, [tasks, taskPositions])

  if (paths.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible', zIndex: 5 }}
    >
      <defs>
        <marker
          id="gantt-arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
          markerEnd="url(#gantt-arrowhead)"
          strokeDasharray="4 2"
        />
      ))}
    </svg>
  )
})
