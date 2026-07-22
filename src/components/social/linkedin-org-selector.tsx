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
import { Loader2, Linkedin, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface LinkedInOrganization {
  id: string
  name: string
  logoUrl?: string
  vanityName?: string
}

interface LinkedInOrgSelectorProps {
  brandId: string
  organizations: LinkedInOrganization[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function LinkedInOrgSelector({
  brandId,
  organizations,
  open,
  onOpenChange,
  onComplete,
}: LinkedInOrgSelectorProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConnect = async () => {
    if (!selectedOrgId) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/linkedin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, organizationId: selectedOrgId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to connect organization')
      }

      toast.success('LinkedIn Organization connected successfully')
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect organization')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            Select a LinkedIn Organization
          </DialogTitle>
          <DialogDescription>
            Choose which LinkedIn Organization page to connect to this brand.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-2 py-2">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setSelectedOrgId(org.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selectedOrgId === org.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted',
              )}
            >
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Linkedin className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{org.name}</p>
                {org.vanityName && (
                  <p className="text-xs text-muted-foreground truncate">@{org.vanityName}</p>
                )}
              </div>
              {selectedOrgId === org.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>

        {organizations.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No LinkedIn Organizations found. Make sure your account has admin access to at least
              one LinkedIn Organization page.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!selectedOrgId || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
