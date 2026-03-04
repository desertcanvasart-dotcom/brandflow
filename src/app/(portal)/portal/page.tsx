'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Palette } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { getInitials } from '@/lib/utils'

export default function PortalHomePage() {
  const { data: brands, isLoading } = trpc.portal.getBrands.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Brands</h1>
          <p className="text-muted-foreground">Select a brand to review content and track progress.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-muted" />
                <div className="mt-4 h-5 w-32 rounded bg-muted" />
                <div className="mt-2 h-4 w-48 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Brands</h1>
        <p className="text-muted-foreground">Select a brand to review content and track progress.</p>
      </div>

      {brands && brands.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Link key={brand.id} href={`/portal/${brand.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                        {getInitials(brand.name)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{brand.name}</h3>
                      {brand.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {brand.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <div className="text-center">
            <Palette className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No brands yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your agency will grant you access to brands for review.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
