-- ============================================================
-- 013: Notifications V2 - Multi-Channel, Grouping, Archival, Analytics
-- ============================================================

-- ─── Alter notifications table ─────────────────────────────

ALTER TABLE notifications
  ADD COLUMN group_key       TEXT,
  ADD COLUMN is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN archived_at     TIMESTAMPTZ,
  ADD COLUMN action_type     TEXT,
  ADD COLUMN action_payload  JSONB,
  ADD COLUMN action_taken    BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_notifications_group_key ON notifications(group_key) WHERE group_key IS NOT NULL;
CREATE INDEX idx_notifications_archived ON notifications(user_id, is_archived);
CREATE INDEX idx_notifications_search ON notifications USING gin(to_tsvector('english', title || ' ' || COALESCE(body, '')));

-- ─── Alter notification_preferences table ──────────────────

ALTER TABLE notification_preferences
  ADD COLUMN push             BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN slack            BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN webhook          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN digest_frequency TEXT NOT NULL DEFAULT 'none';

-- ─── Push subscriptions ────────────────────────────────────

CREATE TABLE push_subscriptions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint         TEXT NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  user_agent       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own push subscriptions" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Users delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- ─── Notification quiet hours ──────────────────────────────

CREATE TABLE notification_quiet_hours (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  start_time       TIME NOT NULL DEFAULT '22:00',
  end_time         TIME NOT NULL DEFAULT '08:00',
  timezone         TEXT NOT NULL DEFAULT 'UTC',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE notification_quiet_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own quiet hours" ON notification_quiet_hours
  FOR SELECT USING (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Users insert own quiet hours" ON notification_quiet_hours
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Users update own quiet hours" ON notification_quiet_hours
  FOR UPDATE USING (user_id = auth.uid() AND organization_id = public.org_id());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON notification_quiet_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Organization integrations (Slack, Webhooks) ──────────

CREATE TABLE organization_integrations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  name             TEXT NOT NULL,
  config           JSONB NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, type, name)
);

CREATE INDEX idx_org_integrations_org ON organization_integrations(organization_id);
CREATE INDEX idx_org_integrations_type ON organization_integrations(organization_id, type);

ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view integrations" ON organization_integrations
  FOR SELECT USING (organization_id = public.org_id());

CREATE POLICY "Admins can insert integrations" ON organization_integrations
  FOR INSERT WITH CHECK (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Admins can update integrations" ON organization_integrations
  FOR UPDATE USING (organization_id = public.org_id() AND public.has_role('admin'));

CREATE POLICY "Admins can delete integrations" ON organization_integrations
  FOR DELETE USING (organization_id = public.org_id() AND public.has_role('admin'));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organization_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Notification events (analytics) ──────────────────────

CREATE TABLE notification_events (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id  UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel          TEXT NOT NULL,
  event            TEXT NOT NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_events_notif ON notification_events(notification_id);
CREATE INDEX idx_notification_events_channel ON notification_events(channel, event);
CREATE INDEX idx_notification_events_created ON notification_events(created_at DESC);

ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view notification events" ON notification_events
  FOR SELECT USING (
    notification_id IN (
      SELECT id FROM notifications WHERE organization_id = public.org_id()
    )
  );

CREATE POLICY "Service can insert events" ON notification_events
  FOR INSERT WITH CHECK (TRUE);

-- ─── Notification queue (deferred delivery) ───────────────

CREATE TABLE notification_queue (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id  UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channels         TEXT[] NOT NULL,
  deliver_after    TIMESTAMPTZ NOT NULL,
  is_processed     BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_pending ON notification_queue(deliver_after)
  WHERE is_processed = FALSE;
CREATE INDEX idx_notification_queue_user ON notification_queue(user_id);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage queue" ON notification_queue
  FOR ALL USING (TRUE);
