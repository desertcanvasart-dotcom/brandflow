'use client'

import { use } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/trpc/client'
import { PortalContentQueue } from '@/components/portal/portal-content-queue'
import { PortalMilestones } from '@/components/portal/portal-milestones'

export default function PortalBrandPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = use(params)
  const { data: brands } = trpc.portal.getBrands.useQuery()
  const brand = brands?.find((b) => b.id === brandId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {brand?.name ?? 'Brand'}
        </h1>
        <p className="text-muted-foreground">
          Review content and track project progress.
        </p>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content Review</TabsTrigger>
          <TabsTrigger value="milestones">Project Milestones</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="mt-4">
          <PortalContentQueue brandId={brandId} />
        </TabsContent>
        <TabsContent value="milestones" className="mt-4">
          <PortalMilestones brandId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
