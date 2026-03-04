'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Trash2, CalendarIcon, User, Flag, AlertCircle, FileText, Package, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, PLATFORM_LABELS } from '@/lib/constants'
import { CommentThread } from '@/components/comments/comment-thread'
import { ContentEditor } from '@/components/content/content-editor'
import { DeliverablePanel } from '@/components/deliverables/deliverable-panel'
import { ScheduleDialog } from '@/components/content/schedule-dialog'
import { formatDateTime } from '@/lib/utils'
import { Clock } from 'lucide-react'
import type { Database } from '@/types/database'

type TaskStatus = Database['public']['Enums']['task_status']

const ALL_STATUSES: TaskStatus[] = [
  'backlog', 'todo', 'in_progress', 'in_review',
  'client_review', 'approved', 'scheduled', 'published',
  'blocked', 'done',
]

const PRIORITY_OPTIONS = [
  { value: '0', label: 'None', icon: null },
  { value: '1', label: 'Low', color: 'text-blue-500' },
  { value: '2', label: 'Medium', color: 'text-amber-500' },
  { value: '3', label: 'High', color: 'text-orange-500' },
  { value: '4', label: 'Urgent', color: 'text-red-500' },
]

interface TaskDetailPanelProps {
  taskId: string
  projectId: string
  onClose: () => void
}

export function TaskDetailPanel({ taskId, projectId, onClose }: TaskDetailPanelProps) {
  const utils = trpc.useUtils()
  const { data: task } = trpc.task.getById.useQuery({ id: taskId })
  const { data: members } = trpc.member.list.useQuery()
  const { data: project } = trpc.project.getById.useQuery({ id: projectId })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedContentItemId, setSelectedContentItemId] = useState<string | null>(null)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setStatus(task.status)
      setPriority(task.priority)
      setDueDate(task.due_date ?? '')
      setAssigneeId(task.assignee_id)
    }
  }, [task])

  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.getById.invalidate({ id: taskId })
      utils.task.listByBoard.invalidate({ projectId })
      utils.task.list.invalidate({ projectId })
      toast.success('Task updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.listByBoard.invalidate({ projectId })
      utils.task.list.invalidate({ projectId })
      toast.success('Task deleted')
      onClose()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSave() {
    updateMutation.mutate({
      id: taskId,
      title,
      description: description || undefined,
      status,
      priority,
      dueDate: dueDate || null,
      assigneeId: assigneeId,
    })
  }

  const assignee = members?.find((m) => m.user_id === assigneeId)
  const showContent = project?.type === 'content_ops' || project?.type === 'full_service'
  const { data: contentItems } = trpc.content.listByTaskId.useQuery(
    { taskId },
    { enabled: showContent }
  )
  const showDeliverable = project?.type === 'web_build' || project?.type === 'full_service'

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-0">
        {task ? (
          <>
            {/* Header with status indicator */}
            <div className="border-b px-6 py-4">
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
                  />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {TASK_STATUS_LABELS[status]}
                  </span>
                </div>
                <SheetTitle className="text-lg">Task Details</SheetTitle>
              </SheetHeader>
            </div>

            <Tabs defaultValue="details" className="flex-1">
              <div className="border-b px-6">
                <TabsList className="h-9 w-full justify-start gap-0 bg-transparent p-0">
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3 text-xs"
                  >
                    Details
                  </TabsTrigger>
                  {showContent && (
                    <TabsTrigger
                      value="content"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Content
                    </TabsTrigger>
                  )}
                  {showDeliverable && (
                    <TabsTrigger
                      value="deliverable"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3 text-xs"
                    >
                      <Package className="h-3 w-3 mr-1" />
                      Files
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="comments"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-9 px-3 text-xs"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Comments
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Details tab */}
              <TabsContent value="details" className="mt-0">
                <div className="px-6 py-5 space-y-5">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Title
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="font-medium"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Description
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Add a description..."
                      className="resize-none"
                    />
                  </div>

                  <Separator />

                  {/* Properties grid */}
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Status
                      </Label>
                      <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                        <SelectTrigger className="w-[180px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: TASK_STATUS_COLORS[s] }}
                                />
                                {TASK_STATUS_LABELS[s]}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Priority */}
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Flag className="h-4 w-4" />
                        Priority
                      </Label>
                      <Select
                        value={String(priority)}
                        onValueChange={(v) => setPriority(Number(v))}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className={opt.color}>{opt.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        Assignee
                      </Label>
                      <Select
                        value={assigneeId ?? 'unassigned'}
                        onValueChange={(v) => setAssigneeId(v === 'unassigned' ? null : v)}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-sm">
                          <SelectValue placeholder="Unassigned">
                            {assignee ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                  {assignee.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                                </div>
                                <span className="truncate">{assignee.display_name}</span>
                              </div>
                            ) : (
                              'Unassigned'
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {members?.map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              <div className="flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                                  {m.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                                </div>
                                {m.display_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        Due Date
                      </Label>
                      <Input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-[180px] h-8 text-sm"
                      />
                    </div>
                  </div>

                  {/* Scheduling */}
                  {showContent && contentItems && contentItems.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Scheduling
                        </Label>
                        {contentItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {PLATFORM_LABELS[item.platform as keyof typeof PLATFORM_LABELS] ?? item.platform}
                              </Badge>
                              {item.published_at ? (
                                <span className="text-xs text-green-600 font-medium">
                                  Published {formatDateTime(item.published_at)}
                                </span>
                              ) : item.scheduled_at ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(item.scheduled_at)}
                                </span>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">
                                  Not scheduled
                                </span>
                              )}
                            </div>
                            {!item.published_at && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs shrink-0"
                                onClick={() => {
                                  setSelectedContentItemId(item.id)
                                  setScheduleDialogOpen(true)
                                }}
                              >
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {item.scheduled_at ? 'Change' : 'Schedule'}
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Tags
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer actions */}
                <div className="border-t px-6 py-4 flex items-center gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    size="sm"
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm('Delete this task?')) {
                        deleteMutation.mutate({ id: taskId })
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Content tab */}
              {showContent && (
                <TabsContent value="content" className="mt-0">
                  <div className="px-6 py-5">
                    <ContentEditor taskId={taskId} />
                  </div>
                </TabsContent>
              )}

              {/* Deliverable tab */}
              {showDeliverable && (
                <TabsContent value="deliverable" className="mt-0">
                  <div className="px-6 py-5">
                    <DeliverablePanel taskId={taskId} />
                  </div>
                </TabsContent>
              )}

              {/* Comments tab */}
              <TabsContent value="comments" className="mt-0">
                <div className="px-6 py-5">
                  <CommentThread taskId={taskId} />
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="p-6 animate-pulse space-y-4">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="h-9 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
            <div className="space-y-3 mt-6">
              <div className="h-8 rounded bg-muted" />
              <div className="h-8 rounded bg-muted" />
              <div className="h-8 rounded bg-muted" />
            </div>
          </div>
        )}
      </SheetContent>

      {/* Schedule dialog */}
      {selectedContentItemId && (
        <ScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          contentItemId={selectedContentItemId}
          currentScheduledAt={
            contentItems?.find((i) => i.id === selectedContentItemId)?.scheduled_at
          }
          taskId={taskId}
          onScheduled={() => {
            setScheduleDialogOpen(false)
            setSelectedContentItemId(null)
          }}
        />
      )}
    </Sheet>
  )
}
