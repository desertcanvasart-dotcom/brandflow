-- ============================================================
-- MEETING ROOMS, SESSIONS, CALENDAR, TRANSCRIPT CHAT
-- ============================================================

-- ============================================================
-- MEETING ROOMS: Persistent room per project with guest slug
-- ============================================================
CREATE TABLE meeting_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  livekit_room_id TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slug),
  UNIQUE(project_id)
);

CREATE INDEX idx_meeting_rooms_org ON meeting_rooms(organization_id);
CREATE INDEX idx_meeting_rooms_slug ON meeting_rooms(slug);
CREATE INDEX idx_meeting_rooms_project ON meeting_rooms(project_id);

-- ============================================================
-- MEETING SESSIONS: Individual sessions within a room
-- ============================================================
CREATE TABLE meeting_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id             UUID NOT NULL REFERENCES meeting_rooms(id) ON DELETE CASCADE,
  meeting_id          UUID REFERENCES meetings(id) ON DELETE SET NULL,
  title               TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at            TIMESTAMPTZ,
  duration_seconds    INTEGER,
  recording_url       TEXT,
  transcript_text     TEXT,
  transcript_segments JSONB DEFAULT '[]',
  summary             TEXT,
  action_items        JSONB DEFAULT '[]',
  notes               TEXT,
  source              TEXT NOT NULL DEFAULT 'internal' CHECK (source IN ('internal', 'zoom', 'google_meet', 'teams', 'upload')),
  external_meeting_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_sessions_room ON meeting_sessions(room_id);
CREATE INDEX idx_meeting_sessions_meeting ON meeting_sessions(meeting_id);
CREATE INDEX idx_meeting_sessions_started ON meeting_sessions(started_at);

-- ============================================================
-- SESSION PARTICIPANTS: Tracks participants including guests
-- ============================================================
CREATE TABLE session_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name  TEXT,
  guest_email TEXT,
  role        meeting_participant_role NOT NULL DEFAULT 'participant',
  identity    TEXT NOT NULL,
  joined_at   TIMESTAMPTZ,
  left_at     TIMESTAMPTZ,
  is_present  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_session_participants_user ON session_participants(user_id);
CREATE INDEX idx_session_participants_identity ON session_participants(identity);

