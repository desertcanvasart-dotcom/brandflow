'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { SocialConnectCard } from '@/components/social/social-connect-card'
import { MetaPageSelector } from '@/components/social/meta-page-selector'
import { LinkedInOrgSelector } from '@/components/social/linkedin-org-selector'
import { trpc } from '@/trpc/client'
import type { ContentPlatform } from '@/types/enums'

const SOCIAL_PLATFORMS: ContentPlatform[] = ['facebook', 'instagram', 'twitter', 'linkedin']

interface MetaPage {
  id: string
  name: string
  picture?: string
}

interface LinkedInOrganization {
  id: string
  name: string
  logoUrl?: string
  vanityName?: string
}

interface BrandSocialSettingsProps {
  brandId: string
  brandPlatforms: ContentPlatform[]
}

export function BrandSocialSettings({ brandId, brandPlatforms }: BrandSocialSettingsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const utils = trpc.useUtils()

  const [pendingPages, setPendingPages] = useState<MetaPage[] | null>(null)
  const [pendingOrgs, setPendingOrgs] = useState<LinkedInOrganization[] | null>(null)

  // Filter to only social platforms that the brand has configured
  const socialPlatforms = brandPlatforms.filter((p) => SOCIAL_PLATFORMS.includes(p))

  // Drop the flow params so a refresh doesn't reopen a picker
  const clearFlowParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('meta')
    params.delete('linkedin')
    params.set('tab', 'social')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  // Meta and LinkedIn both return here when the account manages more than one
  // Page / organization. The list lives in an httpOnly cookie, so fetch it back
  // to choose from.
  useEffect(() => {
    const wantsMeta = searchParams.get('meta') === 'select_page'
    const wantsLinkedIn = searchParams.get('linkedin') === 'select_org'
    if (!wantsMeta && !wantsLinkedIn) return

    const endpoint = wantsMeta
      ? '/api/auth/meta/pages'
      : '/api/auth/linkedin/organizations'
    const label = wantsMeta ? 'Facebook Pages' : 'LinkedIn organizations'

    let cancelled = false

    fetch(endpoint)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error ?? `Could not load your ${label}`)
        return data as {
          brandId: string
          pages?: MetaPage[]
          organizations?: LinkedInOrganization[]
        }
      })
      .then((data) => {
        if (cancelled) return
        if (data.brandId !== brandId) {
          toast.error('That connection was started for a different brand.')
          clearFlowParams()
          return
        }
        if (wantsMeta) setPendingPages(data.pages ?? [])
        else setPendingOrgs(data.organizations ?? [])
      })
      .catch((err: Error) => {
        if (cancelled) return
        toast.error(err.message)
        clearFlowParams()
      })

    return () => {
      cancelled = true
    }
  }, [searchParams, brandId, clearFlowParams])

  function refreshConnections() {
    utils.social.getConnections.invalidate({ brandId })
    utils.social.getConnectionsByOrg.invalidate()
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Social Media Connections</h3>
        <p className="text-sm text-muted-foreground">
          Connect your social accounts to enable direct publishing from Agency Beats
        </p>
      </div>

      {socialPlatforms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No social platforms configured for this brand. Edit the brand settings to add platforms
            like Instagram, Facebook, X (Twitter), or LinkedIn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {socialPlatforms.map((platform) => (
            <SocialConnectCard key={platform} brandId={brandId} platform={platform} />
          ))}
        </div>
      )}

      {pendingPages && (
        <MetaPageSelector
          brandId={brandId}
          pages={pendingPages}
          open
          onOpenChange={(open) => {
            if (open) return
            setPendingPages(null)
            clearFlowParams()
          }}
          onComplete={() => {
            refreshConnections()
            setPendingPages(null)
            clearFlowParams()
          }}
        />
      )}

      {pendingOrgs && (
        <LinkedInOrgSelector
          brandId={brandId}
          organizations={pendingOrgs}
          open
          onOpenChange={(open) => {
            if (open) return
            setPendingOrgs(null)
            clearFlowParams()
          }}
          onComplete={() => {
            refreshConnections()
            setPendingOrgs(null)
            clearFlowParams()
          }}
        />
      )}
    </div>
  )
}
