-- ============================================================
-- BRAND CONTACTS
-- ============================================================

CREATE TABLE brand_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id    UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  job_title   TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brand_contacts_brand ON brand_contacts(brand_id);

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON brand_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE brand_contacts ENABLE ROW LEVEL SECURITY;

-- Org members can view contacts for brands in their org
CREATE POLICY "brand_contacts_select" ON brand_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands b
        JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = brand_contacts.brand_id
        AND om.user_id = auth.uid()
    )
  );

-- Managers+ can insert contacts
CREATE POLICY "brand_contacts_insert" ON brand_contacts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands b
        JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = brand_contacts.brand_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  );

-- Managers+ can update contacts
CREATE POLICY "brand_contacts_update" ON brand_contacts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM brands b
        JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = brand_contacts.brand_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  );

-- Managers+ can delete contacts
CREATE POLICY "brand_contacts_delete" ON brand_contacts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM brands b
        JOIN organization_members om ON om.organization_id = b.organization_id
      WHERE b.id = brand_contacts.brand_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
    )
  );
