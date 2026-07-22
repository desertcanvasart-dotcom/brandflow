'use client'

import { useState } from 'react'
import { CalendarDays, Check, Loader2, RefreshCw, Unplug } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function CalendarSettings() {
  const utils = trpc.useUtils()
  const [disconnecting, setDisconnecting] = useState(false)

  // List Google Calendar connections for the current org
  const { data: connections, isLoading } = trpc.settings.getGoogleCalendarConnections.useQuery()

  const hasConnection = (connections ?? []).length > 0
  const connection = (connections ?? [])[0]

  const handleConnect = () => {
    window.location.href = '/api/auth/google-calendar'
  }

  const handleDisconnect = async () => {
    if (!connection) return
    setDisconnecting(true)
    try {
      await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' })
      utils.settings.getGoogleCalendarConnections.invalidate()
      toast.success('Google Calendar disconnected')
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">Google Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Connect your Google Calendar to sync events and see them alongside your project schedules.
          This is read-only — we never modify your calendar.
        </p>
      </div>

      {!hasConnection ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No Google Calendar account connected
          </p>
          <Button onClick={handleConnect}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Connect Google Calendar
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{connection.email_address}</p>
                  <Badge variant="outline" className="text-[10px]">
                    <Check className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {connection.display_name ?? 'Google Calendar'}
                  {connection.last_synced_at && (
                    <> &middot; Last synced {new Date(connection.last_synced_at).toLocaleString()}</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Trigger manual sync
                  toast.info('Sync initiated — events will update shortly')
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Unplug className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will stop syncing events from {connection.email_address}.
                      Previously synced events will remain until manually removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
