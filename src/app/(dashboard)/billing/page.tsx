'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CreditCard } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PLAN_CONFIGS } from '@/lib/constants'
import type { SubscriptionPlan } from '@/types/enums'
import { toast } from 'sonner'
import { BillingStatsBar } from '@/components/billing/billing-stats-bar'
import { BillingPlanCard } from '@/components/billing/billing-plan-card'
import { BillingUsage } from '@/components/billing/billing-usage'
import { BillingHistory } from '@/components/billing/billing-history'
import { BillingPaymentMethod } from '@/components/billing/billing-payment-method'

const PLAN_ORDER: SubscriptionPlan[] = ['starter', 'pro', 'agency']

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>}>
      <BillingContent />
    </Suspense>
  )
}

function BillingContent() {
  const { role } = useCurrentUser()
  const isAdmin = role === 'admin'
  const searchParams = useSearchParams()

  // Core queries
  const { data: subscription, isLoading: subLoading } =
    trpc.billing.getSubscription.useQuery()
  const { data: usage, isLoading: usageLoading } =
    trpc.billing.getUsage.useQuery()

  // Mutations
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

  // Compute trial days remaining
  const trialDaysRemaining =
    subscription?.status === 'trialing' && subscription.current_period_end
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.current_period_end).getTime() -
              Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null

  return (
    <>
      <TopBar title="Billing" />
      <div className="flex flex-col gap-6 p-6 max-w-5xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Billing</h2>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage your subscription, payment method, and billing history
          </p>
        </div>

        {isLoading ? (
          <BillingPageSkeleton />
        ) : (
          <>
            {/* Stats overview */}
            <BillingStatsBar
              planName={PLAN_CONFIGS[currentPlan].name}
              status={subscription?.status ?? 'free'}
              nextBillingDate={subscription?.current_period_end ?? null}
              trialDaysRemaining={trialDaysRemaining}
              memberCount={usage?.members.current}
            />

            {/* Past due alert */}
            {subscription?.status === 'past_due' && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-800 p-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Your payment is past due. Please update your payment method
                  to avoid service interruption.
                </p>
              </div>
            )}

            {/* Usage section */}
            {usage && (
              <BillingUsage
                usage={usage}
                currentPlan={currentPlan}
                isAdmin={isAdmin}
                onUpgrade={(plan) => checkoutMutation.mutate({ plan })}
              />
            )}

            {/* Payment Method + Billing History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BillingPaymentMethod
                nextBillingDate={subscription?.current_period_end ?? null}
                isAdmin={isAdmin}
                onManageBilling={() => portalMutation.mutate()}
                manageLoading={portalMutation.isPending}
              />
              <BillingHistory />
            </div>

            <Separator />

            {/* Plan comparison */}
            <div>
              <h3 className="text-lg font-semibold mb-1">Plans</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Choose the right plan for your agency
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLAN_ORDER.map((planKey) => {
                  const config = PLAN_CONFIGS[planKey]
                  const isCurrent = currentPlan === planKey
                  const currentIndex = PLAN_ORDER.indexOf(currentPlan)
                  const planIndex = PLAN_ORDER.indexOf(planKey)

                  return (
                    <BillingPlanCard
                      key={planKey}
                      planKey={planKey}
                      config={config}
                      isCurrent={isCurrent}
                      isUpgrade={planIndex > currentIndex}
                      isDowngrade={planIndex < currentIndex}
                      isAdmin={isAdmin}
                      isActive={isActive}
                      onUpgrade={(plan) =>
                        checkoutMutation.mutate({ plan })
                      }
                      onManage={() => portalMutation.mutate()}
                      upgradeLoading={checkoutMutation.isPending}
                      manageLoading={portalMutation.isPending}
                    />
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

function BillingPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 animate-pulse"
          >
            <div className="h-5 w-20 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted mt-2" />
          </div>
        ))}
      </div>
      {/* Card skeletons */}
      {[1, 2].map((i) => (
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
      {/* Plan skeletons */}
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse min-h-[520px]">
            <CardHeader>
              <div className="h-5 w-24 rounded bg-muted" />
              <div className="h-8 w-20 rounded bg-muted mt-2" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 w-full rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
