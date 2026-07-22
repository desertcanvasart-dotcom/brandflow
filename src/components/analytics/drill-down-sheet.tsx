'use client'

import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import type { TaskStatus } from '@/types/enums'
import { Calendar, ExternalLink } from 'lucide-react'

interface DrillDownFilter {
  status?: string
  assigneeId?: string
  projectId?: string
  label: string
}

interface DrillDownSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filter: DrillDownFilter | null
  brandId?: string
}

const PRIORITY_DOTS: Record<number, string> = {
  1: 'bg-blue-500',
  2: 'bg-amber-500',
  3: 'bg-orange-500',
  4: 'bg-red-500',
}

export function DrillDownSheet({ open, onOpenChange, filter, brandId }: DrillDownSheetProps) {
  const { data: tasks, isLoading } = trpc.analytics.drillDown.useQuery(
    {
      brandId,
      status: filter?.status,
      assigneeId: filter?.assigneeId,
      projectId: filter?.projectId,
    },
    { enabled: open && !!filter }
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{filter?.label ?? 'Tasks'}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Loading...' : `${tasks?.length ?? 0} tasks`}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <Link
                key={task.id}
                href={`/projects/${task.project_id}`}
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
              >
                {/* Priority dot */}
                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOTS[task.priority] ?? 'bg-slate-300'}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        borderColor: TASK_STATUS_COLORS[task.status as TaskStatus] ?? '#6B7280',
                        color: TASK_STATUS_COLORS[task.status as TaskStatus] ?? '#6B7280',
                      }}
                    >
                      {TASK_STATUS_LABELS[task.status as TaskStatus] ?? task.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {task.projects?.name}
                    </span>
                    {task.due_date && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </Link>
            ))
          ) : (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No tasks found for this filter.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
