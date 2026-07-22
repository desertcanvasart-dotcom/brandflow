'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { MoreHorizontal, Pencil, Trash2, X, Check, MessageSquare, CheckSquare, Target, Pin, PinOff } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { AttachmentCard, type ChatAttachment } from './attachment-card'
import { EmojiReactions, type ReactionData } from './emoji-reactions'
import type { MessageWithUser } from '@/trpc/routers/chat'

interface MessageBubbleProps {
  message: MessageWithUser
  isOwn: boolean
  projectId: string | null
  channelId: string
  currentUserId: string
  reactions?: Record<string, ReactionData>
  onOpenThread?: (messageId: string) => void
  onCreateTask?: (message: MessageWithUser) => void
  isDecision?: boolean
  isPinned?: boolean
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Replace @[Display Name](userId) with styled spans
function renderContent(content: string) {
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g)

  return parts.map((part, i) => {
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/)
    if (mentionMatch) {
      return (
        <span key={i} className="font-medium text-primary">
          @{mentionMatch[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function MessageBubble({
  message,
  isOwn,
  projectId,
  channelId,
  currentUserId,
  reactions,
  onOpenThread,
  onCreateTask,
  isDecision,
  isPinned,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const utils = trpc.useUtils()

  const editMutation = trpc.chat.editMessage.useMutation({
    onSuccess: () => {
      setIsEditing(false)
      utils.chat.getMessages.invalidate({ channelId: message.channel_id })
    },
  })

  const deleteMutation = trpc.chat.deleteMessage.useMutation({
    onSuccess: () => {
      setDeleteOpen(false)
      utils.chat.getMessages.invalidate({ channelId: message.channel_id })
    },
  })

  const markDecisionMutation = trpc.chat.markAsDecision.useMutation({
    onSuccess: () => {
      toast.success('Message marked as decision')
      utils.chat.getProjectDecisions.invalidate()
      utils.chat.getMessages.invalidate({ channelId: message.channel_id })
    },
    onError: (err) => {
      toast.error(err.message === 'Message is already marked as a decision'
        ? 'Already marked as a decision'
        : 'Failed to mark as decision')
    },
  })

  const pinMutation = trpc.chat.pinMessage.useMutation({
    onSuccess: () => {
      toast.success('Message pinned')
      utils.chat.getPinnedMessages.invalidate({ channelId })
      utils.chat.getChannelStats.invalidate()
    },
    onError: (err) => {
      toast.error(err.message === 'Maximum 5 pinned messages allowed'
        ? 'Max 5 pinned messages'
        : 'Failed to pin message')
    },
  })

  const unpinMutation = trpc.chat.unpinMessage.useMutation({
    onSuccess: () => {
      toast.success('Message unpinned')
      utils.chat.getPinnedMessages.invalidate({ channelId })
      utils.chat.getChannelStats.invalidate()
    },
  })

  // Auto-focus edit textarea
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(
        editRef.current.value.length,
        editRef.current.value.length
      )
    }
  }, [isEditing])

  const initials = message.user?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Parse attachments
  const attachments: ChatAttachment[] = (() => {
    try {
      const raw = typeof message.attachments === 'string'
        ? JSON.parse(message.attachments)
        : message.attachments
      if (!Array.isArray(raw)) return []
      return raw.filter((a: { type: string }) => a.type !== 'system') as ChatAttachment[]
    } catch {
      return []
    }
  })()

  const handleEditSave = () => {
    const trimmed = editContent.trim()
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false)
      setEditContent(message.content)
      return
    }
    editMutation.mutate({ messageId: message.id, content: trimmed })
  }

  const hasProjectActions = !!projectId

  return (
    <div className="group flex gap-3 px-4 py-1.5 hover:bg-muted/30 relative">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        {message.user?.avatar_url && (
          <AvatarImage src={message.user.avatar_url} alt={message.user.display_name} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">
            {message.user?.display_name ?? 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground">{time}</span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground/60">(edited)</span>
          )}
          {isDecision && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              <Target className="h-2.5 w-2.5" />
              Decision
            </span>
          )}
          {isPinned && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Pin className="h-2.5 w-2.5" />
              Pinned
            </span>
          )}
        </div>

        {/* Message content or edit mode */}
        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEditSave()
                }
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setEditContent(message.content)
                }
              }}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editMutation.isPending || !editContent.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(message.content)
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs hover:bg-muted"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {renderContent(message.content)}
          </p>
        )}

        {/* Attachment cards */}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1">
            {attachments.map((att) => (
              <AttachmentCard
                key={`${att.type}-${att.id}`}
                attachment={att}
                projectId={projectId}
              />
            ))}
          </div>
        )}

        {/* Thread reply indicator */}
        {message.reply_count > 0 && (
          <button
            type="button"
            onClick={() => onOpenThread?.(message.id)}
            className="mt-1 flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            <span className="font-medium">
              {message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}
            </span>
            {message.last_reply_at && (
              <span className="text-muted-foreground">
                · {formatRelativeTime(message.last_reply_at)}
              </span>
            )}
          </button>
        )}

        {/* Emoji reactions */}
        <EmojiReactions
          messageId={message.id}
          reactions={reactions}
        />
      </div>

      {/* Actions dropdown — shows on all messages */}
      {!isEditing && (
        <div className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {/* Own-message actions */}
              {isOwn && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsEditing(true)
                      setEditContent(message.content)
                    }}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}

              {/* Project-specific actions */}
              {hasProjectActions && (
                <>
                  {isOwn && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => onCreateTask?.(message)}>
                    <CheckSquare className="mr-2 h-3.5 w-3.5" />
                    Create Task
                  </DropdownMenuItem>
                  {!isDecision && (
                    <DropdownMenuItem
                      onClick={() =>
                        markDecisionMutation.mutate({
                          messageId: message.id,
                          projectId: projectId!,
                        })
                      }
                      disabled={markDecisionMutation.isPending}
                    >
                      <Target className="mr-2 h-3.5 w-3.5" />
                      Mark as Decision
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {/* Pin/Unpin — available on all channels */}
              {(isOwn || hasProjectActions) && <DropdownMenuSeparator />}
              {isPinned ? (
                <DropdownMenuItem
                  onClick={() =>
                    unpinMutation.mutate({
                      channelId,
                      messageId: message.id,
                    })
                  }
                  disabled={unpinMutation.isPending}
                >
                  <PinOff className="mr-2 h-3.5 w-3.5" />
                  Unpin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() =>
                    pinMutation.mutate({
                      channelId,
                      messageId: message.id,
                    })
                  }
                  disabled={pinMutation.isPending}
                >
                  <Pin className="mr-2 h-3.5 w-3.5" />
                  Pin Message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ messageId: message.id })}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
