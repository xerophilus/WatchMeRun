-- WatchMeRun v1 schema.
--
-- Single-runner, but every table carries a `runner_id` seam so v2 can add more
-- runners (each with their own crew of viewers) without a migration. v1
-- hardcodes Ben's runner id everywhere; every query filters by it.

-- Runner identity. v1 has exactly one row (Ben); the FK seam lets v2 add more.
create table runners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- "Ben"
  handle      text unique,                   -- optional short slug for future routing
  created_at  timestamptz default now()
);

-- Current-week schedule. One row per day Ben wants to show.
create table weekly_schedule (
  id           uuid primary key default gen_random_uuid(),
  runner_id    uuid not null references runners(id),
  week_start   date not null,                 -- Monday of the displayed week
  day_date     date not null,
  title        text not null,                 -- e.g. "Easy 6mi" / "Rest" / "Long run 18mi"
  detail       text,                          -- optional notes
  workout_type text,                          -- open | distance_time | custom | rest
  created_at   timestamptz default now(),
  unique (runner_id, day_date)
);

-- Upcoming / season races.
create table races (
  id          uuid primary key default gen_random_uuid(),
  runner_id   uuid not null references runners(id),
  name        text not null,
  race_date   date not null,
  distance    text,                           -- "50K", "24hr", etc.
  location    text,
  is_a_race   boolean default false,
  notes       text,                           -- "A-race", goal, insights
  created_at  timestamptz default now()
);

-- Start/stop events fired by the Shortcut.
create table run_events (
  id            uuid primary key default gen_random_uuid(),
  runner_id     uuid not null references runners(id),
  run_id        uuid,                          -- groups a start+stop (and v2 GPS); set on start
  event_type    text not null,                 -- start | stop
  workout_type  text,                          -- open | distance_time | custom
  workout_label text,                          -- "6mi easy", "3x2mi", etc.
  track_snapshot jsonb,                        -- now-playing at start, optional
  created_at    timestamptz default now()
);

-- Expo push tokens. runner_id = which runner's crew this device follows.
create table push_tokens (
  id          uuid primary key default gen_random_uuid(),
  runner_id   uuid not null references runners(id),
  token       text not null unique,
  label       text,                            -- "Kenz iPhone"
  created_at  timestamptz default now()
);

-- Per-runner secrets (Spotify refresh token, etc.). RLS locked to service role.
create table app_secrets (
  runner_id uuid not null references runners(id),
  key   text not null,                         -- 'spotify_refresh_token', 'spotify_client_id', ...
  value text not null,
  primary key (runner_id, key)
);

-- Helpful read indexes.
create index weekly_schedule_runner_week_idx on weekly_schedule (runner_id, week_start, day_date);
create index races_runner_date_idx on races (runner_id, race_date);
create index run_events_runner_created_idx on run_events (runner_id, created_at desc);
create index run_events_run_id_idx on run_events (run_id);

-- RLS
alter table runners          enable row level security;
alter table weekly_schedule  enable row level security;
alter table races            enable row level security;
alter table run_events       enable row level security;
alter table push_tokens      enable row level security;
alter table app_secrets      enable row level security;

-- Read-only anon access to display tables; writes go through Edge Functions (service role).
create policy "read runners"  on runners          for select using (true);
create policy "read schedule" on weekly_schedule  for select using (true);
create policy "read races"    on races            for select using (true);
create policy "read runs"     on run_events       for select using (true);
-- push_tokens: allow anon insert (register) but not read.
create policy "register token" on push_tokens for insert with check (true);
-- app_secrets: no anon policy at all -> service role only.

-- Seed the single v1 runner. Capture this id for the app (.env EXPO_PUBLIC_RUNNER_ID)
-- and the Edge Function RUNNER_ID env var.
insert into runners (name, handle) values ('Ben', 'ben');

-- Seed the three known races (build order step 3). All stamped with Ben's runner_id.
insert into races (runner_id, name, race_date, distance, location, is_a_race, notes)
values
  ((select id from runners where handle = 'ben'),
   'Pemberton 24hr', '2026-09-18', '24hr', 'Pemberton, NJ', false,
   'Sep 18-19 timed ultra. Pace for the long haul.'),
  ((select id from runners where handle = 'ben'),
   'Rosaryville 50K', '2026-11-14', '50K', 'Rosaryville, MD', true,
   'A-race. The goal race for the season.'),
  ((select id from runners where handle = 'ben'),
   'Taco Bell 50K', '2026-11-27', '50K', null, false,
   'Turkey-weekend fun 50K.');
