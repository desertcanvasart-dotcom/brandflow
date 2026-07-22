'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lock, Clock, Globe, Eye } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { StructuredDisplay } from '@/components/knowledge-base/display/structured-display'

const CONTENT_TYPE_LABELS: Record<string, string> = {
  persona: 'Customer Persona',
  strategy: 'Marketing Strategy',
  competitor: 'Competitor Analysis',
  campaign: 'Campaign History',
  sop: 'SOP / Process',
}

export default function PublicSharePage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [password, setPassword] = useState('')
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>(undefined)

  const { data, error, isLoading } = trpc.knowledgeBase.getPublicDocument.useQuery(
    { slug, password: submittedPassword },
    { retry: false }
  )

  // Loading state
  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    )
  }

  // Expired
  if (error?.message?.includes('expired')) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
          <Clock className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">This shared link has expired</h2>
          <p className="text-muted-foreground text-sm">
            Contact the sender to request access
          </p>
        </div>
      </PublicLayout>
    )
  }

  // Not found
  if (error?.message?.includes('not found') || error?.data?.code === 'NOT_FOUND') {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
          <Globe className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Document not found</h2>
          <p className="text-muted-foreground text-sm">
            This link may have been revoked or the document no longer exists
          </p>
        </div>
      </PublicLayout>
    )
  }

  // Wrong password
  if (error?.message?.includes('Incorrect password')) {
    return (
      <PublicLayout>
        <PasswordGate
          password={password}
          setPassword={setPassword}
          onSubmit={() => setSubmittedPassword(password)}
          error="Incorrect password. Please try again."
        />
      </PublicLayout>
    )
  }

  // Requires password (first load)
  if (data?.requiresPassword) {
    return (
      <PublicLayout>
        <PasswordGate
          password={password}
          setPassword={setPassword}
          onSubmit={() => setSubmittedPassword(password)}
        />
      </PublicLayout>
    )
  }

  // Document loaded successfully
  if (data && !data.requiresPassword) {
    return (
      <PublicLayout>
        <Card className="border-0 shadow-none">
          <CardHeader className="px-0">
            <div className="flex items-center gap-2 mb-2">
              {data.contentType && (
                <Badge variant="outline" className="text-xs">
                  {CONTENT_TYPE_LABELS[data.contentType] ?? data.contentType}
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {data.viewCount} views
              </span>
            </div>
            <CardTitle className="text-2xl">{data.title}</CardTitle>
            {data.description && (
              <p className="text-muted-foreground mt-1">{data.description}</p>
            )}
          </CardHeader>
          <CardContent className="px-0">
            {data.contentType && data.structuredData ? (
              <StructuredDisplay
                doc={{
                  content_type: data.contentType,
                  structured_data: data.structuredData,
                } as any}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No structured content available.
              </p>
            )}
          </CardContent>
        </Card>
      </PublicLayout>
    )
  }

  // Generic error
  return (
    <PublicLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-3">
        <Globe className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          {error?.message || 'Please try again later'}
        </p>
      </div>
    </PublicLayout>
  )
}

// ── Layout wrapper ────────────────────────────────────────────────
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Globe className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Agency Beats</span>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t mt-12">
        <div className="container mx-auto max-w-3xl px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <a href="/" className="hover:underline font-medium">
              Agency Beats
            </a>
          </p>
          {/* STAGE_B: Google Analytics integration for public pages */}
        </div>
      </footer>
    </div>
  )
}

// ── Password gate ─────────────────────────────────────────────────
function PasswordGate({
  password,
  setPassword,
  onSubmit,
  error,
}: {
  password: string
  setPassword: (v: string) => void
  onSubmit: () => void
  error?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
      <Lock className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-xl font-semibold">This document is password protected</h2>
      <p className="text-muted-foreground text-sm">Enter the password to view</p>
      <form
        className="flex gap-2 w-full max-w-xs"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
        <Button type="submit" disabled={!password.trim()}>
          View
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
