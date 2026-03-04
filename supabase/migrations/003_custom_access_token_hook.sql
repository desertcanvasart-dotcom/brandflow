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
