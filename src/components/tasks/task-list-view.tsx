'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Calendar } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { TaskDetailPanel } from './task-detail-panel'
import { CreateTaskDialog } from './create-task-dialog'

export function TaskListView({ projectId }: { projectId: string }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: tasks, isLoading } = trpc.task.list.useQuery({ projectId })
  const { data: members } = trpc.member.list.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
        {tasks && tasks.length > 0 ? (
          tasks.map((task) => {
            const assignee = members?.find((m) => m.user_id === task.assignee_id)
            return (
              <Card
                key={task.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: TASK_STATUS_COLORS[task.status] }}
                    />
                    <span className="text-sm font-medium">{task.title}</span>
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
                    {assignee && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {assignee.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <h3 className="text-lg font-medium">No tasks yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first task to get started
              </p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
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

      <CreateTaskDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
