'use client'

import { trpc } from '@/trpc/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PLATFORM_LABELS } from '@/lib/constants'
import { RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { ContentPlatform } from '@/types/enums'

interface PublishLogDialogProps {
  contentItemId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PublishLogDialog({ contentItemId, open, onOpenChange }: PublishLogDialogProps) {
  const utils = trpc.useUtils()

  const { data: logEntries, isLoading } = trpc.social.getPublishLog.useQuery(
    { contentItemId },
    { enabled: open },
  )

  const retryMutation = trpc.social.retryPublish.useMutation({
    onSuccess: () => {
      toast.success('Content published successfully on retry')
      utils.social.getPublishLog.invalidate({ contentItemId })
    },
    onError: (error) => {
      toast.error(`Retry failed: ${error.message}`)
      utils.social.getPublishLog.invalidate({ contentItemId })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish History</DialogTitle>
          <DialogDescription>
            View the publishing history and retry failed attempts.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-3 py-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                </div>
              ))}
            </div>
          ) : !logEntries || logEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No publish attempts yet for this content item.
              </p>
            </div>
          ) : (
            logEntries.map((entry: any) => {
              const isSuccess = entry.status === 'success'
              const isFailed = entry.status === 'failed'
              const platform = entry.platform as ContentPlatform
              const platformLabel = PLATFORM_LABELS[platform] ?? platform

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{platformLabel}</span>
                      <Badge
                        variant={isSuccess ? 'outline' : 'destructive'}
                        className={
                          isSuccess
                            ? 'border-green-500 text-green-600'
                            : undefined
                        }
                      >
                        {isSuccess ? 'Success' : 'Failed'}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.attempted_at).toLocaleString()}
                    </p>

                    {isFailed && entry.error_message && (
                      <p className="text-xs text-destructive">{entry.error_message}</p>
                    )}

                    {isSuccess && entry.platform_post_url && (
                      <a
                        href={entry.platform_post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View post
                      </a>
                    )}
                  </div>

                  {isFailed && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryMutation.mutate({ publishLogId: entry.id })}
                      disabled={retryMutation.isPending}
                    >
                      {retryMutation.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-3 w-3" />
                      )}
                      Retry
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
