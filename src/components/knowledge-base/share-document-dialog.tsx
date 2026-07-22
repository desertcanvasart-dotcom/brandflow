'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Share2,
  Copy,
  Check,
  Loader2,
  Link,
  Eye,
  Trash2,
  Lock,
  Calendar,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'

interface ShareDocumentDialogProps {
  documentId: string
  documentTitle: string
  isPublic?: boolean
  publicSlug?: string | null
  publicExpiresAt?: string | null
  publicViewCount?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDocumentDialog({
  documentId,
  documentTitle,
  isPublic,
  publicSlug,
  publicExpiresAt,
  publicViewCount,
  open,
  onOpenChange,
}: ShareDocumentDialogProps) {
  const [expiresAt, setExpiresAt] = useState('')
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const utils = trpc.useUtils()

  const createShareMutation = trpc.knowledgeBase.createShareLink.useMutation({
    onSuccess: (data) => {
      toast.success('Share link created')
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getById.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const revokeShareMutation = trpc.knowledgeBase.revokeShareLink.useMutation({
    onSuccess: () => {
      toast.success('Share link revoked')
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getById.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function handleCreateLink() {
    createShareMutation.mutate({
      documentId,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      password: password || undefined,
    })
  }

  function handleCopy() {
    const slug = createShareMutation.data?.slug ?? publicSlug
    if (!slug) return
    const url = `${window.location.origin}/kb/share/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRevoke() {
    revokeShareMutation.mutate({ documentId })
  }

  const isShared = isPublic || createShareMutation.isSuccess
  const activeSlug = createShareMutation.data?.slug ?? publicSlug
  const shareUrl = activeSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/kb/share/${activeSlug}` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Share &ldquo;{documentTitle}&rdquo; via a public link
          </DialogDescription>
        </DialogHeader>

        {!isShared ? (
          // ── Not yet shared ────────────────────────────
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a public link that anyone can access without logging in.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expiry date (optional)
              </Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Password protection (optional)
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreateLink}
              disabled={createShareMutation.isPending}
            >
              {createShareMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating link...</>
              ) : (
                <><Link className="mr-2 h-4 w-4" />Generate Share Link</>
              )}
            </Button>
          </div>
        ) : (
          // ── Already shared ────────────────────────────
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600">
                <Check className="mr-1 h-3 w-3" />
                Public link active
              </Badge>
            </div>

            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {publicViewCount ?? 0} views
              </span>
              {publicExpiresAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expires: {new Date(publicExpiresAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <Button
              variant="destructive"
              className="w-full"
              onClick={handleRevoke}
              disabled={revokeShareMutation.isPending}
            >
              {revokeShareMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</>
              ) : (
                <><Trash2 className="mr-2 h-4 w-4" />Revoke Link</>
              )}
            </Button>

            {/* STAGE_B: Email notification when a shared document is viewed */}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
