'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Sparkles, Star } from 'lucide-react'
import type { PlanConfig } from '@/lib/constants'
import type { SubscriptionPlan } from '@/types/enums'

interface BillingPlanCardProps {
  planKey: SubscriptionPlan
  config: PlanConfig
  isCurrent: boolean
  isUpgrade: boolean
  isDowngrade: boolean
  isAdmin: boolean
  isActive: boolean
  onUpgrade: (plan: 'pro' | 'agency') => void
  onManage: () => void
  upgradeLoading: boolean
  manageLoading: boolean
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function BillingPlanCard({
  planKey,
  config,
  isCurrent,
  isUpgrade,
  isDowngrade,
  isAdmin,
  isActive,
  onUpgrade,
  onManage,
  upgradeLoading,
  manageLoading,
}: BillingPlanCardProps) {
  const isPopular = planKey === 'pro'

  return (
    <Card
      className={`relative flex flex-col min-h-[520px] ${
        isCurrent
          ? 'border-primary ring-1 ring-primary'
          : isPopular
            ? 'border-blue-200 dark:border-blue-800'
            : ''
      }`}
    >
      {/* Most Popular badge */}
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-xs px-3">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{config.name}</CardTitle>
          {isCurrent && (
            <Badge variant="default" className="text-xs">
              Current
            </Badge>
          )}
        </div>
        <CardDescription>{config.description}</CardDescription>
        <div className="pt-2">
          {config.basePrice === 0 ? (
            <span className="text-3xl font-bold">Free</span>
          ) : (
            <div>
              <span className="text-3xl font-bold">
                {formatPrice(config.basePrice)}
              </span>
              <span className="text-muted-foreground text-sm"> / month</span>
              {config.seatPrice > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Includes {config.includedSeats} team member
                  {config.includedSeats > 1 ? 's' : ''}. Additional seats{' '}
                  {formatPrice(config.seatPrice)}/mo
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Grouped features */}
        <div className="flex-1 space-y-3">
          {config.featureGroups.map((group) => (
            <div key={group.category}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                {group.category}
              </p>
              <ul className="space-y-1.5">
                {group.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Action button */}
        {isAdmin && (
          <div className="pt-4 mt-auto">
            {isCurrent ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : isUpgrade && planKey !== 'starter' ? (
              <Button
                className="w-full"
                onClick={() => onUpgrade(planKey as 'pro' | 'agency')}
                disabled={upgradeLoading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {upgradeLoading ? 'Loading...' : `Upgrade to ${config.name}`}
              </Button>
            ) : isDowngrade && isActive ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={onManage}
                disabled={manageLoading}
              >
                {manageLoading ? 'Loading...' : 'Manage Plan'}
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
