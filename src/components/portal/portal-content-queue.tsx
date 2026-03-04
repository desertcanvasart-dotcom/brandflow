'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, MessageSquare, FileText } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { formatRelative } from '@/lib/utils'
import { TASK_STATUS_LABELS, PLATFORM_LABELS } from '@/lib/constants'
import type { ContentPlatform } from '@/types/enums'

export function PortalContentQueue({ brandId }: { brandId: string }) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'changes' | null>(null)
  const [comment, setComment] = useState('')

  const utils = trpc.useUtils()
  const { data: tasks, isLoading } = trpc.portal.getContentQueue.useQuery({ brandId })

  const approveMutation = trpc.portal.approve.useMutation({
    onSuccess: () => {
      utils.portal.getContentQueue.invalidate({ brandId })
      toast.success('Content approved')
      closeDialog()
    },
    onError: (err) => toast.error(err.message),
  })

  const requestChangesMutation = trpc.portal.requestChanges.useMutation({
    onSuccess: () => {
      utils.portal.getContentQueue.invalidate({ brandId })
      toast.success('Changes requested')
      closeDialog()
    },
    onError: (err) => toast.error(err.message),
  })

  function openApprove(taskId: string) {
    setSelectedTaskId(taskId)
    setAction('approve')
    setComment('')
  }

  function openRequestChanges(taskId: string) {
    setSelectedTaskId(taskId)
    setAction('changes')
    setComment('')
  }

  function closeDialog() {
    setSelectedTaskId(null)
    setAction(null)
    setComment('')
  }

  function handleSubmit() {
    if (!selectedTaskId) return
    if (action === 'approve') {
      approveMutation.mutate({ taskId: selectedTaskId, comment: comment || undefined })
    } else if (action === 'changes') {
      if (!comment.trim()) {
        toast.error('Please describe what changes are needed')
        return
      }
      requestChangesMutation.mutate({ taskId: selectedTaskId, comment })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="mt-3 h-4 w-full rounded bg-muted" />
              <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <div className="text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No content awaiting review</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll see content here when your agency submits items for your approval.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => {
          const contentItem = task.content_items?.[0]
          return (
            <Card key={task.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <Badge variant="secondary">
                    {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {contentItem && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {contentItem.platform && (
                        <Badge variant="outline">
                          {PLATFORM_LABELS[contentItem.platform as ContentPlatform] ?? contentItem.platform}
                        </Badge>
                      )}
                      <span>Updated {formatRelative(task.updated_at)}</span>
                    </div>
                    {contentItem.body && (
                      <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                        {contentItem.body}
                      </div>
                    )}
                  </div>
                )}
                {task.description && !contentItem && (
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => openApprove(task.id)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRequestChanges(task.id)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Request Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!action} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Content' : 'Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? 'Optionally leave a comment with your approval.'
                : 'Describe what changes you would like made.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={
              action === 'approve'
                ? 'Great work! (optional)'
                : 'Please describe the changes needed...'
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={approveMutation.isPending || requestChangesMutation.isPending}
            >
              {action === 'approve' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
