'use client'

import { useMemo } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { NotificationType } from '@/types/enums'

const EVENT_TYPES: NotificationType[] = [
  'task_assigned',
  'task_status_changed',
  'comment_added',
  'due_date_approaching',
  'content_scheduled',
  'content_published',
  'meeting_starting',
]

export function NotificationPreferences() {
  const utils = trpc.useUtils()
  const { data: preferences, isLoading } = trpc.notification.getPreferences.useQuery()

  const prefMap = useMemo(() => {
    const map: Record<string, { in_app: boolean; email: boolean }> = {}
    if (preferences) {
      for (const pref of preferences) {
        map[pref.event_type] = {
          in_app: pref.in_app,
          email: pref.email,
        }
      }
    }
    return map
  }, [preferences])

  const updateMutation = trpc.notification.updatePreference.useMutation({
    onSuccess: () => {
      utils.notification.getPreferences.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleToggle(
    eventType: NotificationType,
    field: 'in_app' | 'email',
    currentValue: boolean,
  ) {
    const current = prefMap[eventType] ?? { in_app: true, email: true }
    updateMutation.mutate({
      eventType,
      inApp: field === 'in_app' ? !currentValue : current.in_app,
      email: field === 'email' ? !currentValue : current.email,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified for each event type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px] items-center gap-2 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Event Type
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                In-App
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
                Email
              </span>
            </div>

            {/* Rows */}
            {EVENT_TYPES.map((eventType) => {
              const pref = prefMap[eventType]
              const inApp = pref?.in_app ?? true
              const email = pref?.email ?? true

              return (
                <div
                  key={eventType}
                  className="grid grid-cols-[1fr_80px_80px] items-center gap-2 rounded-md px-3 py-2.5 hover:bg-muted/50"
                >
                  <span className="text-sm">
                    {NOTIFICATION_TYPE_LABELS[eventType]}
                  </span>
                  <div className="flex justify-center">
                    <Switch
                      checked={inApp}
                      onCheckedChange={() =>
                        handleToggle(eventType, 'in_app', inApp)
                      }
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={email}
                      onCheckedChange={() =>
                        handleToggle(eventType, 'email', email)
                      }
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