-- ============================================================
-- CALENDAR EVENTS: Internal calendar events
-- ============================================================
CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id      UUID REFERENCES meetings(id) ON DELETE CASCADE,
  room_id         UUID REFERENCES meeting_rooms(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  is_all_day      BOOLEAN NOT NULL DEFAULT false,
  location        TEXT,
  color           TEXT,
  recurrence_rule TEXT,
  google_event_id TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_org ON calendar_events(organization_id);
CREATE INDEX idx_calendar_events_starts ON calendar_events(starts_at);
CREATE INDEX idx_calendar_events_google ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_events_meeting ON calendar_events(meeting_id);

-- ============================================================
-- CALENDAR EVENT ATTENDEES
-- ============================================================
CREATE TABLE calendar_event_attendees (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email    TEXT,
  name     TEXT,
  status   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative'))
);

CREATE INDEX idx_calendar_event_attendees_event ON calendar_event_attendees(event_id);
CREATE INDEX idx_calendar_event_attendees_user ON calendar_event_attendees(user_id);

-- ============================================================
-- TRANSCRIPT CHAT MESSAGES: AI chat against transcripts
-- ============================================================
CREATE TABLE transcript_chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES meeting_sessions(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (session_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX idx_transcript_chat_session ON transcript_chat_messages(session_id);
CREATE INDEX idx_transcript_chat_project ON transcript_chat_messages(project_id);
CREATE INDEX idx_transcript_chat_user ON transcript_chat_messages(user_id);

-- ============================================================
-- GOOGLE CALENDAR CONNECTIONS: OAuth tokens for Google Calendar
-- ============================================================
CREATE TABLE google_calendar_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address    TEXT NOT NULL,
  display_name     TEXT,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_token       TEXT,
  last_synced_at   TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_google_cal_org ON google_calendar_connections(organization_id);

-- ============================================================
-- SCHEMA MODIFICATIONS: Add room_id to meetings
-- ============================================================
ALTER TABLE meetings ADD COLUMN room_id UUID REFERENCES meeting_rooms(id) ON DELETE SET NULL;
CREATE INDEX idx_meetings_room ON meetings(room_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- meeting_rooms
ALTER TABLE meeting_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view meeting rooms"
  ON meeting_rooms FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Managers can insert meeting rooms"
  ON meeting_rooms FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "Managers can update meeting rooms"
  ON meeting_rooms FOR UPDATE
  USING (organization_id = public.org_id());

CREATE POLICY "Admins can delete meeting rooms"
  ON meeting_rooms FOR DELETE
  USING (organization_id = public.org_id());

-- meeting_sessions (inherit access from room's org)
ALTER TABLE meeting_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view sessions"
  ON meeting_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meeting_rooms
      WHERE meeting_rooms.id = meeting_sessions.room_id
      AND meeting_rooms.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can insert sessions"
  ON meeting_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meeting_rooms
      WHERE meeting_rooms.id = meeting_sessions.room_id
      AND meeting_rooms.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can update sessions"
  ON meeting_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meeting_rooms
      WHERE meeting_rooms.id = meeting_sessions.room_id
      AND meeting_rooms.organization_id = public.org_id()
    )
  );

-- session_participants (service role for guest inserts, org members for read)
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view session participants"
  ON session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meeting_sessions
      JOIN meeting_rooms ON meeting_rooms.id = meeting_sessions.room_id
      WHERE meeting_sessions.id = session_participants.session_id
      AND meeting_rooms.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can insert session participants"
  ON session_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meeting_sessions
      JOIN meeting_rooms ON meeting_rooms.id = meeting_sessions.room_id
      WHERE meeting_sessions.id = session_participants.session_id
      AND meeting_rooms.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can update session participants"
  ON session_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meeting_sessions
      JOIN meeting_rooms ON meeting_rooms.id = meeting_sessions.room_id
      WHERE meeting_sessions.id = session_participants.session_id
      AND meeting_rooms.organization_id = public.org_id()
    )
  );

-- calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view calendar events"
  ON calendar_events FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Org members can insert calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (organization_id = public.org_id());

CREATE POLICY "Org members can update calendar events"
  ON calendar_events FOR UPDATE
  USING (organization_id = public.org_id());

CREATE POLICY "Org members can delete calendar events"
  ON calendar_events FOR DELETE
  USING (organization_id = public.org_id());

-- calendar_event_attendees
ALTER TABLE calendar_event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view event attendees"
  ON calendar_event_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = calendar_event_attendees.event_id
      AND calendar_events.organization_id = public.org_id()
    )
  );

CREATE POLICY "Org members can manage event attendees"
  ON calendar_event_attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      WHERE calendar_events.id = calendar_event_attendees.event_id
      AND calendar_events.organization_id = public.org_id()
    )
  );

-- transcript_chat_messages
ALTER TABLE transcript_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view transcript chats"
  ON transcript_chat_messages FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Org members can insert transcript chats"
  ON transcript_chat_messages FOR INSERT
  WITH CHECK (organization_id = public.org_id());

-- google_calendar_connections
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar connections"
  ON google_calendar_connections FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "Users can insert own calendar connections"
  ON google_calendar_connections FOR INSERT
  WITH CHECK (organization_id = public.org_id() AND user_id = auth.uid());

CREATE POLICY "Users can update own calendar connections"
  ON google_calendar_connections FOR UPDATE
  USING (organization_id = public.org_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete own calendar connections"
  ON google_calendar_connections FOR DELETE
  USING (organization_id = public.org_id() AND user_id = auth.uid());
