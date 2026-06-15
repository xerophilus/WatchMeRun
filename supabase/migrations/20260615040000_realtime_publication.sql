-- Let the Live screen subscribe to run start/stop and GPS updates in real time.
-- (New tables are not in the realtime publication by default.)
alter publication supabase_realtime add table run_events;
alter publication supabase_realtime add table live_positions;
