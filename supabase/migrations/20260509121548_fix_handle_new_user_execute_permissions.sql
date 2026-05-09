/*
  # Fix SECURITY DEFINER function exposure

  The `handle_new_user()` function is a trigger function that should only be
  called internally by the database trigger, never directly via the REST API.

  Changes:
  - Revoke EXECUTE on `handle_new_user()` from `anon` role
  - Revoke EXECUTE on `handle_new_user()` from `authenticated` role
  - Revoke EXECUTE on `handle_new_user()` from `public` (covers all roles)

  This prevents the function from being called via `/rest/v1/rpc/handle_new_user`
  while still allowing the trigger to invoke it normally.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
