'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Plus, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel'
import type { Database } from '@/types/database'

const PHASE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-yellow-100 text-yellow-700',
}

export function PhaseTracker({ projectId }: { projectId: string }) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: phases, isLoading: phasesLoading } = trpc.phase.list.useQuery({ projectId })
  const { data: allTasks } = trpc.task.list.useQuery({ projectId })

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
      toast.success('Task created')
    },
    onError: (err) => toast.error(err.message),
  })

  function togglePhase(phaseId: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  function getPhaseProgress(phaseId: string): number {
    const phaseTasks = allTasks?.filter((t) => t.phase_id === phaseId) ?? []
    if (phaseTasks.length === 0) return 0
    const done = phaseTasks.filter((t) => t.status === 'done' || t.status === 'approved').length
    return Math.round((done / phaseTasks.length) * 100)
  }

  function handleAddTask(phaseId: string) {
    const title = prompt('Task title:')
    if (!title?.trim()) return
    createTaskMutation.mutate({
      projectId,
      phaseId,
      title,
      deliverableType: 'document',
    })
  }

  if (phasesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-6 w-32 rounded bg-muted" />
              <div className="mt-3 h-2 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {phases && phases.length > 0 ? (
          phases.map((phase) => {
            const isExpanded = expandedPhases.has(phase.id)
            const phaseTasks = allTasks?.filter((t) => t.phase_id === phase.id) ?? []
            const progress = getPhaseProgress(phase.id)

            return (
              <Card key={phase.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => togglePhase(phase.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-base">{phase.name}</CardTitle>
                      <Badge className={`text-xs ${PHASE_STATUS_COLORS[phase.status] ?? ''}`}>
                        {phase.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {phase.milestone_name && (
                        <span className="text-xs text-muted-foreground">
                          {phase.milestone_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {phaseTasks.length} tasks
                      </span>
                    </div>
                  </div>
                  <Progress value={progress} className="h-1.5 mt-2" />
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    {phase.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {phase.description}
                      </p>
                    )}

                    <div className="space-y-2">
                      {phaseTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-md border p-2 cursor-pointer hover:bg-accent/50"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: TASK_STATUS_COLORS[task.status] }}
                            />
                            <span className="text-sm">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {TASK_STATUS_LABELS[task.status]}
                            </Badge>
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddTask(phase.id)
                      }}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Add Task
                    </Button>
                  </CardContent>
                )}
              </Card>
            )
          })
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <h3 className="text-lg font-medium">No phases yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Phases will be auto-created from the workflow template
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  )
}
