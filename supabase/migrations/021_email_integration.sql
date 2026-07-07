-- ─── Email Integration ──────────────────────────────────────────────
-- Gmail & Outlook OAuth connections, email threads, messages, attachments
-- Push + pull sync with project auto-linking via brand contacts

-- ─── 1. email_connections ───────────────────────────────────────────
CREATE TABLE email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  email_address TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_cursor TEXT,
  last_synced_at TIMESTAMPTZ,
  watch_expiry TIMESTAMPTZ,
  watch_resource_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id, provider)
);

CREATE INDEX idx_email_connections_org ON email_connections(organization_id);
CREATE INDEX idx_email_connections_user ON email_connections(user_id);
CREATE INDEX idx_email_connections_active ON email_connections(is_active) WHERE is_active = true;

CREATE TRIGGER set_email_connections_updated_at
  BEFORE UPDATE ON email_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view email connections"
  ON email_connections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own email connections"
  ON email_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email connections"
  ON email_connections FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own email connections"
  ON email_connections FOR DELETE
  USING (user_id = auth.uid());

-- ─── 2. email_threads ──────────────────────────────────────────────
CREATE TABLE email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  provider_thread_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  snippet TEXT,
  participants TEXT[] DEFAULT '{}',
  last_message_at TIMESTAMPTZ NOT NULL,
  message_count INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT true,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  linked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(connection_id, provider_thread_id)
);

CREATE INDEX idx_email_threads_org ON email_threads(organization_id);
CREATE INDEX idx_email_threads_connection ON email_threads(connection_id);
CREATE INDEX idx_email_threads_project ON email_threads(project_id);
CREATE INDEX idx_email_threads_brand ON email_threads(brand_id);
CREATE INDEX idx_email_threads_last_message ON email_threads(last_message_at DESC);
CREATE INDEX idx_email_threads_unread ON email_threads(organization_id, is_read) WHERE is_read = false;

CREATE TRIGGER set_email_threads_updated_at
  BEFORE UPDATE ON email_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view email threads"
  ON email_threads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage email threads"
  ON email_threads FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── 3. email_messages ─────────────────────────────────────────────
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses TEXT[] DEFAULT '{}',
  cc_addresses TEXT[] DEFAULT '{}',
  bcc_addresses TEXT[] DEFAULT '{}',
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  is_outbound BOOLEAN DEFAULT false,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, provider_message_id)
);

CREATE INDEX idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX idx_email_messages_sent ON email_messages(sent_at DESC);

ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view email messages"
  ON email_messages FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM email_threads
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage email messages"
  ON email_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── 4. email_attachments ──────────────────────────────────────────
CREATE TABLE email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  storage_url TEXT,
  provider_attachment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_attachments_message ON email_attachments(message_id);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view email attachments"
  ON email_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM email_messages
      WHERE thread_id IN (
        SELECT id FROM email_threads
        WHERE organization_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Service role can manage email attachments"
  ON email_attachments FOR ALL
  USING (true)
  WITH CHECK (true);
