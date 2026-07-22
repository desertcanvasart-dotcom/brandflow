'use client'

import { SocialConnectCard } from '@/components/social/social-connect-card'
import type { ContentPlatform } from '@/types/enums'

const SOCIAL_PLATFORMS: ContentPlatform[] = ['facebook', 'instagram', 'twitter', 'linkedin']

interface BrandSocialSettingsProps {
  brandId: string
  brandPlatforms: ContentPlatform[]
}

export function BrandSocialSettings({ brandId, brandPlatforms }: BrandSocialSettingsProps) {
  // Filter to only social platforms that the brand has configured
  const socialPlatforms = brandPlatforms.filter((p) => SOCIAL_PLATFORMS.includes(p))

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
    </div>
  )
}
