-- Per-runner Spotify connect (OAuth Authorization Code flow).
--
-- App-level credentials (client id/secret) live in Edge Function env vars now
-- (shared across runners), with a fallback to app_secrets for the originally
-- seeded runner. Each runner's own refresh_token is stored in app_secrets under
-- key 'spotify_refresh_token' by the spotify-callback function.
--
-- oauth_states ties a Spotify redirect back to the runner who started the flow.
-- It's written/read only by Edge Functions (service role), so RLS is on with no
-- policies — the device can never see or touch it.
create table oauth_states (
  state      text primary key,
  runner_id  uuid not null references runners (id) on delete cascade,
  provider   text not null default 'spotify',
  created_at timestamptz not null default now()
);

alter table oauth_states enable row level security;
