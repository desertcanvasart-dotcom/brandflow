'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/trpc/client'
import { BrandOverview } from '@/components/brands/brand-overview'
import { BrandGuidelines } from '@/components/brands/brand-guidelines'
import { BrandAssets } from '@/components/brands/brand-assets'
import { BrandClientAccess } from '@/components/brands/brand-client-access'
import { BrandContacts } from '@/components/brands/brand-contacts'

export default function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: brand, isLoading } = trpc.brand.getById.useQuery({ id })

  if (isLoading) {
    return (
      <>
        <TopBar title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-96 rounded bg-muted" />
          </div>
        </div>
      </>
    )
  }

  if (!brand) {
    notFound()
  }

  return (
    <>
      <TopBar title={brand.name} />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {brand.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-14 w-14 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xl">
                {brand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{brand.name}</h2>
              {brand.description && (
                <p className="text-muted-foreground">{brand.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/brands/${id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="clients">Client Access</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <BrandOverview brand={brand} />
          </TabsContent>
          <TabsContent value="contacts" className="mt-6">
            <BrandContacts brandId={brand.id} />
          </TabsContent>
          <TabsContent value="guidelines" className="mt-6">
            <BrandGuidelines brand={brand} />
          </TabsContent>
          <TabsContent value="assets" className="mt-6">
            <BrandAssets brandId={brand.id} />
          </TabsContent>
          <TabsContent value="clients" className="mt-6">
            <BrandClientAccess brandId={brand.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
