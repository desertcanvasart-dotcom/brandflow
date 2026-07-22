'use client'

import { useState } from 'react'
import {
  Mail,
  Reply,
  Star,
  Archive,
  LinkIcon,
  Unlink,
  Loader2,
  Paperclip,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ComposeDialog } from './compose-dialog'

interface ThreadViewerProps {
  threadId: string
  onLinkToProject?: () => void
}

export function ThreadViewer({ threadId, onLinkToProject }: ThreadViewerProps) {
  const utils = trpc.useUtils()
  const [replyOpen, setReplyOpen] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = trpc.email.getThread.useQuery({ threadId })

  const starMutation = trpc.email.toggleStar.useMutation({
    onSuccess: (result) => {
      toast.success(result.is_starred ? 'Starred' : 'Unstarred')
      utils.email.getThread.invalidate({ threadId })
      utils.email.listThreads.invalidate()
    },
  })

  const archiveMutation = trpc.email.archiveThread.useMutation({
    onSuccess: () => {
      toast.success('Thread archived')
      utils.email.listThreads.invalidate()
    },
  })

  const unlinkMutation = trpc.email.unlinkFromProject.useMutation({
    onSuccess: () => {
      toast.success('Thread unlinked from project')
      utils.email.getThread.invalidate({ threadId })
      utils.email.listThreads.invalidate()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Mail className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Failed to load thread</p>
      </div>
    )
  }

  const { thread, messages } = data
  const connection = (thread as any).email_connections

  function toggleMessage(messageId: string) {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  // By default, expand the last message, collapse others
  const isExpanded = (msgId: string, index: number) =>
    expandedMessages.has(msgId) || index === messages.length - 1

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">{thread.subject}</h2>
            <div className="flex items-center gap-2 mt-1">
              {connection && (
                <Badge variant="secondary" className="text-xs">
                  via {connection.email_address}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => starMutation.mutate({ threadId })}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  thread.is_starred && 'fill-yellow-400 text-yellow-400',
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => archiveMutation.mutate({ threadId })}
            >
              <Archive className="h-4 w-4" />
            </Button>
            {thread.project_id ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => unlinkMutation.mutate({ threadId })}
              >
                <Unlink className="h-3.5 w-3.5 mr-1" />
                Unlink
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={onLinkToProject}
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
                Link to Project
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg: any, index: number) => {
          const expanded = isExpanded(msg.id, index)
          const attachments = msg.email_attachments ?? []

          return (
            <div key={msg.id} className="rounded-lg border">
              {/* Message header (always visible) */}
              <button
                type="button"
                onClick={() => toggleMessage(msg.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                      msg.is_outbound
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {(msg.from_name ?? msg.from_address)?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {msg.from_name ?? msg.from_address}
                      </span>
                      {msg.is_outbound && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          Sent
                        </Badge>
                      )}
                    </div>
                    {!expanded && (
                      <p className="text-xs text-muted-foreground truncate">
                        {msg.body_text?.slice(0, 100) ?? ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {attachments.length > 0 && (
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.sent_at), 'MMM d, h:mm a')}
                  </span>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {expanded && (
                <div className="px-4 pb-4 border-t">
                  {/* To/CC */}
                  <div className="py-2 text-xs text-muted-foreground space-y-0.5">
                    <p>
                      <span className="font-medium">From:</span> {msg.from_name ? `${msg.from_name} <${msg.from_address}>` : msg.from_address}
                    </p>
                    <p>
                      <span className="font-medium">To:</span> {(msg.to_addresses as string[])?.join(', ')}
                    </p>
                    {msg.cc_addresses?.length > 0 && (
                      <p>
                        <span className="font-medium">CC:</span> {(msg.cc_addresses as string[])?.join(', ')}
                      </p>
                    )}
                  </div>

                  <Separator className="my-2" />

                  {/* Body */}
                  {msg.body_html ? (
                    <div
                      className="prose prose-sm max-w-none dark:prose-invert mt-3"
                      dangerouslySetInnerHTML={{ __html: msg.body_html }}
                    />
                  ) : (
                    <pre className="text-sm whitespace-pre-wrap mt-3 font-sans">
                      {msg.body_text ?? ''}
                    </pre>
                  )}

                  {/* Attachments */}
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Attachments ({attachments.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((att: any) => (
                          <a
                            key={att.id}
                            href={att.storage_url ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors',
                              !att.storage_url && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{att.file_name}</span>
                            {att.size_bytes && (
                              <span className="text-muted-foreground">
                                ({(att.size_bytes / 1024).toFixed(0)}KB)
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Reply bar */}
      <div className="border-t px-6 py-3">
        <Button onClick={() => setReplyOpen(true)} className="w-full">
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </Button>
      </div>

      {/* Reply dialog */}
      {replyOpen && (
        <ComposeDialog
          open={replyOpen}
          onOpenChange={setReplyOpen}
          mode="reply"
          threadId={threadId}
          threadSubject={thread.subject}
          onSent={() => {
            setReplyOpen(false)
            utils.email.getThread.invalidate({ threadId })
            utils.email.listThreads.invalidate()
          }}
        />
      )}
    </div>
  )
}
