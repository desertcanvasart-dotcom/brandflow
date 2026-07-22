'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from '@/types/enums'
import { Loader2 } from 'lucide-react'

interface CreateProjectTaskDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectTaskDialog({
  projectId,
  open,
  onOpenChange,
}: CreateProjectTaskDialogProps) {
  const utils = trpc.useUtils()
  const { data: memberData } = trpc.member.list.useQuery()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [serviceType, setServiceType] = useState<string>('none')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>('unassigned')
  const [dueDate, setDueDate] = useState('')

  const members = useMemo(
    () =>
      (memberData ?? []).map(
        (m: {
          user_id: string
          display_name: string | null
          avatar_url: string | null
        }) => ({
          user_id: m.user_id,
          display_name: m.display_name,
          avatar_url: m.avatar_url,
        })
      ),
    [memberData]
  )

  const createMutation = trpc.projectTasks.addManualTask.useMutation({
    onSuccess: () => {
      utils.projectTasks.listByProject.invalidate({ projectId })
      utils.projectTasks.getProjectHealth.invalidate({ projectId })
      utils.task.list.invalidate()
      toast.success('Task created')
      resetForm()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setTitle('')
    setDescription('')
    setServiceType('none')
    setEstimatedHours('')
    setAssigneeId('unassigned')
    setDueDate('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    createMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      serviceType: serviceType !== 'none' ? serviceType : undefined,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId,
      dueDate: dueDate || undefined,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Custom Task</DialogTitle>
            <DialogDescription>
              Add a custom task that&apos;s not in the template library.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="project-task-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="project-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Design homepage mockup"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="project-task-desc">Description</Label>
              <Textarea
                id="project-task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this task..."
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Service Type + Estimated Hours row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific type</SelectItem>
                    {SERVICE_TYPES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {SERVICE_TYPE_LABELS[st]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-task-hours">Estimated Hours</Label>
                <Input
                  id="project-task-hours"
                  type="number"
                  min={0}
                  step={0.5}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="e.g. 4"
                />
              </div>
            </div>

            {/* Assignee + Due Date row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map(
                      (m: {
                        user_id: string
                        display_name: string | null
                      }) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {m.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                            </div>
                            {m.display_name}
                          </div>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
