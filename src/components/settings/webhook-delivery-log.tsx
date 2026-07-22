'use client'

import { useState } from 'react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, Eye, Loader2 } from 'lucide-react'

interface WebhookDeliveryLogProps {
  integrationId: string
}

export function WebhookDeliveryLog({ integrationId }: WebhookDeliveryLogProps) {
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false)
  const [selectedPayload, setSelectedPayload] = useState<unknown>(null)
  const utils = trpc.useUtils()

  const { data: logs, isLoading } = trpc.settings.getWebhookDeliveryLogs.useQuery({
    integrationId,
  })

  const retryMutation = trpc.settings.retryWebhookDelivery.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Retry succeeded (${result.statusCode})`)
      } else {
        toast.error(`Retry failed (${result.statusCode})`)
      }
      utils.settings.getWebhookDeliveryLogs.invalidate({ integrationId })
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!logs?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No delivery logs yet. Send a test payload to see logs here.
      </p>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Duration</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const isSuccess = log.status_code && log.status_code >= 200 && log.status_code < 300
              const isFailed = !log.status_code || log.status_code >= 400

              return (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {log.event_type}
                    </Badge>
                    {log.attempt_number > 1 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        (attempt {log.attempt_number})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.status_code ? (
                      <Badge
                        variant={isSuccess ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {log.status_code}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        Error
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.response_time_ms ? `${log.response_time_ms}ms` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setSelectedPayload(log.payload)
                          setPayloadDialogOpen(true)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {isFailed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={retryMutation.isPending}
                          onClick={() => retryMutation.mutate({ logId: log.id })}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Payload Viewer Dialog */}
      <Dialog open={payloadDialogOpen} onOpenChange={setPayloadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Payload</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-96">
            {JSON.stringify(selectedPayload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  )
}
