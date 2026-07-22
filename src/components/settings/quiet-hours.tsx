'use client'

import { useState, useEffect, useMemo } from 'react'
import { Moon, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0')
  return { value: `${h}:00`, label: `${h}:00` }
})

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

const ALL_DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
]

export function QuietHours() {
  const { data: quietHours, isLoading } = trpc.notification.getQuietHours.useQuery()

  const [isEnabled, setIsEnabled] = useState(false)
  const [startTime, setStartTime] = useState('22:00')
  const [endTime, setEndTime] = useState('08:00')
  const [timezone, setTimezone] = useState('UTC')
  const [activeDays, setActiveDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri'])

  useEffect(() => {
    if (quietHours) {
      setIsEnabled(quietHours.is_enabled)
      setStartTime(quietHours.start_time)
      setEndTime(quietHours.end_time)
      setTimezone(quietHours.timezone)
      setActiveDays(quietHours.active_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'])
    }
  }, [quietHours])

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

  const updateMutation = trpc.notification.updateQuietHours.useMutation({
    onSuccess: () => toast.success('Quiet hours updated'),
    onError: (err) => toast.error(err.message),
  })

  const toggleDay = (day: string) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function handleSave() {
    updateMutation.mutate({
      isEnabled,
      startTime,
      endTime,
      timezone,
      activeDays,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-muted-foreground" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Moon className="h-4 w-4 text-muted-foreground" />
          Quiet Hours
        </CardTitle>
        <CardDescription>
          Pause push, email, Slack and webhook notifications during specific times. In-app notifications still appear.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="quiet-enabled">Enable Quiet Hours</Label>
          <Switch
            id="quiet-enabled"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {isEnabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Days */}
            <div className="space-y-2">
              <Label>Active Days</Label>
              <p className="text-xs text-muted-foreground">
                Quiet hours apply only on selected days
              </p>
              <div className="flex gap-2">
                {ALL_DAYS.map((day) => {
                  const isSelected = activeDays.includes(day.key)
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={cn(
                        'w-10 h-8 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
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
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  )
}
