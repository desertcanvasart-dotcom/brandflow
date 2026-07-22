'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Trash2, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function SlackIntegration() {
  const utils = trpc.useUtils()
  const { data: integrations, isLoading } = trpc.notification.getIntegrations.useQuery()
  const slackIntegration = integrations?.find((i) => i.type === 'slack')

  const [webhookUrl, setWebhookUrl] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (slackIntegration) {
      setWebhookUrl((slackIntegration.config as Record<string, unknown>)?.webhook_url as string ?? '')
      setIsActive(slackIntegration.is_active)
    }
  }, [slackIntegration])

  const upsertMutation = trpc.notification.upsertIntegration.useMutation({
    onSuccess: () => {
      toast.success('Slack integration saved')
      utils.notification.getIntegrations.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.notification.deleteIntegration.useMutation({
    onSuccess: () => {
      toast.success('Slack integration removed')
      setWebhookUrl('')
      setIsActive(true)
      utils.notification.getIntegrations.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const testMutation = trpc.notification.testSlack.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Test message sent to Slack!')
      } else {
        toast.error('Failed to send test message')
      }
    },
    onError: () => toast.error('Failed to test webhook'),
  })

  function handleSave() {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL')
      return
    }
    upsertMutation.mutate({
      id: slackIntegration?.id,
      type: 'slack',
      name: 'Slack',
      config: { webhook_url: webhookUrl },
      isActive,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Slack Integration
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
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Slack Integration
        </CardTitle>
        <CardDescription>
          Send notifications to a Slack channel via incoming webhook.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slack-webhook">Webhook URL</Label>
          <Input
            id="slack-webhook"
            placeholder="https://hooks.slack.com/services/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Create an incoming webhook in your Slack workspace settings.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="slack-active">Active</Label>
          <Switch
            id="slack-active"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          {webhookUrl && (
            <Button
              variant="outline"
              onClick={() => testMutation.mutate({ webhookUrl })}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? 'Testing...' : 'Test Connection'}
            </Button>
          )}
          {slackIntegration && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate({ id: slackIntegration.id })}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
