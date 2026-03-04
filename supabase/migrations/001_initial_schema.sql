-- ============================================================
-- BrandFlow Initial Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'admin', 'manager', 'creator', 'developer', 'viewer', 'client'
);

CREATE TYPE project_type AS ENUM ('content_ops', 'web_build', 'full_service');

CREATE TYPE project_status AS ENUM (
  'draft', 'active', 'paused', 'completed', 'archived'
);

CREATE TYPE task_status AS ENUM (
  'backlog', 'todo', 'in_progress', 'in_review',
  'client_review', 'approved', 'scheduled', 'published',
  'blocked', 'done'
);

CREATE TYPE phase_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'skipped'
);

CREATE TYPE content_platform AS ENUM (
  'instagram', 'facebook', 'twitter', 'linkedin',
  'tiktok', 'youtube', 'blog', 'newsletter', 'other'
);

CREATE TYPE deliverable_type AS ENUM (
  'wireframe', 'mockup', 'prototype', 'code',
  'document', 'asset', 'other'
);

CREATE TYPE deliverable_status AS ENUM (
  'draft', 'in_review', 'approved', 'rejected', 'final'
);

CREATE TYPE asset_type AS ENUM (
  'logo', 'image', 'video', 'document', 'font',
  'icon', 'template', 'other'
);

CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================
CREATE TABLE organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'viewer',
  display_name    TEXT,
  avatar_url      TEXT,
  skills          TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'viewer',
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  status          invite_status NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE brands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  logo_url        TEXT,
  website_url     TEXT,
  guidelines      JSONB NOT NULL DEFAULT '{}',
  colors          JSONB NOT NULL DEFAULT '[]',
  fonts           JSONB NOT NULL DEFAULT '[]',
  platforms       content_platform[] DEFAULT '{}',
  settings        JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_brands_org ON brands(organization_id);

-- ============================================================
-- WORKFLOW TEMPLATES
-- ============================================================
CREATE TABLE workflow_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  project_type    project_type NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  stages          JSONB NOT NULL DEFAULT '[]',
  transitions     JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wf_templates_org ON workflow_templates(organization_id);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id              UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  workflow_template_id  UUID REFERENCES workflow_templates(id),
  type                  project_type NOT NULL,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  description           TEXT,
  status                project_status NOT NULL DEFAULT 'draft',
  start_date            DATE,
  end_date              DATE,
  settings              JSONB NOT NULL DEFAULT '{}',
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_brand ON projects(brand_id);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================================
-- PHASES
-- ============================================================
CREATE TABLE phases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          phase_status NOT NULL DEFAULT 'not_started',
  start_date      DATE,
  end_date        DATE,
  milestone_name  TEXT,
  milestone_date  DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phases_project ON phases(project_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id        UUID REFERENCES phases(id) ON DELETE SET NULL,
  parent_task_id  UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  status          task_status NOT NULL DEFAULT 'todo',
  priority        INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  assignee_id     UUID REFERENCES auth.users(id),
  reviewer_id     UUID REFERENCES auth.users(id),
  start_date      DATE,
  due_date        DATE,
  estimated_hours NUMERIC(6,2),
  actual_hours    NUMERIC(6,2),
  depends_on      UUID[] DEFAULT '{}',
  tags            TEXT[] DEFAULT '{}',
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_phase ON tasks(phase_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);

-- ============================================================
-- CONTENT ITEMS
-- ============================================================
CREATE TABLE content_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  platform        content_platform NOT NULL,
  body            TEXT,
  media_urls      TEXT[] DEFAULT '{}',
  hashtags        TEXT[] DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  published_url   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_items_task ON content_items(task_id);
CREATE INDEX idx_content_items_platform ON content_items(platform);
CREATE INDEX idx_content_items_scheduled ON content_items(scheduled_at);

-- ============================================================
-- CONTENT VERSIONS
-- ============================================================
CREATE TABLE content_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  body            TEXT,
  media_urls      TEXT[] DEFAULT '{}',
  change_note     TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(content_item_id, version_number)
);

CREATE INDEX idx_content_versions_item ON content_versions(content_item_id);

-- ============================================================
-- DELIVERABLES
-- ============================================================
CREATE TABLE deliverables (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type            deliverable_type NOT NULL DEFAULT 'document',
  file_url        TEXT,
  file_name       TEXT,
  file_size       BIGINT,
  version         INTEGER NOT NULL DEFAULT 1,
  status          deliverable_status NOT NULL DEFAULT 'draft',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliverables_task ON deliverables(task_id);

-- ============================================================
-- DELIVERABLE VERSIONS
-- ============================================================
CREATE TABLE deliverable_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id  UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  file_url        TEXT NOT NULL,
  file_name       TEXT,
  file_size       BIGINT,
  change_note     TEXT,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(deliverable_id, version_number)
);

CREATE INDEX idx_deliverable_versions_item ON deliverable_versions(deliverable_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES auth.users(id),
  body            TEXT NOT NULL,
  is_internal     BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  attachments     TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);

-- ============================================================
-- ASSETS
-- ============================================================
CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id        UUID REFERENCES brands(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  type            asset_type NOT NULL DEFAULT 'other',
  name            TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  thumbnail_url   TEXT,
  tags            TEXT[] DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_org ON assets(organization_id);
CREATE INDEX idx_assets_brand ON assets(brand_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);

-- ============================================================
-- CLIENT PORTAL ACCESS
-- ============================================================
CREATE TABLE client_access (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id        UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions     JSONB NOT NULL DEFAULT '{"can_approve": true, "can_comment": true}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(brand_id, user_id)
);

CREATE INDEX idx_client_access_brand ON client_access(brand_id);
CREATE INDEX idx_client_access_user ON client_access(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$;
