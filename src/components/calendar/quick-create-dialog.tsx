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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListChecks, Video, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { useCurrentUser } from '@/hooks/use-current-user'

interface QuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate: Date
}

function formatDateInput(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function QuickCreateDialog({
  open,
  onOpenChange,
  defaultDate,
}: QuickCreateDialogProps) {
  const { role } = useCurrentUser()
  const utils = trpc.useUtils()

  const [type, setType] = useState<'task' | 'meeting'>('task')

  // Task state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskProjectId, setTaskProjectId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState(formatDateInput(defaultDate))

  // Meeting state
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(formatDateInput(defaultDate))
  const [meetingTime, setMeetingTime] = useState('10:00')
  const [meetingDuration, setMeetingDuration] = useState('30')
  const [meetingType, setMeetingType] = useState<'internal' | 'client' | 'review'>('internal')

  const { data: projects } = trpc.project.list.useQuery({ status: 'active' as const })

  const createTask = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.calendar.getTasksByRange.invalidate()
      toast.success('Task created')
      resetAndClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const createMeeting = trpc.meeting.create.useMutation({
    onSuccess: () => {
      utils.meeting.list.invalidate()
      toast.success('Meeting scheduled')
      resetAndClose()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetAndClose() {
    setTaskTitle('')
    setTaskProjectId('')
    setMeetingTitle('')
    setMeetingDuration('30')
    onOpenChange(false)
  }

  function handleCreateTask() {
    if (!taskTitle.trim() || !taskProjectId) return
    createTask.mutate({
      projectId: taskProjectId,
      title: taskTitle.trim(),
      dueDate: taskDueDate,
    })
  }

  function handleCreateMeeting() {
    if (!meetingTitle.trim()) return
    const scheduledAt = `${meetingDate}T${meetingTime}:00`
    createMeeting.mutate({
      title: meetingTitle.trim(),
      scheduledAt,
      durationMinutes: parseInt(meetingDuration, 10),
      meetingType,
    })
  }

  const canCreateMeeting = role === 'admin' || role === 'manager'
  const isCreating = createTask.isPending || createMeeting.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => setType(v as 'task' | 'meeting')}>
          <TabsList className="w-full">
            <TabsTrigger value="task" className="flex-1 gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Task
            </TabsTrigger>
            <TabsTrigger
              value="meeting"
              className="flex-1 gap-1.5"
              disabled={!canCreateMeeting}
            >
              <Video className="h-3.5 w-3.5" />
              Meeting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="Task name..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-project">Project</Label>
              <Select value={taskProjectId} onValueChange={setTaskProjectId}>
                <SelectTrigger id="task-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-date">Due Date</Label>
              <Input
                id="task-date"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || !taskProjectId || isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="meeting" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Title</Label>
              <Input
                id="meeting-title"
                placeholder="Meeting name..."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meeting-date">Date</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-time">Time</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="meeting-duration">Duration (min)</Label>
                <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                  <SelectTrigger id="meeting-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting-type">Type</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as 'internal' | 'client' | 'review')}>
                  <SelectTrigger id="meeting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleCreateMeeting}
              disabled={!meetingTitle.trim() || isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Meeting'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
