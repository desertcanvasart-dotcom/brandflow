'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentItemId: string
  currentScheduledAt?: string | null
  taskId: string
  onScheduled?: () => void
}

export function ScheduleDialog({
  open,
  onOpenChange,
  contentItemId,
  currentScheduledAt,
  taskId,
  onScheduled,
}: ScheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState('09:00')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const utils = trpc.useUtils()

  // Pre-fill from current schedule
  useEffect(() => {
    if (currentScheduledAt) {
      const d = new Date(currentScheduledAt)
      setSelectedDate(d)
      setTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      )
    } else {
      setSelectedDate(undefined)
      setTime('09:00')
    }
  }, [currentScheduledAt, open])

  const scheduleMutation = trpc.content.schedule.useMutation({
    onSuccess: () => {
      invalidateAll()
      toast.success('Content scheduled')
      onScheduled?.()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const unscheduleMutation = trpc.content.unschedule.useMutation({
    onSuccess: () => {
      invalidateAll()
      toast.success('Schedule removed')
      onScheduled?.()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function invalidateAll() {
    utils.content.listByTaskId.invalidate({ taskId })
    utils.content.listQueue.invalidate()
    utils.task.getById.invalidate({ id: taskId })
    utils.task.listByBoard.invalidate()
    utils.task.list.invalidate()
    utils.calendar.getContentByRange.invalidate()
  }

  function handleSchedule() {
    if (!selectedDate) return
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes
    )
    scheduleMutation.mutate({
      contentItemId,
      scheduledAt: scheduledDate.toISOString(),
    })
  }

  function handleUnschedule() {
    unscheduleMutation.mutate({ contentItemId })
  }

  const isPending = scheduleMutation.isPending || unscheduleMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Content</DialogTitle>
          <DialogDescription>
            Pick a date and time for when this content should go live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d)
                    setCalendarOpen(false)
                  }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentScheduledAt && (
            <Button
              variant="outline"
              onClick={handleUnschedule}
              disabled={isPending}
              className="text-destructive hover:text-destructive mr-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Remove Schedule
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedDate || isPending}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {currentScheduledAt ? 'Reschedule' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
