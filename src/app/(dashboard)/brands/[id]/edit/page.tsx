'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { trpc } from '@/trpc/client'
import { BrandForm } from '@/components/brands/brand-form'

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: brand, isLoading } = trpc.brand.getById.useQuery({ id })

  if (isLoading) {
    return (
      <>
        <TopBar title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
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
      <TopBar title={`Edit ${brand.name}`} />
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Brand</h2>
          <p className="text-muted-foreground">
            Update brand details and platforms
          </p>
        </div>
        <BrandForm brand={brand} />
      </div>
    </>
  )
}
