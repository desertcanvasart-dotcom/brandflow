import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

/* ─── Handler Functions ─── */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organization_id
  if (!orgId || session.mode !== 'subscription') return

  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const plan = (subscription.metadata?.plan as 'starter' | 'pro' | 'agency') ?? 'pro'
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription)

  await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        organization_id: orgId,
        stripe_subscription_id: subscription.id,
        plan,
        status: mapStripeStatus(subscription.status),
        seats: getSeatQuantity(subscription),
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: 'organization_id' }
    )

  // Ensure stripe_customer_id is set on org
  if (session.customer) {
    await supabaseAdmin
      .from('organizations')
      .update({ stripe_customer_id: session.customer as string })
      .eq('id', orgId)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Try to get org_id from metadata first
  let orgId = subscription.metadata?.organization_id

  if (!orgId) {
    // Look up by stripe_subscription_id
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()
    if (!data) return
    orgId = data.organization_id
  }

  await updateSubscriptionRecord(orgId, subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (subscriptionId) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('stripe_subscription_id', subscriptionId)
      .eq('status', 'past_due')
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (subscriptionId) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscriptionId)
  }
}

/* ─── Utilities ─── */

async function updateSubscriptionRecord(orgId: string, subscription: Stripe.Subscription) {
  const plan = (subscription.metadata?.plan as 'starter' | 'pro' | 'agency') ?? 'pro'
  const { periodStart, periodEnd } = getSubscriptionPeriod(subscription)

  await supabaseAdmin
    .from('subscriptions')
    .upsert(
      {
        organization_id: orgId,
        stripe_subscription_id: subscription.id,
        plan,
        status: mapStripeStatus(subscription.status),
        seats: getSeatQuantity(subscription),
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
      },
      { onConflict: 'organization_id' }
    )
}

function getSeatQuantity(subscription: Stripe.Subscription): number {
  let total = 0
  for (const item of subscription.items.data) {
    total += item.quantity ?? 1
  }
  return Math.max(total, 1)
}

/**
 * Extract current_period_start and current_period_end from subscription items.
 * In the 2026+ Stripe API, these fields live on SubscriptionItem, not Subscription.
 */
function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: string | null
  periodEnd: string | null
} {
  const firstItem = subscription.items.data[0]
  if (!firstItem) return { periodStart: null, periodEnd: null }

  return {
    periodStart: new Date(firstItem.current_period_start * 1000).toISOString(),
    periodEnd: new Date(firstItem.current_period_end * 1000).toISOString(),
  }
}

/**
 * Extract subscription ID from an invoice.
 * In the 2026+ Stripe API, subscription reference is under parent.subscription_details.
 */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subDetails = invoice.parent?.subscription_details
  if (!subDetails?.subscription) return null

  if (typeof subDetails.subscription === 'string') {
    return subDetails.subscription
  }
  return subDetails.subscription.id
}

type SubscriptionStatusType =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'paused'

function mapStripeStatus(stripeStatus: string): SubscriptionStatusType {
  const validStatuses: SubscriptionStatusType[] = [
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'unpaid',
    'paused',
  ]
  if (validStatuses.includes(stripeStatus as SubscriptionStatusType)) {
    return stripeStatus as SubscriptionStatusType
  }
  return 'incomplete'
}
