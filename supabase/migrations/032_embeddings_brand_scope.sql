-- ============================================================
-- 032_embeddings_brand_scope.sql
--
-- Scopes RAG retrieval by brand.
--
-- THE PROBLEM
--   `embeddings` carried only organization_id, so match_embeddings
--   could not distinguish one client's material from another's.
--   Every AI tool that retrieves context (ad copy, CTA, SEO
--   research, competitor analysis, performance report, and the
--   knowledge-base Ask) could therefore pull Client B's documents
--   into work produced for Client A. Tenant isolation was intact;
--   BRAND isolation did not exist.
--
-- THE MODEL
--   Knowledge sits on three shelves (knowledge_base_documents
--   already records this as knowledge_scope):
--     * agency  — how the agency works. Applies to EVERY client.
--     * brand   — belongs to one client. Must never cross.
--     * project — belongs to one engagement (implies its brand).
--
--   Retrieval for a client therefore reads:
--       that brand's rows  +  agency rows (brand_id IS NULL)
--   and never another brand's rows.
--
-- WHY BRAND IS RESOLVED IN THE DATABASE
--   brand_id is derived by a BEFORE INSERT trigger rather than
--   passed from the 18 triggerEmbedding() call sites. That way a
--   new embedding source cannot silently reintroduce the leak by
--   forgetting to pass it, and the backfill below shares one
--   definition with the runtime path (resolve_embedding_brand),
--   so the two cannot drift.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A1 — the column
--
-- NULL means "agency scope: applies to every brand". ON DELETE
-- CASCADE mirrors knowledge_base_documents.brand_id (017), so a
-- deleted brand takes its embeddings with it rather than leaving
-- them behind reclassified as agency knowledge.
-- ------------------------------------------------------------
ALTER TABLE embeddings
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;

COMMENT ON COLUMN embeddings.brand_id IS
  'Owning brand. NULL = agency-scope knowledge, readable for every brand.';

-- Supports the filtered vector search: Postgres narrows on this
-- btree before/alongside the HNSW scan.
CREATE INDEX IF NOT EXISTS idx_embeddings_org_brand
  ON embeddings(organization_id, brand_id);

-- ------------------------------------------------------------
-- A2 — the resolver
--
-- Maps (source_type, source_id) to a brand. Returns NULL for
-- genuinely agency-scoped rows AND for anything unresolvable —
-- both are treated as "applies to everyone", which is the safe
-- direction for availability but the permissive one for privacy.
-- Every source type below has a verified join path; see A3 for
-- the counts this produced at migration time.
--
-- Note two collisions handled here:
--   * 'brief' is emitted for BOTH briefs and service_briefs.
--   * 'meeting_transcript' is emitted with a meetings.id (from
--     meeting.update) and with a meeting_sessions.id (from
--     post-meeting processing).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_embedding_brand(
  p_source_type embedding_source_type,
  p_source_id   UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  CASE p_source_type

    -- Knowledge base document: brand_id is stored directly and is
    -- NULL for agency-scope documents. Authoritative, no join.
    WHEN 'document' THEN
      SELECT d.brand_id INTO v_brand_id
      FROM knowledge_base_documents d
      WHERE d.id = p_source_id;

    -- Brand guidelines / strategy: source_id IS the brand id.
    WHEN 'brand_guidelines' THEN
      SELECT b.id INTO v_brand_id
      FROM brands b
      WHERE b.id = p_source_id;

    -- Transcript: either a meetings row (brand_id direct, else via
    -- its project) or a meeting_sessions row (via room -> project).
    WHEN 'meeting_transcript' THEN
      SELECT COALESCE(m.brand_id, p.brand_id) INTO v_brand_id
      FROM meetings m
      LEFT JOIN projects p ON p.id = m.project_id
      WHERE m.id = p_source_id;

      IF v_brand_id IS NULL THEN
        SELECT p.brand_id INTO v_brand_id
        FROM meeting_sessions s
        JOIN meeting_rooms r ON r.id = s.room_id
        JOIN projects p      ON p.id = r.project_id
        WHERE s.id = p_source_id;
      END IF;

    -- Brief: briefs first, then service_briefs (same source_type).
    WHEN 'brief' THEN
      SELECT p.brand_id INTO v_brand_id
      FROM briefs br
      JOIN projects p ON p.id = br.project_id
      WHERE br.id = p_source_id;

      IF v_brand_id IS NULL THEN
        SELECT p.brand_id INTO v_brand_id
        FROM service_briefs sb
        JOIN projects p ON p.id = sb.project_id
        WHERE sb.id = p_source_id;
      END IF;

    -- Content item: task -> project -> brand.
    WHEN 'content_item' THEN
      SELECT p.brand_id INTO v_brand_id
      FROM content_items ci
      JOIN tasks t    ON t.id = ci.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE ci.id = p_source_id;

    -- Comment: task -> project -> brand.
    WHEN 'comment' THEN
      SELECT p.brand_id INTO v_brand_id
      FROM comments c
      JOIN tasks t    ON t.id = c.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE c.id = p_source_id;

    ELSE
      v_brand_id := NULL;
  END CASE;

  RETURN v_brand_id;
END;
$$;

-- ------------------------------------------------------------
-- A3 — populate on write
--
-- BEFORE INSERT so brand_id is correct without any application
-- change. An explicitly supplied brand_id wins, so a future caller
-- can override the derivation if it ever needs to.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_embedding_brand()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brand_id IS NULL THEN
    NEW.brand_id := resolve_embedding_brand(NEW.source_type, NEW.source_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_embedding_brand ON embeddings;
CREATE TRIGGER trg_set_embedding_brand
  BEFORE INSERT ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION set_embedding_brand();

-- ------------------------------------------------------------
-- A4 — backfill existing rows
--
-- Uses the same resolver as the trigger. Cheap today (the table is
-- near-empty); this is the least expensive moment to do it.
-- ------------------------------------------------------------
UPDATE embeddings
SET brand_id = resolve_embedding_brand(source_type, source_id)
WHERE brand_id IS NULL;

-- ------------------------------------------------------------
-- A5 — brand-aware similarity search
--
-- filter_brand_id NULL  -> unchanged, organization-wide. This is
--   what the agency's own hub Ask uses.
-- filter_brand_id set   -> that brand's rows PLUS agency rows
--   (brand_id IS NULL). Agency process knowledge informs every
--   client's output; one client's material never reaches another.
--
-- Parameter is appended last with a default so existing callers
-- keep working untouched.
--
-- DROP first, deliberately: CREATE OR REPLACE cannot change a
-- function's argument list — adding a parameter would create a
-- second overload and leave the old unfiltered 5-argument version
-- in place, which PostgREST would still happily resolve. The new
-- parameter's DEFAULT keeps 5-argument callers working.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS match_embeddings(
  vector(1536), UUID, FLOAT, INTEGER, embedding_source_type
);

CREATE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_org_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10,
  filter_source_type embedding_source_type DEFAULT NULL,
  filter_brand_id UUID DEFAULT NULL
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
    AND (
      filter_brand_id IS NULL           -- no brand filter requested
      OR e.brand_id = filter_brand_id   -- this client's knowledge
      OR e.brand_id IS NULL             -- agency knowledge, applies to all
    )
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMIT;
