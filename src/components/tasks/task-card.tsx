'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  GripVertical,
  Clock,
  Link2,
  AlertTriangle,
  Trash2,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROJECT_TASK_STATUSES, SERVICE_TYPE_LABELS, type ServiceType } from '@/types/enums'
import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']

const STATUS_OPTIONS = [
  { value: PROJECT_TASK_STATUSES.TODO, label: 'To Do', color: 'bg-slate-400' },
  {
    value: PROJECT_TASK_STATUSES.IN_PROGRESS,
    label: 'In Progress',
    color: 'bg-blue-500',
  },
  {
    value: PROJECT_TASK_STATUSES.IN_REVIEW,
    label: 'In Review',
    color: 'bg-purple-500',
  },
  { value: PROJECT_TASK_STATUSES.DONE, label: 'Done', color: 'bg-emerald-500' },
  {
    value: PROJECT_TASK_STATUSES.BLOCKED,
    label: 'Blocked',
    color: 'bg-red-500',
  },
] as const

interface TaskCardProps {
  task: TaskRow & {
    assignee?: {
      user_id: string
      display_name: string | null
      avatar_url: string | null
    } | null
  }
  members?: {
    user_id: string
    display_name: string | null
    avatar_url: string | null
  }[]
  isBlocked?: boolean
  blockReason?: string
  hasDependents?: boolean
  onUpdate: (
    id: string,
    updates: {
      status?: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
      assigneeId?: string | null
      dueDate?: string | null
      notes?: string | null
      estimatedHours?: number | null
      serviceType?: string | null
    }
  ) => void
  onDelete: (id: string) => void
  dragHandleProps?: Record<string, unknown>
}

export function TaskCard({
  task,
  members,
  isBlocked,
  blockReason,
  hasDependents,
  onUpdate,
  onDelete,
  dragHandleProps,
}: TaskCardProps) {
  const [showNotes, setShowNotes] = useState(false)

  const initials = task.assignee?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={cn(
        'group flex items-start gap-2 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/30',
        isBlocked && 'opacity-60'
      )}
    >
      {/* Drag handle */}
      <div
        className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        {...dragHandleProps}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{task.title}</span>
              {task.task_type && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {task.task_type}
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status select */}
          <Select
            value={task.status}
            onValueChange={(val) => onUpdate(task.id, { status: val as 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' })}
            disabled={isBlocked}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn('h-2 w-2 rounded-full', opt.color)}
                    />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Service Type */}
          <Select
            value={task.service_type ?? '_none'}
            onValueChange={(val) =>
              onUpdate(task.id, {
                serviceType: val === '_none' ? null : val,
              })
            }
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="No type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" className="text-xs">
                No type
              </SelectItem>
              {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Hours */}
          {task.estimated_hours != null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimated_hours}h
            </span>
          )}

          {/* Dependencies indicator */}
          {isBlocked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Blocked
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {blockReason ?? 'Waiting on dependencies'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {hasDependents && !isBlocked && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Other tasks depend on this</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <div className="flex-1" />

          {/* Due date */}
          <Input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) =>
              onUpdate(task.id, {
                dueDate: e.target.value || null,
              })
            }
            className="h-7 w-[130px] text-xs"
          />

          {/* Assignee select */}
          {members && (
            <Select
              value={task.assignee_id ?? '_unassigned'}
              onValueChange={(val) =>
                onUpdate(task.id, {
                  assigneeId: val === '_unassigned' ? null : val,
                })
              }
            >
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_unassigned" className="text-xs">
                  Unassigned
                </SelectItem>
                {members.map((m) => (
                  <SelectItem
                    key={m.user_id}
                    value={m.user_id}
                    className="text-xs"
                  >
                    {m.display_name ?? 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Assignee avatar (when no member list) */}
          {!members && task.assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  {task.assignee.display_name ?? 'Unassigned'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
