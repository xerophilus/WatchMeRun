-- v2 groundwork: live GPS breadcrumb trail. Attaches to a run via run_id, which
-- run_events already carries from v1 -> no migration needed to link them.
create table live_positions (
  id          uuid primary key default gen_random_uuid(),
  runner_id   uuid not null references runners(id),
  run_id      uuid,
  lat         double precision not null,
  lng         double precision not null,
  recorded_at timestamptz not null default now()
);

create index live_positions_run_idx on live_positions (run_id, recorded_at desc);
create index live_positions_runner_idx on live_positions (runner_id, recorded_at desc);

alter table live_positions enable row level security;
-- Anon read for v1-consistency (matches the other display tables). Location is
-- sensitive: v2 should gate this behind a share code / auth and auto-stop writes
-- on the run's stop event. Writes go only through the /position Edge Function.
create policy "read positions" on live_positions for select using (true);
