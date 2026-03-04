'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, Calendar } from 'lucide-react'
import { PLATFORM_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type BrandRow = Database['public']['Tables']['brands']['Row']

export function BrandOverview({ brand }: { brand: BrandRow }) {
  const colors = (brand.colors as unknown as Array<{ name: string; hex: string; usage?: string }>) ?? []
  const fonts = (brand.fonts as unknown as Array<{ name: string; url?: string; usage?: string }>) ?? []

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {brand.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Description</p>
              <p className="text-sm mt-1">{brand.description}</p>
            </div>
          )}
          {brand.website_url && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Website</p>
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <Globe className="h-3 w-3" />
                {brand.website_url}
              </a>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Created</p>
            <p className="text-sm mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(brand.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          {brand.platforms && brand.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {brand.platforms.map((p) => (
                <Badge key={p} variant="secondary">
                  {PLATFORM_LABELS[p] || p}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No platforms configured</p>
          )}
        </CardContent>
      </Card>

      {colors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {colors.map((color, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-md border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div>
                    <p className="text-sm font-medium">{color.name}</p>
                    <p className="text-xs text-muted-foreground">{color.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {fonts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Fonts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fonts.map((font, i) => (
                <div key={i}>
                  <p className="text-sm font-medium">{font.name}</p>
                  {font.usage && (
                    <p className="text-xs text-muted-foreground">{font.usage}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
