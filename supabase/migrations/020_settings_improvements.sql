-- ============================================================
-- MIGRATION 020: Settings Improvements
-- Adds: org general settings, member timezone, quiet-hours active days,
--        webhook delivery logs, API keys
-- ============================================================

-- ── 1. Organizations: general settings columns ──────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS default_task_duration_hours NUMERIC(4,1) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- ── 2. Organization members: personal timezone ──────────────
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- ── 3. Notification quiet hours: active days ────────────────
ALTER TABLE notification_quiet_hours
  ADD COLUMN IF NOT EXISTS active_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri'];

-- ── 4. Webhook delivery logs ────────────────────────────────
CREATE TABLE webhook_delivery_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id    UUID NOT NULL REFERENCES organization_integrations(id) ON DELETE CASCADE,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL DEFAULT '{}',
  status_code       INTEGER,
  response_time_ms  INTEGER,
  response_body     TEXT,
  error_message     TEXT,
  attempt_number    INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_org ON webhook_delivery_logs(organization_id);
CREATE INDEX idx_webhook_logs_integration ON webhook_delivery_logs(integration_id);
CREATE INDEX idx_webhook_logs_created ON webhook_delivery_logs(organization_id, created_at DESC);

-- RLS
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view webhook logs"
  ON webhook_delivery_logs FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "System can insert webhook logs"
  ON webhook_delivery_logs FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "Admins can delete webhook logs"
  ON webhook_delivery_logs FOR DELETE
  USING (organization_id = public.org_id() AND public.has_role('admin'));

-- ── 5. API keys ─────────────────────────────────────────────
CREATE TABLE api_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  name              TEXT NOT NULL,
  key_prefix        TEXT NOT NULL,          -- first 8 chars for display
  key_hash          TEXT NOT NULL,          -- SHA-256 hash of full key
  last_used_at      TIMESTAMPTZ,
  is_revoked        BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE NOT is_revoked;
CREATE INDEX idx_api_keys_prefix ON api_keys(organization_id, key_prefix);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view API keys"
  ON api_keys FOR SELECT
  USING (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Org admins can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Org admins can update API keys"
  ON api_keys FOR UPDATE
  USING (organization_id = public.org_id() AND public.has_role('admin'));
