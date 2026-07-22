'use client'

import { useState } from 'react'
import { Mail, Loader2, Unplug, RefreshCw, CheckCircle2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/alert-dialog'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const PROVIDER_CONFIG = {
  gmail: {
    label: 'Gmail',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: '📧',
    connectUrl: '/api/auth/gmail',
  },
  outlook: {
    label: 'Outlook',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: '📨',
    connectUrl: '/api/auth/outlook',
  },
} as const

export function EmailConnectionSettings() {
  const utils = trpc.useUtils()
  const searchParams = useSearchParams()
  const [disconnectId, setDisconnectId] = useState<string | null>(null)

  const { data: connections, isLoading } = trpc.email.listConnections.useQuery()

  const disconnectMutation = trpc.email.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Email account disconnected')
      utils.email.listConnections.invalidate()
      setDisconnectId(null)
    },
    onError: (err) => toast.error(err.message),
  })

  // Show success toast on redirect back from OAuth
  useEffect(() => {
    const gmail = searchParams.get('gmail')
    const outlook = searchParams.get('outlook')

    if (gmail === 'connected') {
      toast.success('Gmail connected successfully!')
    } else if (gmail === 'error') {
      const reason = searchParams.get('reason')
      toast.error(`Gmail connection failed${reason ? `: ${reason}` : ''}`)
    }
    if (outlook === 'connected') {
      toast.success('Outlook connected successfully!')
    } else if (outlook === 'error') {
      const reason = searchParams.get('reason')
      toast.error(`Outlook connection failed${reason ? `: ${reason}` : ''}`)
    }
  }, [searchParams])

  const connectedProviders = new Set(connections?.map((c) => c.provider) ?? [])

  return (
    <div className="space-y-6">
      {/* Connect buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Connect Email
          </CardTitle>
          <CardDescription>
            Link your email account to send, receive, and track email conversations within projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(Object.entries(PROVIDER_CONFIG) as [keyof typeof PROVIDER_CONFIG, typeof PROVIDER_CONFIG[keyof typeof PROVIDER_CONFIG]][]).map(
              ([key, config]) => (
                <Button
                  key={key}
                  variant="outline"
                  disabled={connectedProviders.has(key)}
                  onClick={() => {
                    window.location.href = config.connectUrl
                  }}
                >
                  <span className="mr-2">{config.icon}</span>
                  {connectedProviders.has(key) ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4 text-green-500" />
                      {config.label} Connected
                    </>
                  ) : (
                    `Connect ${config.label}`
                  )}
                </Button>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connected accounts */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {connections && connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Accounts</CardTitle>
            <CardDescription>
              Email accounts linked to your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connections.map((conn) => {
                const config = PROVIDER_CONFIG[conn.provider as keyof typeof PROVIDER_CONFIG]
                return (
                  <div
                    key={conn.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{config?.icon ?? '📧'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{conn.email_address}</span>
                          <Badge variant="secondary" className={config?.color}>
                            {config?.label ?? conn.provider}
                          </Badge>
                          {conn.is_active ? (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {conn.display_name && `${conn.display_name} · `}
                          {conn.last_synced_at
                            ? `Last synced ${new Date(conn.last_synced_at).toLocaleString()}`
                            : 'Not synced yet'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDisconnectId(conn.id)}
                    >
                      <Unplug className="mr-1.5 h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnect confirmation */}
      <AlertDialog open={!!disconnectId} onOpenChange={() => setDisconnectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Email Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the email connection and stop syncing. Existing email threads will remain visible but no new emails will be synced.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (disconnectId) {
                  disconnectMutation.mutate({ connectionId: disconnectId })
                }
              }}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
