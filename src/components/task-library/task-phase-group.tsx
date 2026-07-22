import type { Database } from '@/types/database'
import { TaskTypeBadge } from './task-type-badge'

type TemplateRow = Database['public']['Tables']['task_templates']['Row']

interface TaskPhaseGroupProps {
  phaseName: string
  tasks: TemplateRow[]
}

export function TaskPhaseGroup({ phaseName, tasks }: TaskPhaseGroupProps) {
  return (
    <div>
      {/* Phase header */}
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
          {phaseName}
        </h3>
        <span className="text-xs text-muted-foreground">
          &mdash; {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Task table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 border-b bg-muted/50">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Task
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-28">
            Type
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-14">
            Est.
          </span>
        </div>

        {/* Task rows */}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{task.task_name}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-end w-28">
              <TaskTypeBadge type={task.type} />
            </div>
            <div className="flex items-center justify-end w-14">
              <span className="text-sm text-muted-foreground tabular-nums">
                {task.estimated_hours ? `${Number(task.estimated_hours)}h` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
