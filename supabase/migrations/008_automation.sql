-- ============================================================
-- 008: Notifications, Activity Logs, Automation Rules
-- ============================================================

-- ─── Notifications ──────────────────────────────────────────

CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  link             TEXT,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Org members can insert notifications" ON notifications
  FOR INSERT WITH CHECK (organization_id = public.org_id());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── Notification Preferences ───────────────────────────────

CREATE TABLE notification_preferences (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  in_app           BOOLEAN NOT NULL DEFAULT TRUE,
  email            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id, event_type)
);

CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id, organization_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own preferences" ON notification_preferences
  FOR SELECT USING (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Users insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Users update own preferences" ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid() AND organization_id = public.org_id());

CREATE POLICY "Users delete own preferences" ON notification_preferences
  FOR DELETE USING (user_id = auth.uid() AND organization_id = public.org_id());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Activity Logs ──────────────────────────────────────────

CREATE TABLE activity_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id         UUID NOT NULL REFERENCES auth.users(id),
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID NOT NULL,
  metadata         JSONB NOT NULL DEFAULT '{}',
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(organization_id, created_at DESC);
CREATE INDEX idx_activity_logs_project ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_actor ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view activity" ON activity_logs
  FOR SELECT USING (organization_id = public.org_id());

CREATE POLICY "Org members can insert activity" ON activity_logs
  FOR INSERT WITH CHECK (organization_id = public.org_id());

-- ─── Automation Rules ───────────────────────────────────────

CREATE TABLE automation_rules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  rule_type        TEXT NOT NULL,
  conditions       JSONB NOT NULL DEFAULT '{}',
  action           JSONB NOT NULL DEFAULT '{}',
  priority         INTEGER NOT NULL DEFAULT 0,
  created_by       UUID NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_org ON automation_rules(organization_id);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rules" ON automation_rules
  FOR SELECT USING (organization_id = public.org_id());

CREATE POLICY "Managers can insert rules" ON automation_rules
  FOR INSERT WITH CHECK (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Managers can update rules" ON automation_rules
  FOR UPDATE USING (organization_id = public.org_id() AND public.has_role('manager'));

CREATE POLICY "Managers can delete rules" ON automation_rules
  FOR DELETE USING (organization_id = public.org_id() AND public.has_role('manager'));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
