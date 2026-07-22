'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Save } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'

const DURATION_OPTIONS = [
  { value: '0.5', label: '0.5 hours' },
  { value: '1', label: '1 hour' },
  { value: '2', label: '2 hours' },
  { value: '4', label: '4 hours' },
  { value: '8', label: '8 hours' },
]

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
]

export function GeneralSettings() {
  const { role } = useCurrentUser()
  const isAdmin = role === 'admin'
  const utils = trpc.useUtils()

  const { data: org, isLoading } = trpc.organization.get.useQuery()

  const [duration, setDuration] = useState('1')
  const [workingDays, setWorkingDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri'])
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    if (org) {
      setDuration(String(org.default_task_duration_hours ?? 1))
      setWorkingDays(org.working_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'])
      setTimezone(org.timezone ?? 'UTC')
    }
  }, [org])

  const allTimezones = useMemo(() => {
    try {
      const all = Intl.supportedValuesOf('timeZone')
      const commonSet = new Set(COMMON_TIMEZONES)
      const rest = all.filter((tz) => !commonSet.has(tz))
      return [...COMMON_TIMEZONES, ...rest]
    } catch {
      return COMMON_TIMEZONES
    }
  }, [])

  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success('General settings saved')
      utils.organization.get.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function handleSave() {
    updateMutation.mutate({
      defaultTaskDurationHours: parseFloat(duration),
      workingDays,
      timezone,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default Task Duration</CardTitle>
          <CardDescription>
            The default estimated hours when creating new tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={duration}
            onValueChange={setDuration}
            disabled={!isAdmin}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working Days</CardTitle>
          <CardDescription>
            Select the days your team is active. This affects scheduling and deadline calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {DAYS.map((day) => {
              const isSelected = workingDays.includes(day.key)
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => isAdmin && toggleDay(day.key)}
                  disabled={!isAdmin}
                  className={cn(
                    'w-12 h-10 rounded-lg text-sm font-medium border transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted',
                    !isAdmin && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization Timezone</CardTitle>
          <CardDescription>
            Used as the default timezone for scheduling and deadlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={timezone}
            onValueChange={setTimezone}
            disabled={!isAdmin}
          >
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allTimezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isAdmin && (
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      )}
    </div>
  )
}
