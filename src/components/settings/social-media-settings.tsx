'use client'

import { trpc } from '@/trpc/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Instagram, Facebook, Twitter, Linkedin, ExternalLink, type LucideIcon } from 'lucide-react'
import { PLATFORM_LABELS } from '@/lib/constants'
import type { ContentPlatform } from '@/types/enums'
import Link from 'next/link'

const SOCIAL_PLATFORMS: ContentPlatform[] = ['facebook', 'instagram', 'twitter', 'linkedin']

const PLATFORM_ICONS: Partial<Record<ContentPlatform, LucideIcon>> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
}

export function SocialMediaSettings() {
  const { data: connections, isLoading: connectionsLoading } =
    trpc.social.getConnectionsByOrg.useQuery()
  const { data: brands, isLoading: brandsLoading } = trpc.brand.list.useQuery()

  const isLoading = connectionsLoading || brandsLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const allBrands = brands ?? []

  // Group connections by brand_id
  const connectionsByBrand = new Map<string, any[]>()
  for (const conn of connections ?? []) {
    const brandId = (conn as any).brand_id as string
    if (!connectionsByBrand.has(brandId)) {
      connectionsByBrand.set(brandId, [])
    }
    connectionsByBrand.get(brandId)!.push(conn)
  }

  if (allBrands.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-1">Social Media Accounts</h3>
          <p className="text-sm text-muted-foreground">
            Manage social media connections across all your brands.
          </p>
        </div>
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No brands found. Create a brand first to connect social accounts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Overview of social media connections across all your brands. Click on a brand to manage its
          connections.
        </p>
      </div>

      {allBrands.map((brand: any) => {
        const brandConnections = connectionsByBrand.get(brand.id) ?? []
        const connectedPlatforms = new Set(
          brandConnections.map((c: any) => c.platform as ContentPlatform),
        )
        const brandPlatforms: ContentPlatform[] = (brand.platforms ?? []) as ContentPlatform[]
        const socialBrandPlatforms = brandPlatforms.filter((p) => SOCIAL_PLATFORMS.includes(p))

        return (
          <Card key={brand.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{brand.name}</CardTitle>
                <Link
                  href={`/brands/${brand.id}?tab=social`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Manage
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              {socialBrandPlatforms.length === 0 && (
                <CardDescription>No social platforms configured for this brand.</CardDescription>
              )}
            </CardHeader>
            {socialBrandPlatforms.length > 0 && (
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {socialBrandPlatforms.map((platform) => {
                    const isConnected = connectedPlatforms.has(platform)
                    const Icon = PLATFORM_ICONS[platform]
                    return (
                      <Badge
                        key={platform}
                        variant={isConnected ? 'outline' : 'secondary'}
                        className={
                          isConnected
                            ? 'border-green-500 text-green-600 gap-1.5'
                            : 'text-muted-foreground gap-1.5'
                        }
                      >
                        {Icon && <Icon className="h-3 w-3" />}
                        {PLATFORM_LABELS[platform]}
                        {isConnected ? (
                          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        ) : null}
                      </Badge>
                    )
                  })}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
