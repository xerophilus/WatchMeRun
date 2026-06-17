-- WatchMeRun v2: real accounts + private "watch by request".
--
-- v1 was a single hardcoded runner with public reads (every RLS policy was
-- `using (true)`) and a build-time token deciding runner-vs-watcher. v2 makes
-- every signed-in user a runner, and watching someone else's data requires an
-- approved follow. The iOS Shortcut keeps using runner_tokens (it can't hold a
-- JWT); the app now authenticates as a real Supabase Auth user.

-- ---------------------------------------------------------------------------
-- 1. Link runner identity to an auth account.
-- ---------------------------------------------------------------------------
alter table runners
  add column user_id    uuid unique references auth.users (id) on delete cascade,
  add column avatar_url text;

-- Case-insensitive unique handle so search + "claim my handle" are unambiguous.
create unique index runners_handle_lower_idx on runners (lower(handle));

-- ---------------------------------------------------------------------------
-- 2. Follows: watcher_id watches runner_id, pending until the runner approves.
--    Two independent rows give the bidirectional case (A watches B, B watches A).
-- ---------------------------------------------------------------------------
create table follows (
  id          uuid primary key default gen_random_uuid(),
  watcher_id  uuid not null references runners (id) on delete cascade,
  runner_id   uuid not null references runners (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'approved')),
  created_at  timestamptz default now(),
  approved_at timestamptz,
  unique (watcher_id, runner_id),
  check (watcher_id <> runner_id)
);
create index follows_runner_idx  on follows (runner_id, status);
create index follows_watcher_idx on follows (watcher_id, status);

-- ---------------------------------------------------------------------------
-- 3. Invite codes. A runner mints a code and shares it; redeeming it creates an
--    APPROVED follow (sharing the code is the consent) where the redeemer
--    watches the minter. Redemption runs through the redeem-invite Edge Function
--    (service role) so the redeemer never needs to read others' invite rows.
-- ---------------------------------------------------------------------------
create table invites (
  id         uuid primary key default gen_random_uuid(),
  runner_id  uuid not null references runners (id) on delete cascade,
  code       text not null unique,
  created_at timestamptz default now(),
  expires_at timestamptz,
  max_uses   int not null default 0,   -- 0 = unlimited
  uses       int not null default 0
);
create index invites_code_idx on invites (code);

-- ---------------------------------------------------------------------------
-- 4. Helpers (security definer: they read across rows that the caller's own RLS
--    would hide, but only return booleans / the caller's own runner id).
-- ---------------------------------------------------------------------------
create or replace function current_runner_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select id from runners where user_id = auth.uid()
$$;

-- True when the current user is `target`, or has an approved follow on them.
create or replace function can_view(target uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select target = current_runner_id()
      or exists (
        select 1 from follows f
        where f.runner_id = target
          and f.watcher_id = current_runner_id()
          and f.status = 'approved'
      )
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS rewrite. Drop v1's public reads; gate everything on can_view / ownership.
-- ---------------------------------------------------------------------------
drop policy if exists "read runners"   on runners;
drop policy if exists "read schedule"  on weekly_schedule;
drop policy if exists "read races"     on races;
drop policy if exists "read runs"      on run_events;
drop policy if exists "read positions" on live_positions;

-- runners: any signed-in user can read profiles (needed for handle search and
-- to render names of people you watch). Profile rows are non-sensitive.
create policy "auth read profiles" on runners
  for select to authenticated using (true);
create policy "insert own runner" on runners
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own runner" on runners
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Per-runner content: readable if viewable, writable only by its owner.
create policy "view schedule" on weekly_schedule
  for select to authenticated using (can_view(runner_id));
create policy "write own schedule" on weekly_schedule
  for all to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());

create policy "view races" on races
  for select to authenticated using (can_view(runner_id));
create policy "write own races" on races
  for all to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());

create policy "view runs" on run_events
  for select to authenticated using (can_view(runner_id));
create policy "write own runs" on run_events
  for all to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());

create policy "view positions" on live_positions
  for select to authenticated using (can_view(runner_id));
create policy "write own positions" on live_positions
  for all to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());

-- follows: see rows you're a party to; request as yourself; the target approves;
-- either side can delete (unfollow / decline / remove a watcher).
create policy "view own follows" on follows
  for select to authenticated using (watcher_id = current_runner_id() or runner_id = current_runner_id());
create policy "request follow" on follows
  for insert to authenticated with check (watcher_id = current_runner_id() and status = 'pending');
create policy "approve follow" on follows
  for update to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());
create policy "delete follow" on follows
  for delete to authenticated using (watcher_id = current_runner_id() or runner_id = current_runner_id());

-- invites: a runner manages their own codes. Redemption is server-side.
alter table invites enable row level security;
create policy "manage own invites" on invites
  for all to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());

-- ---------------------------------------------------------------------------
-- 6. Push tokens now belong to the DEVICE OWNER (a runner), not "the crew of
--    runner X". run-event finds a runner's approved watchers, then their tokens.
--    Clear stale v1 rows (which used the old "watched runner" meaning).
-- ---------------------------------------------------------------------------
truncate table push_tokens;
alter table push_tokens enable row level security;
create policy "view own push tokens" on push_tokens
  for select to authenticated using (runner_id = current_runner_id());
create policy "manage own push tokens" on push_tokens
  for all to authenticated using (runner_id = current_runner_id()) with check (runner_id = current_runner_id());
