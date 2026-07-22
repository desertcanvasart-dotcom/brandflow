'use client'

import { useMemo, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { NOTIFICATION_TYPE_LABELS, DIGEST_FREQUENCY_LABELS } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { NotificationType, DigestFrequency } from '@/types/enums'

const EVENT_TYPES: NotificationType[] = [
  'task_assigned',
  'task_status_changed',
  'comment_added',
  'due_date_approaching',
  'content_scheduled',
  'content_published',
  'meeting_starting',
]

const CHANNELS = ['in_app', 'email', 'push', 'slack', 'webhook'] as const
const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  push: 'Push',
  slack: 'Slack',
  webhook: 'Webhook',
}

export function NotificationPreferences() {
  const utils = trpc.useUtils()
  const { data: preferences, isLoading } = trpc.notification.getPreferences.useQuery()

  const prefMap = useMemo(() => {
    const map: Record<string, {
      in_app: boolean
      email: boolean
      push: boolean
      slack: boolean
      webhook: boolean
      digest_frequency: string
    }> = {}
    if (preferences) {
      for (const pref of preferences) {
        map[pref.event_type] = {
          in_app: pref.in_app,
          email: pref.email,
          push: pref.push,
          slack: pref.slack,
          webhook: pref.webhook,
          digest_frequency: pref.digest_frequency,
        }
      }
    }
    return map
  }, [preferences])

  // Global digest frequency (use the first non-'none' value found, or 'none')
  const currentDigest = useMemo(() => {
    if (!preferences?.length) return 'none'
    const found = preferences.find((p) => p.digest_frequency !== 'none')
    return found?.digest_frequency ?? 'none'
  }, [preferences])

  const [digestFreq, setDigestFreq] = useState<string>(currentDigest)

  // Sync digest state when preferences load
  useMemo(() => {
    setDigestFreq(currentDigest)
  }, [currentDigest])

  const updateMutation = trpc.notification.updatePreference.useMutation({
    onSuccess: () => {
      utils.notification.getPreferences.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleToggle(
    eventType: NotificationType,
    field: typeof CHANNELS[number],
    currentValue: boolean,
  ) {
    const current = prefMap[eventType] ?? {
      in_app: true,
      email: true,
      push: true,
      slack: true,
      webhook: true,
      digest_frequency: digestFreq,
    }
    updateMutation.mutate({
      eventType,
      inApp: field === 'in_app' ? !currentValue : current.in_app,
      email: field === 'email' ? !currentValue : current.email,
      push: field === 'push' ? !currentValue : current.push,
      slack: field === 'slack' ? !currentValue : current.slack,
      webhook: field === 'webhook' ? !currentValue : current.webhook,
      digestFrequency: current.digest_frequency as DigestFrequency,
    })
  }

  function handleDigestChange(value: string) {
    setDigestFreq(value)
    // Update all event types with the new digest frequency
    for (const eventType of EVENT_TYPES) {
      const current = prefMap[eventType] ?? {
        in_app: true,
        email: true,
        push: true,
        slack: true,
        webhook: true,
      }
      updateMutation.mutate({
        eventType,
        inApp: current.in_app,
        email: current.email,
        push: current.push,
        slack: current.slack,
        webhook: current.webhook,
        digestFrequency: value as DigestFrequency,
      })
    }
    toast.success(`Digest set to: ${DIGEST_FREQUENCY_LABELS[value as DigestFrequency]}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified for each event type across all channels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Channel Grid */}
            <div className="overflow-x-auto">
              <div className="space-y-1 min-w-[500px]">
                {/* Header */}
                <div className="grid grid-cols-[1fr_repeat(5,56px)] items-center gap-1 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Event Type
                  </span>
                  {CHANNELS.map((ch) => (
                    <span
                      key={ch}
                      className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center"
                    >
                      {CHANNEL_LABELS[ch]}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {EVENT_TYPES.map((eventType) => {
                  const pref = prefMap[eventType]
                  return (
                    <div
                      key={eventType}
                      className="grid grid-cols-[1fr_repeat(5,56px)] items-center gap-1 rounded-md px-3 py-2.5 hover:bg-muted/50"
                    >
                      <span className="text-sm">
                        {NOTIFICATION_TYPE_LABELS[eventType]}
                      </span>
                      {CHANNELS.map((ch) => {
                        const value = pref?.[ch] ?? true
                        return (
                          <div key={ch} className="flex justify-center">
                            <Switch
                              checked={value}
                              onCheckedChange={() =>
                                handleToggle(eventType, ch, value)
                              }
                              className="scale-90"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Digest Frequency */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email Digest</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Batch email notifications into a periodic digest instead of individual emails.
                </p>
              </div>
              <Select value={digestFreq} onValueChange={handleDigestChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(DIGEST_FREQUENCY_LABELS) as [DigestFrequency, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
