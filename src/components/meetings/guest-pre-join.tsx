'use client'

import { useState } from 'react'
import { Video, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GuestPreJoinProps {
  roomName: string
  projectName?: string
  organizationName?: string
  onJoin: (name: string, email?: string) => Promise<void>
}

export function GuestPreJoin({ roomName, projectName, organizationName, onJoin }: GuestPreJoinProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setJoining(true)
    setError(null)

    try {
      await onJoin(name.trim(), email.trim() || undefined)
    } catch (err: any) {
      setError(err.message || 'Failed to join meeting')
      setJoining(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border bg-card shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Video className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{roomName}</h1>
          {projectName && (
            <p className="text-sm text-muted-foreground mt-1">{projectName}</p>
          )}
          {organizationName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Hosted by {organizationName}
            </p>
          )}
        </div>

        {/* Join form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Your Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="guest-name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
                autoFocus
                disabled={joining}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-email">Email (optional)</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={joining}
            />
            <p className="text-xs text-muted-foreground">
              Provide your email to receive meeting notes after the session.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!name.trim() || joining}
          >
            {joining ? 'Joining...' : 'Join Meeting'}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-4">
          No account needed. Your camera and microphone will be requested.
        </p>
      </div>
    </div>
  )
}
