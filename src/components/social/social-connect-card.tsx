'use client'

import { useState } from 'react'
import { trpc } from '@/trpc/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Instagram, Facebook, Twitter, Linkedin, ExternalLink, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { PLATFORM_LABELS } from '@/lib/constants'
import type { ContentPlatform } from '@/types/enums'
import type { LucideIcon } from 'lucide-react'

const PLATFORM_ICONS: Partial<Record<ContentPlatform, LucideIcon>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
}

const PLATFORM_DESCRIPTIONS: Partial<Record<ContentPlatform, string>> = {
  instagram: 'Connect your Instagram Business account to publish posts and stories directly.',
  facebook: 'Connect a Facebook Page to schedule and publish content.',
  twitter: 'Connect your X (Twitter) account to publish tweets.',
  linkedin: 'Connect a LinkedIn Organization page for publishing updates.',
}

function getAuthUrl(platform: ContentPlatform, brandId: string): string {
  switch (platform) {
    case 'facebook':
    case 'instagram':
      return `/api/auth/meta?brandId=${brandId}`
    case 'twitter':
      return `/api/auth/twitter?brandId=${brandId}`
    case 'linkedin':
      return `/api/auth/linkedin?brandId=${brandId}`
    default:
      return '#'
  }
}

interface SocialConnectCardProps {
  brandId: string
  platform: ContentPlatform
}

export function SocialConnectCard({ brandId, platform }: SocialConnectCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const utils = trpc.useUtils()

  const { data: connections, isLoading } = trpc.social.getConnections.useQuery({ brandId })

  const disconnectMutation = trpc.social.disconnect.useMutation({
    onSuccess: () => {
      toast.success(`${PLATFORM_LABELS[platform]} disconnected`)
      utils.social.getConnections.invalidate({ brandId })
      utils.social.getConnectionsByOrg.invalidate()
      setShowDisconnectDialog(false)
    },
    onError: (error) => {
      toast.error(`Failed to disconnect: ${error.message}`)
    },
  })

  const Icon = PLATFORM_ICONS[platform]
  const label = PLATFORM_LABELS[platform]
  const description = PLATFORM_DESCRIPTIONS[platform] ?? `Connect your ${label} account.`

  // Find connection for this platform
  const connection = connections?.find((c: any) => c.platform === platform)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            {label}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              window.location.href = getAuthUrl(platform, brandId)
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Connect {label}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const pageName = (connection as any).platform_page_name ?? (connection as any).platform_user_name ?? 'Connected account'
  const pageUrl = (connection as any).platform_page_url ?? null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5" />}
              {label}
            </CardTitle>
            <Badge variant="outline" className="border-green-500 text-green-600">
              Connected
            </Badge>
          </div>
          <CardDescription>
            Connected as <span className="font-medium">{pageName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pageUrl && (
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {pageUrl}
            </a>
          )}

          <div>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={disconnectMutation.isPending}
            >
              <Unlink className="mr-2 h-4 w-4" />
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the {label} connection for this brand. You will no longer be able to
              publish content to this account until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disconnectMutation.mutate({ connectionId: (connection as any).id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
