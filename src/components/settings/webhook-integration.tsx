'use client'

import { useState, useEffect } from 'react'
import { Globe, Trash2, Loader2, Copy, RefreshCw, Send } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import { WebhookDeliveryLog } from '@/components/settings/webhook-delivery-log'
import type { NotificationType } from '@/types/enums'

const EVENT_TYPES: NotificationType[] = [
  'task_assigned', 'task_status_changed', 'comment_added',
  'due_date_approaching', 'content_scheduled', 'content_published',
  'meeting_starting',
]

export function WebhookIntegration() {
  const utils = trpc.useUtils()
  const { data: integrations, isLoading } = trpc.notification.getIntegrations.useQuery()
  const webhookIntegration = integrations?.find((i) => i.type === 'webhook')

  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (webhookIntegration) {
      const config = webhookIntegration.config as Record<string, unknown>
      setUrl((config?.url as string) ?? '')
      setSecret((config?.secret as string) ?? '')
      setSelectedEvents((config?.events as string[]) ?? [])
      setIsActive(webhookIntegration.is_active)
    }
  }, [webhookIntegration])

  const upsertMutation = trpc.notification.upsertIntegration.useMutation({
    onSuccess: () => {
      toast.success('Webhook integration saved')
      utils.notification.getIntegrations.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.notification.deleteIntegration.useMutation({
    onSuccess: () => {
      toast.success('Webhook integration removed')
      setUrl('')
      setSecret('')
      setSelectedEvents([])
      utils.notification.getIntegrations.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const generateSecretMutation = trpc.notification.generateWebhookSecret.useMutation({
    onSuccess: (result) => {
      setSecret(result.secret)
      toast.success('New secret generated')
    },
  })

  const testWebhookMutation = trpc.settings.testWebhook.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Test payload delivered (${result.statusCode})`)
      } else {
        toast.error(`Test failed: ${result.error ?? 'Unknown error'}`)
      }
      utils.settings.getWebhookDeliveryLogs.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSave() {
    if (!url.trim()) {
      toast.error('Please enter a webhook URL')
      return
    }
    if (!secret) {
      toast.error('Please generate a secret first')
      return
    }
    upsertMutation.mutate({
      id: webhookIntegration?.id,
      type: 'webhook',
      name: 'Custom Webhook',
      config: { url, secret, events: selectedEvents },
      isActive,
    })
  }

  function toggleEvent(eventType: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventType)
        ? prev.filter((e) => e !== eventType)
        : [...prev, eventType]
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Webhook Integration
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
          <Globe className="h-4 w-4 text-muted-foreground" />
          Webhook Integration
        </CardTitle>
        <CardDescription>
          Send notification events to a custom endpoint with HMAC signature verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Endpoint URL</Label>
          <Input
            id="webhook-url"
            placeholder="https://api.example.com/webhooks/agencybeats"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Signing Secret</Label>
          <div className="flex items-center gap-2">
            <Input
              value={secret}
              readOnly
              className="font-mono text-xs"
              placeholder="Click generate to create a secret"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => generateSecretMutation.mutate()}
              title="Generate new secret"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {secret && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(secret)
                  toast.success('Secret copied')
                }}
                title="Copy secret"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Payloads are signed with HMAC-SHA256. Verify the <code>X-AgencyBeats-Signature</code> header.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Subscribed Events</Label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((eventType) => (
              <label
                key={eventType}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedEvents.includes(eventType)}
                  onCheckedChange={() => toggleEvent(eventType)}
                />
                {NOTIFICATION_TYPE_LABELS[eventType]}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedEvents.length === 0 ? 'All events (no filter)' : `${selectedEvents.length} event type${selectedEvents.length !== 1 ? 's' : ''} selected`}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="webhook-active">Active</Label>
          <Switch
            id="webhook-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          {webhookIntegration && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={testWebhookMutation.isPending || !url}
                onClick={() => {
                  if (webhookIntegration) {
                    testWebhookMutation.mutate({
                      integrationId: webhookIntegration.id,
                      url,
                    })
                  }
                }}
              >
                <Send className="h-4 w-4 mr-1" />
                {testWebhookMutation.isPending ? 'Sending...' : 'Send Test'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate({ id: webhookIntegration.id })}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
        </div>

        {/* Delivery Log */}
        {webhookIntegration && (
          <div className="pt-4 border-t space-y-3">
            <Label className="text-sm font-medium">Delivery Log</Label>
            <WebhookDeliveryLog integrationId={webhookIntegration.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
