'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import type { MessageWithUser } from '@/trpc/routers/chat'

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: MessageWithUser | null
  projectId: string
  channelId: string
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  message,
  projectId,
  channelId,
}: CreateTaskDialogProps) {
  // Strip mention markup for the pre-fill
  const cleanContent = (message?.content ?? '').replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
  const defaultTitle = cleanContent.slice(0, 80)
  const defaultDescription = cleanContent

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(defaultDescription)
  const [priority, setPriority] = useState<string>('2')
  const [assigneeId, setAssigneeId] = useState<string>('')

  // Reset form when message changes
  const [lastMessageId, setLastMessageId] = useState<string | null>(null)
  if (message && message.id !== lastMessageId) {
    const clean = message.content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
    setTitle(clean.slice(0, 80))
    setDescription(clean)
    setPriority('2')
    setAssigneeId('')
    setLastMessageId(message.id)
  }

  const { data: membersData } = trpc.member.list.useQuery(undefined, {
    staleTime: 60_000,
  })

  const utils = trpc.useUtils()

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      toast.success('Task created from message')
      utils.chat.getMessages.invalidate({ channelId })
      utils.chat.getChannelStats.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create task')
    },
  })

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Task title is required')
      return
    }

    createTaskMutation.mutate({
      projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority: parseInt(priority),
      assigneeId: assigneeId || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task from Message</DialogTitle>
          <DialogDescription>
            Create a new task pre-filled from the chat message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                  <SelectItem value="4">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {(membersData ?? []).map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.display_name ?? m.email ?? 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTaskMutation.isPending || !title.trim()}
          >
            {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
