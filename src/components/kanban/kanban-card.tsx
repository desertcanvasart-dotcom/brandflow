'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']
type MemberRow = Database['public']['Tables']['organization_members']['Row']

interface KanbanCardProps {
  task: TaskRow
  members?: MemberRow[]
  onClick?: () => void
  isOverlay?: boolean
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Low', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  2: { label: 'Medium', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  3: { label: 'High', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  4: { label: 'Urgent', color: 'bg-red-50 text-red-600 border-red-200' },
}

export function KanbanCard({ task, members, onClick, isOverlay }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const assignee = members?.find((m) => m.user_id === task.assignee_id)
  const priorityCfg = PRIORITY_CONFIG[task.priority]

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group rounded-lg border bg-card p-3 shadow-sm transition-all cursor-pointer
        ${isDragging ? 'opacity-30' : ''}
        ${isOverlay ? 'shadow-lg ring-2 ring-primary/20 rotate-2' : ''}
        ${!isDragging && !isOverlay ? 'hover:shadow-md hover:border-primary/30' : ''}
      `}
    >
      <p className="text-sm font-medium leading-snug text-foreground">
        {task.title}
      </p>

      {(task.priority > 0 || (task.tags && task.tags.length > 0)) && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {priorityCfg && (
            <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${priorityCfg.color}`}>
              {priorityCfg.label}
            </Badge>
          )}
          {task.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[11px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {(task.tags?.length ?? 0) > 2 && (
            <span className="text-[11px] text-muted-foreground">
              +{(task.tags?.length ?? 0) - 2}
            </span>
          )}
        </div>
      )}

      {(task.due_date || assignee) && (
        <div className="mt-2.5 flex items-center justify-between">
          {task.due_date ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </span>
          ) : (
            <span />
          )}
          {assignee && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  {assignee.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{assignee.display_name}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}
