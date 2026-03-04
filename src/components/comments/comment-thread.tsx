'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Reply,
  CheckCircle2,
  Trash2,
  Lock,
  Send,
  CornerDownRight,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { useCurrentUser } from '@/hooks/use-current-user'

interface CommentThreadProps {
  taskId: string
}

export function CommentThread({ taskId }: CommentThreadProps) {
  const { user } = useCurrentUser()
  const utils = trpc.useUtils()

  const { data: comments, isLoading } = trpc.comment.list.useQuery({ taskId })

  const createMutation = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ taskId })
      setNewComment('')
      setReplyingTo(null)
      setReplyText('')
    },
    onError: (err) => toast.error(err.message),
  })

  const resolveMutation = trpc.comment.resolve.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ taskId })
      toast.success('Comment resolved')
    },
  })

  const deleteMutation = trpc.comment.delete.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ taskId })
      toast.success('Comment deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  function handleSubmit() {
    if (!newComment.trim()) return
    createMutation.mutate({
      taskId,
      body: newComment.trim(),
      isInternal,
    })
  }

  function handleReply(parentId: string) {
    if (!replyText.trim()) return
    createMutation.mutate({
      taskId,
      body: replyText.trim(),
      parentId,
    })
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function getInitials(authorId: string) {
    return authorId === user?.id ? 'You' : authorId.slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Comments
          {comments && comments.length > 0 && (
            <span className="ml-1 text-muted-foreground">({comments.length})</span>
          )}
        </span>
      </div>

      {/* Comment list */}
      {comments && comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-lg border p-3 ${
                comment.is_resolved ? 'opacity-60 bg-muted/30' : ''
              } ${comment.is_internal ? 'border-amber-200 bg-amber-50/50' : ''}`}
            >
              {/* Comment header */}
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary shrink-0">
                  {getInitials(comment.author_id)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTime(comment.created_at)}
                </span>
                {comment.is_internal && (
                  <Badge variant="outline" className="text-[10px] h-4 gap-0.5 border-amber-300 text-amber-600">
                    <Lock className="h-2.5 w-2.5" />
                    Internal
                  </Badge>
                )}
                {comment.is_resolved && (
                  <Badge variant="outline" className="text-[10px] h-4 gap-0.5 text-green-600 border-green-300">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Resolved
                  </Badge>
                )}
              </div>

              {/* Comment body */}
              <p className="text-sm whitespace-pre-wrap">{comment.body}</p>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-2">
                {!comment.is_resolved && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => resolveMutation.mutate({ id: comment.id })}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  </>
                )}
                {comment.author_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ id: comment.id })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-3 ml-4 space-y-2 border-l-2 border-muted pl-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary shrink-0">
                          {getInitials(reply.author_id)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(reply.created_at)}
                        </span>
                        {reply.author_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive ml-auto"
                            onClick={() => deleteMutation.mutate({ id: reply.id })}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="mt-3 ml-4 flex gap-2">
                  <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      rows={1}
                      className="text-xs min-h-[32px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleReply(comment.id)
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleReply(comment.id)}
                      disabled={!replyText.trim() || createMutation.isPending}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">No comments yet.</p>
      )}

      {/* New comment input */}
      <div className="space-y-2 pt-2 border-t">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit()
            }
          }}
        />
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${isInternal ? 'text-amber-600 bg-amber-50' : 'text-muted-foreground'}`}
            onClick={() => setIsInternal(!isInternal)}
          >
            <Lock className="h-3 w-3" />
            {isInternal ? 'Internal' : 'Mark internal'}
          </Button>
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={handleSubmit}
            disabled={!newComment.trim() || createMutation.isPending}
          >
            <Send className="h-3 w-3 mr-1" />
            {createMutation.isPending ? 'Sending...' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  )
}
