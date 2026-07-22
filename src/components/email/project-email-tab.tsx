'use client'

import { useState } from 'react'
import { Mail, Plus, LinkIcon } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmailThreadList } from './email-thread-list'
import { ThreadViewer } from './thread-viewer'
import { ComposeDialog } from './compose-dialog'

interface ProjectEmailTabProps {
  projectId: string
  brandId?: string | null
}

export function ProjectEmailTab({ projectId, brandId }: ProjectEmailTabProps) {
  const utils = trpc.useUtils()
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>()
  const [composeOpen, setComposeOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  const { data: connections } = trpc.email.listConnections.useQuery()
  const hasConnections = (connections ?? []).length > 0

  // For linking unlinked threads
  const { data: unlinkedData } = trpc.email.listThreads.useQuery(
    { unlinked: true, limit: 50 },
    { enabled: linkDialogOpen },
  )

  const linkMutation = trpc.email.linkToProject.useMutation({
    onSuccess: () => {
      toast.success('Thread linked to project')
      utils.email.listThreads.invalidate()
      setLinkDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  if (!hasConnections) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Mail className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No Email Accounts Connected</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Connect your Gmail or Outlook account in Settings to start tracking email conversations within this project.
        </p>
        <Button variant="outline" asChild>
          <a href="/settings?section=email">Go to Settings</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-16rem)] border rounded-lg overflow-hidden">
      {/* Left panel: Thread list */}
      <div className="w-[380px] border-r flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <h3 className="text-sm font-medium">Email Threads</h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setLinkDialogOpen(true)}
            >
              <LinkIcon className="h-3.5 w-3.5 mr-1" />
              Link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setComposeOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Compose
            </Button>
          </div>
        </div>

        <EmailThreadList
          projectId={projectId}
          onSelectThread={setSelectedThreadId}
          selectedThreadId={selectedThreadId}
        />
      </div>

      {/* Right panel: Thread viewer */}
      <div className="flex-1 min-w-0">
        {selectedThreadId ? (
          <ThreadViewer
            threadId={selectedThreadId}
            onLinkToProject={() => setLinkDialogOpen(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Mail className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Select a thread to view</p>
          </div>
        )}
      </div>

      {/* Compose dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        projectId={projectId}
        onSent={() => {
          utils.email.listThreads.invalidate()
        }}
      />

      {/* Link thread dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Email Thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select an unlinked email thread to associate with this project.
            </p>
            {unlinkedData?.items && unlinkedData.items.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {unlinkedData.items.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() =>
                      linkMutation.mutate({
                        threadId: thread.id,
                        projectId,
                      })
                    }
                    className="w-full text-left rounded-md border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    disabled={linkMutation.isPending}
                  >
                    <p className="text-sm font-medium truncate">{thread.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {(thread.participants as string[])?.join(', ')}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No unlinked threads available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
