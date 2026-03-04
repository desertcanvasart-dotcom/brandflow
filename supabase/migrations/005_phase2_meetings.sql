-- ============================================================
-- PHASE 2: MEETINGS & INTELLIGENCE
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- NEW ENUMS
-- ============================================================
CREATE TYPE meeting_type AS ENUM ('internal', 'client', 'review');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE meeting_participant_role AS ENUM ('host', 'participant', 'viewer');
CREATE TYPE brief_type AS ENUM ('content_brief', 'project_requirements', 'change_request');
CREATE TYPE annotation_type AS ENUM ('pin', 'rectangle', 'arrow');
CREATE TYPE embedding_source_type AS ENUM ('brand_guidelines', 'meeting_transcript', 'content_item', 'brief', 'comment');

-- ============================================================
-- MEETINGS
-- ============================================================
CREATE TABLE meetings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_type    meeting_type NOT NULL DEFAULT 'internal',
  status          meeting_status NOT NULL DEFAULT 'scheduled',
  livekit_room_id TEXT,
  recording_url   TEXT,
  transcript      TEXT,
  summary         TEXT,
  action_items    JSONB NOT NULL DEFAULT '[]',
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_org ON meetings(organization_id);
CREATE INDEX idx_meetings_project ON meetings(project_id);
CREATE INDEX idx_meetings_brand ON meetings(brand_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_scheduled ON meetings(scheduled_at);

-- ============================================================
-- MEETING PARTICIPANTS
-- ============================================================
CREATE TABLE meeting_participants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id  UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        meeting_participant_role NOT NULL DEFAULT 'participant',
  joined_at   TIMESTAMPTZ,
  left_at     TIMESTAMPTZ,

  UNIQUE(meeting_id, user_id)
);

CREATE INDEX idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_user ON meeting_participants(user_id);

-- ============================================================
-- BRIEFS
-- ============================================================
CREATE TABLE briefs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
  type              brief_type NOT NULL DEFAULT 'content_brief',
  title             TEXT NOT NULL DEFAULT 'Untitled Brief',
  body              JSONB NOT NULL DEFAULT '{}',
  generated_by_ai   BOOLEAN NOT NULL DEFAULT FALSE,
  source_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_briefs_org ON briefs(organization_id);
CREATE INDEX idx_briefs_project ON briefs(project_id);
CREATE INDEX idx_briefs_task ON briefs(task_id);
CREATE INDEX idx_briefs_meeting ON briefs(source_meeting_id);

-- ============================================================
-- ANNOTATIONS
-- ============================================================
CREATE TABLE annotations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id  UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES auth.users(id),
  type            annotation_type NOT NULL DEFAULT 'pin',
  x_percent       NUMERIC(5,2) NOT NULL,
  y_percent       NUMERIC(5,2) NOT NULL,
  width_percent   NUMERIC(5,2),
  height_percent  NUMERIC(5,2),
  body            TEXT NOT NULL,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_annotations_deliverable ON annotations(deliverable_id);
CREATE INDEX idx_annotations_author ON annotations(author_id);

-- ============================================================
-- EMBEDDINGS (pgvector)
-- ============================================================
CREATE TABLE embeddings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type     embedding_source_type NOT NULL,
  source_id       UUID NOT NULL,
  chunk_index     INTEGER NOT NULL DEFAULT 0,
  chunk_text      TEXT NOT NULL,
  embedding       vector(1536) NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_org ON embeddings(organization_id);
CREATE INDEX idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX idx_embeddings_vector ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- SIMILARITY SEARCH FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_org_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  filter_source_type embedding_source_type DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type embedding_source_type,
  source_id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.source_type, e.source_id, e.chunk_text, e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  WHERE e.organization_id = match_org_id
    AND (filter_source_type IS NULL OR e.source_type = filter_source_type)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGERS (for new tables that have updated_at)
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON briefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
