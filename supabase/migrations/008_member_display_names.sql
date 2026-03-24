-- Get display names for shared calendar members from auth.users
CREATE OR REPLACE FUNCTION get_member_display_names(member_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id,
    COALESCE(
      u.raw_user_meta_data->>'name',
      split_part(u.email::text, '@', 1)
    )::text as display_name
  FROM auth.users u
  WHERE u.id = ANY(member_user_ids);
END;
$$;
