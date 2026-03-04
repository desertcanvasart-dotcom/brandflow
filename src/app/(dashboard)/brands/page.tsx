'use client'

import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Globe, Palette } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { trpc } from '@/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'
import { PLATFORM_LABELS } from '@/lib/constants'

export default function BrandsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: brands, isLoading } = trpc.brand.list.useQuery(
    debouncedSearch ? { search: debouncedSearch } : undefined
  )

  return (
    <>
      <TopBar title="Brands" />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Brands</h2>
            <p className="text-muted-foreground">
              Manage your client brands and guidelines
            </p>
          </div>
          <Button asChild>
            <Link href="/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              New Brand
            </Link>
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
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
        ) : brands && brands.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-lg">
                          {brand.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{brand.name}</h3>
                        {brand.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {brand.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {brand.platforms?.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {PLATFORM_LABELS[p] || p}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      {brand.website_url && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Website
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Guidelines
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <h3 className="text-lg font-medium">No brands yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first brand to start managing content
              </p>
              <Button asChild className="mt-4">
                <Link href="/brands/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Brand
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
