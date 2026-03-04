'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { trpc } from '@/trpc/client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptInvite = trpc.member.acceptInvite.useMutation()

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      await acceptInvite.mutateAsync({ token })

      // Refresh session to pick up new JWT claims
      const supabase = createClient()
      await supabase.auth.refreshSession()

      router.push('/projects')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">You&apos;ve been invited</CardTitle>
        <CardDescription>Accept this invitation to join the organization on BrandFlow</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Button onClick={handleAccept} className="w-full" disabled={loading}>
          {loading ? 'Accepting...' : 'Accept Invitation'}
        </Button>
      </CardContent>
    </Card>
  )
}
