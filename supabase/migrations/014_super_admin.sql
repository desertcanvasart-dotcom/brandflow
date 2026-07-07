-- ============================================================
-- SUPER ADMIN: Platform-level admin role
-- Adds platform_admins table, is_super_admin() helper,
-- modifies JWT hook, and adds RLS bypass policies.
-- ============================================================

-- 1A. Platform admins table
CREATE TABLE platform_admins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes      TEXT
);

CREATE INDEX idx_platform_admins_user ON platform_admins(user_id);

-- Grant SELECT to supabase_auth_admin so JWT hook can query this table
GRANT SELECT ON public.platform_admins TO supabase_auth_admin;

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- 1B. is_super_admin() RLS helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'is_super_admin')::BOOLEAN,
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS policies for platform_admins table (self-referencing)
CREATE POLICY "Super admins can view platform_admins"
  ON platform_admins FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert platform_admins"
  ON platform_admins FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete platform_admins"
  ON platform_admins FOR DELETE
  USING (public.is_super_admin());

-- 1C. Modify JWT hook to inject is_super_admin
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  member_record RECORD;
  is_platform_admin BOOLEAN;
BEGIN
  claims := event->'claims';

  -- Existing: inject organization_id and user_role
  SELECT om.organization_id, om.role
  INTO member_record
  FROM public.organization_members om
  WHERE om.user_id = (event->>'user_id')::UUID
    AND om.is_active = TRUE
  LIMIT 1;

  IF member_record IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata, organization_id}',
      to_jsonb(member_record.organization_id::TEXT)
    );

    claims := jsonb_set(
      claims,
      '{app_metadata, user_role}',
      to_jsonb(member_record.role::TEXT)
    );
  END IF;

  -- New: inject is_super_admin
  SELECT EXISTS(
    SELECT 1 FROM public.platform_admins
    WHERE user_id = (event->>'user_id')::UUID
  ) INTO is_platform_admin;

  claims := jsonb_set(
    claims,
    '{app_metadata, is_super_admin}',
    to_jsonb(is_platform_admin)
  );

  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- 1D. Add is_disabled to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT;

-- 1E. Super admin RLS bypass policies (SELECT)
CREATE POLICY "Super admins can view all organizations"
  ON organizations FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can view all members"
  ON organization_members FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can view all brands"
  ON brands FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can view all projects"
  ON projects FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "Super admins can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (public.is_super_admin());
