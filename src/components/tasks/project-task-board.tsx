'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { TaskCard } from './task-card'
import { CreateProjectTaskDialog } from './create-project-task-dialog'
import { SERVICE_TYPE_LABELS, type ServiceType } from '@/types/enums'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']

interface ProjectTaskBoardProps {
  projectId: string
  onOpenDrawer: (serviceType?: string) => void
}

export function ProjectTaskBoard({
  projectId,
  onOpenDrawer,
}: ProjectTaskBoardProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  )
  // Use a sentinel value so initial state doesn't accidentally match Unphased (null) groups
  const [inlineTaskPhaseId, setInlineTaskPhaseId] = useState<
    string | null | '__closed__'
  >('__closed__')
  const [inlineTaskTitle, setInlineTaskTitle] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data, isLoading } = trpc.projectTasks.listByProject.useQuery({
    projectId,
  })

  // Fetch org members for assignee picker
  const { data: memberData } = trpc.member.list.useQuery()
  const members = useMemo(
    () =>
      (memberData ?? []).map((m: { user_id: string; display_name: string | null; avatar_url: string | null }) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
      })),
    [memberData]
  )

  const utils = trpc.useUtils()

  const updateMutation = trpc.projectTasks.updateTask.useMutation({
    onSuccess: () => {
      utils.projectTasks.listByProject.invalidate({ projectId })
      utils.projectTasks.getProjectHealth.invalidate({ projectId })
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.projectTasks.deleteTask.useMutation({
    onSuccess: () => {
      utils.projectTasks.listByProject.invalidate({ projectId })
      utils.projectTasks.getProjectHealth.invalidate({ projectId })
      toast.success('Task deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const reorderMutation = trpc.projectTasks.reorderTasks.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const addManualMutation = trpc.projectTasks.addManualTask.useMutation({
    onSuccess: () => {
      utils.projectTasks.listByProject.invalidate({ projectId })
      setInlineTaskTitle('')
      setInlineTaskPhaseId('__closed__')
      toast.success('Task added')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleUpdate = useCallback(
    (
      id: string,
      updates: {
        status?: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
        assigneeId?: string | null
        dueDate?: string | null
        notes?: string | null
        estimatedHours?: number | null
        serviceType?: string | null
      }
    ) => {
      updateMutation.mutate({ id, ...updates })
    },
    [updateMutation]
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate({ id })
    },
    [deleteMutation]
  )

  const handleInlineAdd = (phaseId: string | null, serviceType?: string) => {
    if (!inlineTaskTitle.trim()) return
    addManualMutation.mutate({
      projectId,
      phaseId: phaseId ?? undefined,
      title: inlineTaskTitle.trim(),
      // Don't pass '_unassigned' as a literal service type — leave it as undefined (null in DB)
      serviceType: serviceType === '_unassigned' ? undefined : serviceType,
    })
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Build dependency maps
  const allTasks = useMemo(() => {
    if (!data) return []
    const tasks: (TaskRow & {
      assignee: {
        user_id: string
        display_name: string | null
        avatar_url: string | null
      } | null
    })[] = []
    for (const serviceGroups of Object.values(data)) {
      for (const phaseGroup of serviceGroups) {
        tasks.push(...phaseGroup.tasks)
      }
    }
    return tasks
  }, [data])

  const dependencyInfo = useMemo(() => {
    const blockedMap = new Map<string, string>() // taskId → reason
    const hasDependentsSet = new Set<string>()

    for (const task of allTasks) {
      const deps = (task.depends_on as string[] | null) ?? []
      if (deps.length > 0) {
        // Check if any dep is not done
        const pendingDeps = deps.filter((depId) => {
          const depTask = allTasks.find((t) => t.id === depId)
          return depTask && depTask.status !== 'done'
        })
        if (pendingDeps.length > 0) {
          const depNames = pendingDeps
            .map((id) => allTasks.find((t) => t.id === id)?.title ?? 'Unknown')
            .join(', ')
          blockedMap.set(
            task.id,
            `Waiting on: ${depNames}`
          )
        }
        // Mark the deps as having dependents
        for (const depId of deps) {
          hasDependentsSet.add(depId)
        }
      }
    }
    return { blockedMap, hasDependentsSet }
  }, [allTasks])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Find the tasks in the flat list and compute new sort orders
    const activeIdx = allTasks.findIndex((t) => t.id === active.id)
    const overIdx = allTasks.findIndex((t) => t.id === over.id)
    if (activeIdx === -1 || overIdx === -1) return

    // Compute new ordering
    const reordered = [...allTasks]
    const [moved] = reordered.splice(activeIdx, 1)
    reordered.splice(overIdx, 0, moved)

    // Send reorder updates
    const items = reordered.map((t, i) => ({
      id: t.id,
      sortOrder: i,
    }))
    reorderMutation.mutate({ items })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No tasks yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Add tasks from the template library or create your own custom tasks.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={() => onOpenDrawer()}>
            <Plus className="h-4 w-4 mr-2" />
            Add from Library
          </Button>
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Task
          </Button>
        </div>
        <CreateProjectTaskDialog
          projectId={projectId}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {allTasks.length} tasks ·{' '}
          {allTasks.filter((t) => t.status === 'done').length} completed
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Task
          </Button>
          <Button size="sm" onClick={() => onOpenDrawer()}>
            <Plus className="h-4 w-4 mr-1" />
            Add from Library
          </Button>
        </div>
      </div>

      <CreateProjectTaskDialog
        projectId={projectId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {Object.entries(data).map(([serviceKey, phaseGroups]) => {
          const serviceLabel =
            serviceKey === '_unassigned'
              ? 'Unassigned'
              : (SERVICE_TYPE_LABELS[serviceKey as ServiceType] ?? serviceKey)
          const isServiceCollapsed = collapsedSections.has(serviceKey)
          const serviceTasks = phaseGroups.flatMap((g) => g.tasks)
          const serviceHours = serviceTasks.reduce(
            (sum, t) => sum + Number(t.estimated_hours ?? 0),
            0
          )

          return (
            <div key={serviceKey} className="space-y-3">
              {/* Service header */}
              <button
                type="button"
                className="flex items-center gap-2 w-full group"
                onClick={() => toggleSection(serviceKey)}
              >
                {isServiceCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {serviceLabel}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {serviceTasks.length} tasks
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {serviceHours}h
                </span>
              </button>

              {!isServiceCollapsed &&
                phaseGroups.map((phaseGroup) => {
                  const phaseKey = `${serviceKey}::${phaseGroup.phaseName}`
                  const isPhaseCollapsed =
                    collapsedSections.has(phaseKey)
                  const phaseHours = phaseGroup.tasks.reduce(
                    (sum, t) => sum + Number(t.estimated_hours ?? 0),
                    0
                  )
                  const taskIds = phaseGroup.tasks.map((t) => t.id)

                  return (
                    <div key={phaseKey} className="ml-4">
                      {/* Phase header */}
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full mb-2"
                        onClick={() => toggleSection(phaseKey)}
                      >
                        {isPhaseCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          {phaseGroup.phaseName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({phaseGroup.tasks.length})
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {phaseHours}h
                        </span>
                      </button>

                      {!isPhaseCollapsed && (
                        <div className="space-y-1.5 ml-5">
                          <SortableContext
                            items={taskIds}
                            strategy={verticalListSortingStrategy}
                          >
                            {phaseGroup.tasks.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                members={members}
                                isBlocked={dependencyInfo.blockedMap.has(
                                  task.id
                                )}
                                blockReason={dependencyInfo.blockedMap.get(
                                  task.id
                                )}
                                hasDependents={dependencyInfo.hasDependentsSet.has(
                                  task.id
                                )}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                              />
                            ))}
                          </SortableContext>

                          {/* Inline add task */}
                          {inlineTaskPhaseId === phaseGroup.phaseId ? (
                            <div className="flex items-center gap-2 ml-6">
                              <Input
                                placeholder="Task name..."
                                value={inlineTaskTitle}
                                onChange={(e) =>
                                  setInlineTaskTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter')
                                    handleInlineAdd(
                                      phaseGroup.phaseId,
                                      serviceKey
                                    )
                                  if (e.key === 'Escape') {
                                    setInlineTaskPhaseId('__closed__')
                                    setInlineTaskTitle('')
                                  }
                                }}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() =>
                                  handleInlineAdd(
                                    phaseGroup.phaseId,
                                    serviceKey
                                  )
                                }
                                disabled={
                                  !inlineTaskTitle.trim() ||
                                  addManualMutation.isPending
                                }
                              >
                                Add
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-6 py-1"
                              onClick={() =>
                                setInlineTaskPhaseId(phaseGroup.phaseId)
                              }
                            >
                              <Plus className="h-3 w-3" />
                              Add custom task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </DndContext>
    </div>
  )
}

/**
 * Sortable wrapper for TaskCard
 */
function SortableTaskCard(
  props: React.ComponentProps<typeof TaskCard>
) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard {...props} dragHandleProps={listeners} />
    </div>
  )
}
