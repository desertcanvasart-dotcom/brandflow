import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PLAN_CONFIGS } from '@/lib/constants'
import type { SubscriptionPlan } from '@/types/enums'
import type { Database } from '@/types/database'

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']

export async function getOrgSubscription(orgId: string): Promise<SubscriptionRow | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .single<SubscriptionRow>()
  return data
}

export async function getOrgPlan(orgId: string): Promise<SubscriptionPlan> {
  const sub = await getOrgSubscription(orgId)
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) return 'starter'
  return sub.plan
}

export async function getActiveMemberCount(orgId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_active', true)
  return count ?? 0
}

export async function getActiveBrandCount(orgId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('brands')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('is_active', true)
  return count ?? 0
}

export async function canAddSeat(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getOrgPlan(orgId)
  const config = PLAN_CONFIGS[plan]
  const currentCount = await getActiveMemberCount(orgId)

  if (config.maxSeats !== null && currentCount >= config.maxSeats) {
    return {
      allowed: false,
      reason: `Your ${config.name} plan allows up to ${config.maxSeats} members. Upgrade to add more.`,
    }
  }
  return { allowed: true }
}

export async function canAddBrand(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const plan = await getOrgPlan(orgId)
  const config = PLAN_CONFIGS[plan]
  const currentCount = await getActiveBrandCount(orgId)

  if (config.maxBrands !== null && currentCount >= config.maxBrands) {
    return {
      allowed: false,
      reason: `Your ${config.name} plan allows up to ${config.maxBrands} brands. Upgrade to add more.`,
    }
  }
  return { allowed: true }
}

export async function getOrCreateStripeCustomer(
  orgId: string,
  orgName: string,
  adminEmail: string
): Promise<string> {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single()

  if (org?.stripe_customer_id) return org.stripe_customer_id

  const { stripe } = await import('./client')

  const customer = await stripe.customers.create({
    name: orgName,
    email: adminEmail,
    metadata: { organization_id: orgId },
  })

  await supabaseAdmin
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', orgId)

  return customer.id
}
