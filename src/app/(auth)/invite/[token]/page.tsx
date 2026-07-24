'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { trpc } from '@/trpc/client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const token = params.token as string
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = trpc.member.invitePreview.useQuery({ token }, { retry: false })
  const acceptInvite = trpc.member.acceptInvite.useMutation()
  const signupViaInvite = trpc.member.signupViaInvite.useMutation()

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setSignedIn(!!data.user))
  }, [])

  const handleAccept = async () => {
    setLoading(true)
    setError(null)

    try {
      await acceptInvite.mutateAsync({ token })
      await createClient().auth.refreshSession()
      router.push('/projects')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { email } = await signupViaInvite.mutateAsync({ token, password, displayName })
      const { error: signInError } = await createClient().auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      router.push('/projects')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create your account')
      setLoading(false)
    }
  }

  if (preview.isError) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Invitation not valid</CardTitle>
          <CardDescription>
            This invitation has expired or has already been used. Ask for a new one.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!preview.data || signedIn === null) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardDescription>Loading invitation…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">You&apos;ve been invited</CardTitle>
        <CardDescription>
          Join {preview.data.organizationName} on Agency Beats as {preview.data.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        {signedIn ? (
          <>
            <Button onClick={handleAccept} className="w-full" disabled={loading}>
              {loading ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Signed in as someone else?{' '}
              <Link href="/login" className="underline">
                Switch account
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Your name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Choose a password</Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Accept & create account'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Sign in
              </Link>{' '}
              first, then reopen this link.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
