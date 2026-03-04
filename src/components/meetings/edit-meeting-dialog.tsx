'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { MEETING_TYPE_LABELS } from '@/lib/constants'
import type { Database } from '@/types/database'

type MeetingType = Database['public']['Enums']['meeting_type']

const MEETING_TYPES: MeetingType[] = ['internal', 'client', 'review']
const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
]

interface EditMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meeting: {
    id: string
    title: string
    description: string | null
    meeting_type: string
    scheduled_at: string
    duration_minutes: number
  }
}

export function EditMeetingDialog({ open, onOpenChange, meeting }: EditMeetingDialogProps) {
  const utils = trpc.useUtils()

  const [title, setTitle] = useState(meeting.title)
  const [meetingType, setMeetingType] = useState<MeetingType>(meeting.meeting_type as MeetingType)
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(String(meeting.duration_minutes))
  const [description, setDescription] = useState(meeting.description || '')

  // Format the scheduled_at date for datetime-local input
  useEffect(() => {
    if (meeting.scheduled_at) {
      const date = new Date(meeting.scheduled_at)
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const formatted = date.getFullYear()
        + '-' + String(date.getMonth() + 1).padStart(2, '0')
        + '-' + String(date.getDate()).padStart(2, '0')
        + 'T' + String(date.getHours()).padStart(2, '0')
        + ':' + String(date.getMinutes()).padStart(2, '0')
      setScheduledAt(formatted)
    }
  }, [meeting.scheduled_at])

  useEffect(() => {
    setTitle(meeting.title)
    setMeetingType(meeting.meeting_type as MeetingType)
    setDurationMinutes(String(meeting.duration_minutes))
    setDescription(meeting.description || '')
  }, [meeting])

  const updateMutation = trpc.meeting.update.useMutation({
    onSuccess: () => {
      utils.meeting.getById.invalidate({ id: meeting.id })
      utils.meeting.list.invalidate()
      utils.meeting.upcoming.invalidate()
      toast.success('Meeting updated')
      onOpenChange(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !scheduledAt) return

    updateMutation.mutate({
      id: meeting.id,
      title: title.trim(),
      meetingType,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMinutes: parseInt(durationMinutes),
      description: description.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>Update meeting details or reschedule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as MeetingType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {MEETING_TYPE_LABELS[type] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-scheduledAt">Date & Time</Label>
              <Input
                id="edit-scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !title.trim() || !scheduledAt}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
