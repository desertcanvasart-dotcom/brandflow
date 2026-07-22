-- ============================================================
-- CUSTOM ACCESS TOKEN HOOK
-- Injects organization_id and user_role into JWT app_metadata
-- so RLS policies can read them without table lookups.
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  member_record RECORD;
BEGIN
  claims := event->'claims';

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

  RETURN jsonb_build_object('claims', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;

-- The hook executes as supabase_auth_admin (SECURITY INVOKER), which has no
-- default access to public tables. Without these grants every token issuance
-- fails with "Error running hook URI" on a fresh project.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.organization_members TO supabase_auth_admin;

-- organization_members has RLS enabled; give the auth role a read policy so
-- the membership lookup above returns rows.
DROP POLICY IF EXISTS "auth_admin_read_members" ON public.organization_members;
CREATE POLICY "auth_admin_read_members"
  ON public.organization_members
  FOR SELECT
  TO supabase_auth_admin
  USING (TRUE);
