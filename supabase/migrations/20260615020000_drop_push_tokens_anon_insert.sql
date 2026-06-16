-- Registration now goes through the register-token Edge Function (service role,
-- which bypasses RLS), so the anon INSERT policy added in the init migration is
-- dead and overly permissive. Dropping it leaves push_tokens RLS-on with no
-- anon/authenticated policy -> service role only, like app_secrets and
-- runner_tokens.
drop policy if exists "register token" on push_tokens;
