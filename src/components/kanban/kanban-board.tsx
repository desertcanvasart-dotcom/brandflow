'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'
import { TaskDetailPanel } from '@/components/tasks/task-detail-panel'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']
type TaskStatus = Database['public']['Enums']['task_status']

const CONTENT_COLUMNS: TaskStatus[] = [
  'todo', 'in_progress', 'in_review', 'client_review', 'approved', 'done',
]

export function KanbanBoard({ projectId }: { projectId: string }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDefaultStatus, setCreateDefaultStatus] = useState<TaskStatus>('todo')

  const utils = trpc.useUtils()
  const { data: board, isLoading } = trpc.task.listByBoard.useQuery({ projectId })
  const { data: members } = trpc.member.list.useQuery()

  const reorderMutation = trpc.task.reorder.useMutation({
    onMutate: async ({ items }) => {
      await utils.task.listByBoard.cancel({ projectId })
      const previousBoard = utils.task.listByBoard.getData({ projectId })

      if (previousBoard) {
        const newBoard: Record<string, TaskRow[]> = {}
        for (const key of Object.keys(previousBoard)) {
          newBoard[key] = [...previousBoard[key]]
        }

        for (const item of items) {
          let task: TaskRow | undefined
          for (const key of Object.keys(newBoard)) {
            const idx = newBoard[key].findIndex((t) => t.id === item.id)
            if (idx !== -1) {
              task = newBoard[key][idx]
              newBoard[key].splice(idx, 1)
              break
            }
          }
          if (task) {
            const updated = { ...task, status: item.status as TaskRow['status'], sort_order: item.sortOrder }
            if (!newBoard[item.status]) newBoard[item.status] = []
            newBoard[item.status].push(updated)
          }
        }

        utils.task.listByBoard.setData({ projectId }, newBoard)
      }

      return { previousBoard }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousBoard) {
        utils.task.listByBoard.setData({ projectId }, context.previousBoard)
      }
      toast.error('Failed to move task')
    },
    onSettled: () => {
      utils.task.listByBoard.invalidate({ projectId })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = event.active.id as string
    if (!board) return
    for (const tasks of Object.values(board)) {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setActiveTask(task)
        break
      }
    }
  }, [board])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over || !board) return

    const taskId = active.id as string
    const overColumnId = over.data?.current?.columnId as string | undefined
    const targetStatus = overColumnId || (over.id as string)

    let currentStatus = ''
    for (const [status, tasks] of Object.entries(board)) {
      if (tasks.find((t) => t.id === taskId)) {
        currentStatus = status
        break
      }
    }

    if (currentStatus === targetStatus) return

    reorderMutation.mutate({
      items: [{ id: taskId, status: targetStatus, sortOrder: 0 }],
    })
  }, [board, reorderMutation])

  function handleAddTask(status: TaskStatus) {
    setCreateDefaultStatus(status)
    setCreateDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 px-1">
        {CONTENT_COLUMNS.map((col) => (
          <div key={col} className="w-[280px] shrink-0 animate-pulse">
            <div className="h-6 w-24 rounded bg-muted mb-3" />
            <div className="space-y-2">
              <div className="h-24 rounded-lg bg-muted" />
              <div className="h-24 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 px-1">
          {CONTENT_COLUMNS.map((status) => {
            const tasks = board?.[status] ?? []
            return (
              <KanbanColumn
                key={status}
                id={status}
                title={TASK_STATUS_LABELS[status]}
                color={TASK_STATUS_COLORS[status]}
                count={tasks.length}
                onAdd={() => handleAddTask(status)}
              >
                <SortableContext
                  items={tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      members={members}
                      onClick={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </SortableContext>
              </KanbanColumn>
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && <KanbanCard task={activeTask} members={members} isOverlay />}
        </DragOverlay>
      </DndContext>

      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      <CreateTaskDialog
        projectId={projectId}
        defaultStatus={createDefaultStatus}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}
