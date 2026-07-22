import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, adminProcedure } from '../init'
import { stripe } from '@/lib/stripe/client'
import {
  getOrgSubscription,
  getActiveMemberCount,
  getActiveBrandCount,
  getOrCreateStripeCustomer,
} from '@/lib/stripe/helpers'
import { PLAN_CONFIGS } from '@/lib/constants'
import type { Database } from '@/types/database'

type OrgRow = Database['public']['Tables']['organizations']['Row']

const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
  pro_seat: process.env.STRIPE_PRO_SEAT_PRICE_ID ?? '',
  agency: process.env.STRIPE_AGENCY_PRICE_ID ?? '',
  agency_seat: process.env.STRIPE_AGENCY_SEAT_PRICE_ID ?? '',
}

export const billingRouter = createTRPCRouter({
  // Any org member can view billing status
  getSubscription: orgProcedure.query(async ({ ctx }) => {
    return await getOrgSubscription(ctx.orgId)
  }),

  // Any org member can view usage
  getUsage: orgProcedure.query(async ({ ctx }) => {
    const sub = await getOrgSubscription(ctx.orgId)
    const plan = sub && (sub.status === 'active' || sub.status === 'trialing') ? sub.plan : 'starter'
    const config = PLAN_CONFIGS[plan]
    const memberCount = await getActiveMemberCount(ctx.orgId)
    const brandCount = await getActiveBrandCount(ctx.orgId)

    return {
      plan,
      planConfig: config,
      members: {
        current: memberCount,
        limit: config.maxSeats,
      },
      brands: {
        current: brandCount,
        limit: config.maxBrands,
      },
    }
  }),

  // Static plans info
  getPlans: orgProcedure.query(() => {
    return PLAN_CONFIGS
  }),

  // Admin: create checkout session to start/upgrade subscription
  createCheckoutSession: adminProcedure
    .input(
      z.object({
        plan: z.enum(['pro', 'agency']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: org } = await ctx.supabase
        .from('organizations')
        .select('id, name, stripe_customer_id')
        .eq('id', ctx.orgId)
        .single<Pick<OrgRow, 'id' | 'name' | 'stripe_customer_id'>>()

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' })
      }

      const customerId = await getOrCreateStripeCustomer(
        ctx.orgId,
        org.name,
        ctx.user.email ?? ''
      )

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      // Build line items
      const lineItems: Array<{ price: string; quantity?: number }> = [
        { price: PRICE_IDS[input.plan] },
      ]

      const seatPriceId = PRICE_IDS[`${input.plan}_seat`]
      if (seatPriceId) {
        const currentSeats = await getActiveMemberCount(ctx.orgId)
        lineItems.push({
          price: seatPriceId,
          quantity: Math.max(currentSeats, 1),
        })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: lineItems,
        success_url: `${appUrl}/billing?success=true`,
        cancel_url: `${appUrl}/billing?canceled=true`,
        metadata: {
          organization_id: ctx.orgId,
        },
        subscription_data: {
          metadata: {
            organization_id: ctx.orgId,
            plan: input.plan,
          },
        },
      })

      return { url: session.url }
    }),

  // Admin: create portal session for managing existing subscription
  createPortalSession: adminProcedure.mutation(async ({ ctx }) => {
    const { data: org } = await ctx.supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', ctx.orgId)
      .single()

    if (!org?.stripe_customer_id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No billing account found. Please set up a subscription first.',
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    })

    return { url: session.url }
  }),

  // Billing history: list invoices from Stripe
  getBillingHistory: orgProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { data: org } = await ctx.supabase
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', ctx.orgId)
        .single()

      if (!org?.stripe_customer_id) {
        return { invoices: [] as Array<{ id: string; number: string | null; date: string | null; amount: number; currency: string; status: string | null; pdfUrl: string | null; hostedUrl: string | null }>, hasMore: false }
      }

      const invoices = await stripe.invoices.list({
        customer: org.stripe_customer_id,
        limit: input?.limit ?? 10,
      })

      return {
        invoices: invoices.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          date: inv.created
            ? new Date(inv.created * 1000).toISOString()
            : null,
          amount: inv.amount_paid,
          currency: inv.currency,
          status: inv.status,
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
        })),
        hasMore: invoices.has_more,
      }
    }),

  // Payment method: get masked card info from Stripe
  getPaymentMethod: orgProcedure.query(async ({ ctx }) => {
    const { data: org } = await ctx.supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', ctx.orgId)
      .single()

    if (!org?.stripe_customer_id) {
      return null
    }

    try {
      const customer = await stripe.customers.retrieve(org.stripe_customer_id)

      if ('deleted' in customer && customer.deleted) return null

      const defaultPmId =
        typeof customer.invoice_settings?.default_payment_method === 'string'
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings?.default_payment_method?.id ?? null

      if (!defaultPmId) {
        // Fallback: check for any card on file
        const methods = await stripe.paymentMethods.list({
          customer: org.stripe_customer_id,
          type: 'card',
          limit: 1,
        })
        const pm = methods.data[0]
        if (!pm?.card) return null
        return {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        }
      }

      const pm = await stripe.paymentMethods.retrieve(defaultPmId)
      if (!pm.card) return null

      return {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      }
    } catch {
      // If Stripe call fails, return null gracefully
      return null
    }
  }),
})
