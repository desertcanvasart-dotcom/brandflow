'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'

interface Member {
  user_id: string
  display_name: string | null
}

interface GanttQuickCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  startDate: string
  members: Member[]
  onCreated: () => void
}

export function GanttQuickCreate({
  open,
  onOpenChange,
  projectId,
  projectName,
  startDate,
  members,
  onCreated,
}: GanttQuickCreateProps) {
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + 3)
    return d.toISOString().split('T')[0]
  })

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      toast.success('Task created')
      onCreated()
      onOpenChange(false)
      setTitle('')
      setAssigneeId('')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    createTask.mutate({
      projectId,
      title: title.trim(),
      startDate,
      dueDate,
      assigneeId: assigneeId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Quick Add Task</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Adding to {projectName}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-xs">
              Title
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task name..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-xs">
                Start
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                disabled
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-xs">
                Due
              </Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.display_name ?? 'Unknown'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || createTask.isPending}
            >
              {createTask.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
