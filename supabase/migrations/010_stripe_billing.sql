-- ============================================================
-- 010_stripe_billing.sql
-- Phase 3, Feature 5: Stripe Billing Integration
-- ============================================================

-- ── Subscription plan enum ──
CREATE TYPE subscription_plan AS ENUM ('starter', 'pro', 'agency');

-- ── Subscription status enum (mirrors Stripe) ──
CREATE TYPE subscription_status AS ENUM (
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'unpaid',
  'paused'
);

-- ── Add stripe_customer_id to organizations ──
ALTER TABLE organizations
  ADD COLUMN stripe_customer_id TEXT UNIQUE;

CREATE INDEX idx_organizations_stripe_customer
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── subscriptions table ──
CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  plan                   subscription_plan NOT NULL DEFAULT 'starter',
  status                 subscription_status NOT NULL DEFAULT 'active',
  seats                  INTEGER NOT NULL DEFAULT 1,
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at            TIMESTAMPTZ,
  metadata               JSONB NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One subscription per organization
CREATE UNIQUE INDEX idx_subscriptions_org
  ON subscriptions(organization_id);

CREATE INDEX idx_subscriptions_stripe_id
  ON subscriptions(stripe_subscription_id);

CREATE INDEX idx_subscriptions_status
  ON subscriptions(status);

-- Updated-at trigger (reuse existing function from 001)
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- All org members can view their org's subscription
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (organization_id = public.org_id());

-- No INSERT/UPDATE/DELETE policies for regular users.
-- All writes happen server-side via supabaseAdmin (webhook handler).
