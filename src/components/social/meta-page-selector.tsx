'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Facebook, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MetaPage {
  id: string
  name: string
  picture?: string
  category?: string
}

interface MetaPageSelectorProps {
  brandId: string
  pages: MetaPage[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function MetaPageSelector({
  brandId,
  pages,
  open,
  onOpenChange,
  onComplete,
}: MetaPageSelectorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConnect = async () => {
    if (!selectedPageId) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, pageId: selectedPageId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to connect page')
      }

      toast.success('Facebook Page connected successfully')
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect page')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Select a Facebook Page
          </DialogTitle>
          <DialogDescription>
            Choose which Facebook Page to connect to this brand. You can only connect one page per
            brand.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-2 py-2">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedPageId(page.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selectedPageId === page.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted',
              )}
            >
              {page.picture ? (
                <img
                  src={page.picture}
                  alt={page.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Facebook className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{page.name}</p>
                {page.category && (
                  <p className="text-xs text-muted-foreground truncate">{page.category}</p>
                )}
              </div>
              {selectedPageId === page.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>

        {pages.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No Facebook Pages found. Make sure your account has admin access to at least one
              Facebook Page.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!selectedPageId || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
