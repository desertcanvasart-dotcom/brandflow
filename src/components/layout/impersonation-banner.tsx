'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { trpc } from '@/trpc/client'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ImpersonationBanner() {
  const { isImpersonating, isSuperAdmin } = useCurrentUser()
  const router = useRouter()
  const returnMutation = trpc.superAdmin.returnToOwnOrg.useMutation({
    onSuccess: () => {
      router.push('/super-admin')
      router.refresh()
    },
  })

  if (!isImpersonating || !isSuperAdmin) return null

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        <span>You are viewing this organization as a Super Admin</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-amber-950 hover:bg-amber-600"
        onClick={() => returnMutation.mutate()}
        disabled={returnMutation.isPending}
      >
        <ArrowLeft className="mr-1 h-3 w-3" />
        Return to Super Admin
      </Button>
    </div>
  )
}
