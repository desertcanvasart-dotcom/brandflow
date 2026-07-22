'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'

interface TaskGenerationResultProps {
  briefId: string
  projectId: string
}

interface TaskEntry {
  phase_name: string
  task_name: string
  type: string
  estimated_hours: number
  include: boolean
  reason: string
}

export function TaskGenerationResult({ briefId, projectId }: TaskGenerationResultProps) {
  const [open, setOpen] = useState(false)
  const { data: log, isLoading } = trpc.intake.getTaskGenerationLog.useQuery({ briefId })

  if (isLoading || !log) return null

  const included = (log.included_tasks as unknown as TaskEntry[]) ?? []
  const excluded = (log.excluded_tasks as unknown as TaskEntry[]) ?? []

  if (included.length === 0 && excluded.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full text-left">
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Generated Tasks ({included.length} included, {excluded.length} excluded)
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4">
        {/* Included tasks */}
        {included.length > 0 && (
          <div className="space-y-1.5">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Included
            </h5>
            {included.map((task, i) => (
              <div key={i} className="flex items-start gap-2 text-sm border-l-2 border-green-400 pl-3 py-1">
                <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{task.task_name}</span>
                    <Badge variant="outline" className="text-[10px]">{task.phase_name}</Badge>
                    {task.estimated_hours > 0 && (
                      <span className="text-xs text-muted-foreground">~{task.estimated_hours}h</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Excluded tasks */}
        {excluded.length > 0 && (
          <div className="space-y-1.5">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Excluded
            </h5>
            {excluded.map((task, i) => (
              <ExcludedTaskRow key={i} task={task} projectId={projectId} />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function ExcludedTaskRow({
  task,
  projectId,
}: {
  task: TaskEntry
  projectId: string
}) {
  const [added, setAdded] = useState(false)

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      setAdded(true)
      toast.success(`Task "${task.task_name}" added`)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleAdd = () => {
    createMutation.mutate({
      projectId,
      title: task.task_name,
      description: `[${task.phase_name}] ${task.type ?? ''} — Manually added from excluded AI suggestions`,
      estimatedHours: task.estimated_hours,
      tags: [task.phase_name.toLowerCase(), task.type].filter(Boolean),
    })
  }

  return (
    <div className="flex items-start gap-2 text-sm border-l-2 border-red-300 pl-3 py-1">
      <X className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">{task.task_name}</span>
          <Badge variant="outline" className="text-[10px]">{task.phase_name}</Badge>
          {task.estimated_hours > 0 && (
            <span className="text-xs text-muted-foreground">~{task.estimated_hours}h</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{task.reason}</p>
      </div>
      {!added ? (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-7 text-xs"
          onClick={handleAdd}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </>
          )}
        </Button>
      ) : (
        <Badge variant="secondary" className="text-[10px] shrink-0">Added</Badge>
      )}
    </div>
  )
}
