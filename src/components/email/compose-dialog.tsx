'use client'

import { useState } from 'react'
import { Send, Loader2, X, Plus } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'compose' | 'reply'
  threadId?: string
  threadSubject?: string
  projectId?: string
  onSent?: () => void
  defaultTo?: string[]
}

export function ComposeDialog({
  open,
  onOpenChange,
  mode = 'compose',
  threadId,
  threadSubject,
  projectId,
  onSent,
  defaultTo,
}: ComposeDialogProps) {
  const [to, setTo] = useState<string[]>(defaultTo ?? [])
  const [toInput, setToInput] = useState('')
  const [cc, setCc] = useState<string[]>([])
  const [ccInput, setCcInput] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(
    mode === 'reply' && threadSubject ? `Re: ${threadSubject}` : '',
  )
  const [body, setBody] = useState('')
  const [selectedConnection, setSelectedConnection] = useState<string>('')

  const { data: connections } = trpc.email.listConnections.useQuery()

  const sendMutation = trpc.email.sendMessage.useMutation({
    onSuccess: () => {
      toast.success('Email sent!')
      onSent?.()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const replyMutation = trpc.email.replyToThread.useMutation({
    onSuccess: () => {
      toast.success('Reply sent!')
      onSent?.()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function addEmail(list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) {
    const email = input.trim()
    if (email && email.includes('@') && !list.includes(email)) {
      setList([...list, email])
      setInput('')
    }
  }

  function removeEmail(list: string[], setList: (v: string[]) => void, email: string) {
    setList(list.filter((e) => e !== email))
  }

  function handleSend() {
    const connectionId = selectedConnection || connections?.[0]?.id
    if (!connectionId) {
      toast.error('No email account connected')
      return
    }

    if (mode === 'reply' && threadId) {
      replyMutation.mutate({
        threadId,
        bodyHtml: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        to: to.length > 0 ? to : undefined,
        cc: cc.length > 0 ? cc : undefined,
      })
    } else {
      if (to.length === 0) {
        toast.error('Please add at least one recipient')
        return
      }
      if (!subject.trim()) {
        toast.error('Please enter a subject')
        return
      }

      sendMutation.mutate({
        connectionId,
        to,
        cc: cc.length > 0 ? cc : undefined,
        subject,
        bodyHtml: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        projectId,
      })
    }
  }

  const isPending = sendMutation.isPending || replyMutation.isPending
  const activeConnections = connections?.filter((c) => c.is_active) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'reply' ? 'Reply' : 'Compose Email'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection selector */}
          {activeConnections.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Select
                value={selectedConnection || activeConnections[0]?.id || ''}
                onValueChange={setSelectedConnection}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {activeConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.email_address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* To field */}
          {mode === 'compose' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">To</Label>
                {!showCc && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setShowCc(true)}
                  >
                    CC
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
                {to.map((email) => (
                  <Badge key={email} variant="secondary" className="text-xs gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(to, setTo, email)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="email"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                      e.preventDefault()
                      addEmail(to, setTo, toInput, setToInput)
                    }
                  }}
                  onBlur={() => addEmail(to, setTo, toInput, setToInput)}
                  placeholder={to.length === 0 ? 'Add recipients...' : ''}
                  className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          )}

          {/* CC field */}
          {showCc && mode === 'compose' && (
            <div className="space-y-1.5">
              <Label className="text-xs">CC</Label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] rounded-md border px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
                {cc.map((email) => (
                  <Badge key={email} variant="secondary" className="text-xs gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(cc, setCc, email)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <input
                  type="email"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                      e.preventDefault()
                      addEmail(cc, setCc, ccInput, setCcInput)
                    }
                  }}
                  onBlur={() => addEmail(cc, setCc, ccInput, setCcInput)}
                  placeholder="Add CC..."
                  className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          {mode === 'compose' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="h-9"
              />
            </div>
          )}

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={8}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isPending || (mode === 'compose' && to.length === 0)}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
