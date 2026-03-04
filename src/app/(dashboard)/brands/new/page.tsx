'use client'

import { TopBar } from '@/components/layout/top-bar'
import { BrandForm } from '@/components/brands/brand-form'

export default function NewBrandPage() {
  return (
    <>
      <TopBar title="New Brand" />
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Brand</h2>
          <p className="text-muted-foreground">
            Add a new client brand to your organization
          </p>
        </div>
        <BrandForm />
      </div>
    </>
  )
}
