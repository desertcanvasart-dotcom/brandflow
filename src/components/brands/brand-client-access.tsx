'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus, Trash2, Users } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export function BrandClientAccess({ brandId }: { brandId: string }) {
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)

  const utils = trpc.useUtils()
  const { data: accessList, isLoading } = trpc.portal.listAccess.useQuery({ brandId })

  const grantMutation = trpc.portal.grantAccess.useMutation({
    onSuccess: () => {
      utils.portal.listAccess.invalidate({ brandId })
      toast.success('Client access granted')
      setEmail('')
      setOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const revokeMutation = trpc.portal.revokeAccess.useMutation({
    onSuccess: () => {
      utils.portal.listAccess.invalidate({ brandId })
      toast.success('Access revoked')
    },
    onError: (err) => toast.error(err.message),
  })

  function handleGrant() {
    if (!email.trim()) return
    grantMutation.mutate({ brandId, email })
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="mt-4 space-y-3">
            <div className="h-10 rounded bg-muted" />
            <div className="h-10 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Client Access</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Grant clients access to review content and track project progress in the portal.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Grant Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Client Access</DialogTitle>
                <DialogDescription>
                  Enter the email of the client user. They must have an account first.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="client-email">Client Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="client@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGrant} disabled={grantMutation.isPending}>
                  Grant Access
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {accessList && accessList.length > 0 ? (
          <div className="space-y-3">
            {accessList.map((access) => (
              <div
                key={access.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{access.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Granted {formatDate(access.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => revokeMutation.mutate({ accessId: access.id })}
                  disabled={revokeMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
            <div className="text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No clients have access to this brand yet.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
