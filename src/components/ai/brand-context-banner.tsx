'use client'

import { trpc } from '@/trpc/client'
import { Info } from 'lucide-react'

interface BrandContextBannerProps {
  brandId: string
}

export function BrandContextBanner({ brandId }: BrandContextBannerProps) {
  const { data: brand } = trpc.brand.getById.useQuery({ id: brandId }, { enabled: !!brandId })
  const { data: strategy } = trpc.brandStrategy.getByBrand.useQuery({ brandId }, { enabled: !!brandId })

  if (!brand) return null

  const parts: string[] = []
  if (strategy) {
    const pillars = (strategy.content_pillars as unknown[])?.length ?? 0
    const personas = (strategy.audience_personas as unknown[])?.length ?? 0
    const tone = strategy.tone_profiles as { voice?: string }[] | null
    const voice = tone?.[0]?.voice

    if (pillars > 0) parts.push(`${pillars} content pillar${pillars !== 1 ? 's' : ''}`)
    if (personas > 0) parts.push(`${personas} persona${personas !== 1 ? 's' : ''}`)
    if (voice) parts.push(`tone: ${voice}`)
  }
  if (brand.platforms?.length) {
    parts.push(`${brand.platforms.length} platform${brand.platforms.length !== 1 ? 's' : ''}`)
  }

  if (parts.length === 0) return null

  return (
    <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-2.5">
      <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
      <p className="text-xs text-blue-700 dark:text-blue-300">
        <span className="font-medium">Context loaded:</span>{' '}
        {parts.join(', ')}
      </p>
    </div>
  )
}
