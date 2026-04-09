-- Custom Access Token Hook for sync role to JWT
-- This allows our NestJS backend to read the role directly from the token

CREATE OR REPLACE FUNCTION trovea.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = trovea AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  -- Get user role from profiles table
  SELECT role INTO user_role FROM trovea.profiles WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  -- Add role to app_metadata if found
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata, role}', to_jsonb(user_role));
  END IF;

  -- Update the response
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Note: This function needs to be manually registered in the Supabase Dashboard
-- under Auth > Hooks > Custom Access Token.
-- Execution permission for the auth service role is required.
GRANT EXECUTE ON FUNCTION trovea.custom_access_token_hook(JSONB) TO supabase_auth_admin;
