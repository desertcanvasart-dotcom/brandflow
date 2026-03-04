'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  CreditCard,
  Users,
  Palette,
  ExternalLink,
  Check,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PLAN_CONFIGS } from '@/lib/constants'
import type { SubscriptionPlan } from '@/types/enums'
import { toast } from 'sonner'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-amber-100 text-amber-700',
  canceled: 'bg-gray-100 text-gray-700',
  incomplete: 'bg-red-100 text-red-700',
  unpaid: 'bg-red-100 text-red-700',
  paused: 'bg-gray-100 text-gray-700',
}

const PLAN_ORDER: SubscriptionPlan[] = ['starter', 'pro', 'agency']

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export default function BillingPage() {
  const { role } = useCurrentUser()
  const isAdmin = role === 'admin'
  const searchParams = useSearchParams()

  const { data: subscription, isLoading: subLoading } =
    trpc.billing.getSubscription.useQuery()
  const { data: usage, isLoading: usageLoading } =
    trpc.billing.getUsage.useQuery()

  const checkoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
    },
    onError: (err) => toast.error(err.message),
  })

  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
    },
    onError: (err) => toast.error(err.message),
  })

  // Handle success/canceled URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Welcome to your new plan.')
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout canceled. No changes were made.')
    }
  }, [searchParams])

  const isLoading = subLoading || usageLoading
  const currentPlan: SubscriptionPlan = usage?.plan ?? 'starter'
  const isActive =
    subscription?.status === 'active' || subscription?.status === 'trialing'

  return (
    <>
      <TopBar title="Billing" />
      <div className="flex flex-col gap-6 p-6 max-w-4xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing</h2>
          <p className="text-muted-foreground">
            Manage your subscription and billing details
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-40 rounded bg-muted" />
                  <div className="h-4 w-64 rounded bg-muted mt-1" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 w-full rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Current Plan Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
                <CardDescription>
                  Your organization&apos;s active subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold">
                      {PLAN_CONFIGS[currentPlan].name}
                    </span>
                    {subscription && (
                      <Badge
                        className={
                          STATUS_COLORS[subscription.status] ??
                          'bg-gray-100 text-gray-700'
                        }
                      >
                        {subscription.status.replace('_', ' ')}
                      </Badge>
                    )}
                    {!subscription && (
                      <Badge className="bg-green-100 text-green-700">
                        free
                      </Badge>
                    )}
                  </div>
                  {isAdmin && subscription && isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {portalMutation.isPending
                        ? 'Loading...'
                        : 'Manage Billing'}
                    </Button>
                  )}
                </div>

                {subscription?.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancel_at_period_end
                      ? 'Cancels on '
                      : 'Renews on '}
                    {new Date(
                      subscription.current_period_end
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}

                {subscription?.status === 'past_due' && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                      Your payment is past due. Please update your payment
                      method to avoid service interruption.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage */}
            {usage && (
              <Card>
                <CardHeader>
                  <CardTitle>Usage</CardTitle>
                  <CardDescription>
                    Current resource usage for your plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        value={
                          (usage.members.current / usage.members.limit) * 100
                        }
                        className="h-2"
                      />
                    )}
                  </div>

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
                        value={
                          (usage.brands.current / usage.brands.limit) * 100
                        }
                        className="h-2"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Plan Cards */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLAN_ORDER.map((planKey) => {
                  const config = PLAN_CONFIGS[planKey]
                  const isCurrent = currentPlan === planKey
                  const currentIndex = PLAN_ORDER.indexOf(currentPlan)
                  const planIndex = PLAN_ORDER.indexOf(planKey)
                  const isUpgrade = planIndex > currentIndex
                  const isDowngrade = planIndex < currentIndex

                  return (
                    <Card
                      key={planKey}
                      className={
                        isCurrent
                          ? 'border-primary ring-1 ring-primary'
                          : ''
                      }
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {config.name}
                          </CardTitle>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                        <div className="pt-2">
                          {config.basePrice === 0 ? (
                            <span className="text-2xl font-bold">Free</span>
                          ) : (
                            <div>
                              <span className="text-2xl font-bold">
                                {formatPrice(config.basePrice)}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                /mo
                              </span>
                              {config.seatPrice > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  + {formatPrice(config.seatPrice)}/seat/mo
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-2">
                          {config.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm"
                            >
                              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {isAdmin && (
                          <>
                            {isCurrent ? (
                              <Button
                                variant="outline"
                                className="w-full"
                                disabled
                              >
                                Current Plan
                              </Button>
                            ) : isUpgrade && planKey !== 'starter' ? (
                              <Button
                                className="w-full"
                                onClick={() =>
                                  checkoutMutation.mutate({
                                    plan: planKey as 'pro' | 'agency',
                                  })
                                }
                                disabled={checkoutMutation.isPending}
                              >
                                <Sparkles className="h-4 w-4 mr-2" />
                                {checkoutMutation.isPending
                                  ? 'Loading...'
                                  : `Upgrade to ${config.name}`}
                              </Button>
                            ) : isDowngrade && subscription && isActive ? (
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => portalMutation.mutate()}
                                disabled={portalMutation.isPending}
                              >
                                {portalMutation.isPending
                                  ? 'Loading...'
                                  : 'Manage Plan'}
                              </Button>
                            ) : null}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
