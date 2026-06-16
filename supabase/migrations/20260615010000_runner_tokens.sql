-- Per-runner write tokens. Replaces the single global RUNWATCH_TOKEN env secret:
-- each runner owns one or more tokens, and the write Edge Functions resolve the
-- runner_id from the presented token. No global source of truth; adding a runner
-- is just more rows. Service-role only (no anon policies).
create table runner_tokens (
  id          uuid primary key default gen_random_uuid(),
  runner_id   uuid not null references runners(id),
  token       text not null unique,
  label       text,                            -- "Ben iPhone Shortcut"
  created_at  timestamptz default now(),
  revoked_at  timestamptz                      -- set to disable a token without deleting it
);

create index runner_tokens_active_idx on runner_tokens (token) where revoked_at is null;

alter table runner_tokens enable row level security;
-- No anon policy at all -> service role only (the Edge Functions).
