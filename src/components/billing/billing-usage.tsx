'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Users, Palette, Sparkles, TrendingUp } from 'lucide-react'
import { PLAN_CONFIGS } from '@/lib/constants'
import type { SubscriptionPlan } from '@/types/enums'

interface UsageData {
  plan: SubscriptionPlan
  members: { current: number; limit: number | null }
  brands: { current: number; limit: number | null }
}

interface BillingUsageProps {
  usage: UsageData
  currentPlan: SubscriptionPlan
  isAdmin: boolean
  onUpgrade: (plan: 'pro' | 'agency') => void
}

function getUpgradePrompt(
  resourceName: string,
  current: number,
  limit: number | null,
  currentPlan: SubscriptionPlan
): { text: string; nextPlan: 'pro' | 'agency' } | null {
  if (limit === null) return null // unlimited
  const pct = current / limit
  if (pct < 0.7) return null

  const nextPlan: 'pro' | 'agency' = currentPlan === 'starter' ? 'pro' : 'agency'
  const nextConfig = PLAN_CONFIGS[nextPlan]
  const nextLimit =
    resourceName === 'Team Members' ? nextConfig.maxSeats : nextConfig.maxBrands
  const limitText = nextLimit !== null ? `${nextLimit}` : 'unlimited'

  return {
    text: `${current}/${limit} used — Upgrade to ${nextConfig.name} for ${limitText} ${resourceName.toLowerCase()}`,
    nextPlan,
  }
}

export function BillingUsage({
  usage,
  currentPlan,
  isAdmin,
  onUpgrade,
}: BillingUsageProps) {
  const memberPrompt = getUpgradePrompt(
    'Team Members',
    usage.members.current,
    usage.members.limit,
    currentPlan
  )
  const brandPrompt = getUpgradePrompt(
    'Brands',
    usage.brands.current,
    usage.brands.limit,
    currentPlan
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage
        </CardTitle>
        <CardDescription>
          Current resource usage for your plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Team Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Team Members</span>
            </div>
            <span className="font-medium">
              {usage.members.current}
              {usage.members.limit !== null
                ? ` / ${usage.members.limit}`
                : ' (unlimited)'}
            </span>
          </div>
          {usage.members.limit !== null && (
            <Progress
              value={(usage.members.current / usage.members.limit) * 100}
              className="h-2"
            />
          )}
          {isAdmin && memberPrompt && (
            <button
              onClick={() => onUpgrade(memberPrompt.nextPlan)}
              className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:underline"
            >
              <Sparkles className="h-3 w-3" />
              {memberPrompt.text}
            </button>
          )}
        </div>

        {/* Brands */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span>Brands</span>
            </div>
            <span className="font-medium">
              {usage.brands.current}
              {usage.brands.limit !== null
                ? ` / ${usage.brands.limit}`
                : ' (unlimited)'}
            </span>
          </div>
          {usage.brands.limit !== null && (
            <Progress
              value={(usage.brands.current / usage.brands.limit) * 100}
              className="h-2"
            />
          )}
          {isAdmin && brandPrompt && (
            <button
              onClick={() => onUpgrade(brandPrompt.nextPlan)}
              className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 hover:underline"
            >
              <Sparkles className="h-3 w-3" />
              {brandPrompt.text}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
