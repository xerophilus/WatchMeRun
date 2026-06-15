-- Optional sample week so the "This Week" screen has something to show before
-- Ben curls /update-week for real. Safe to re-run (upsert on runner_id, day_date).
-- Week of Mon 2026-06-15.
insert into weekly_schedule (runner_id, week_start, day_date, title, workout_type, detail)
values
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-15', 'Easy 6mi',      'distance_time', 'keep HR z2'),
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-16', 'Rest',          'rest',          null),
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-17', '3x2mi @ tempo', 'custom',        '2min float between'),
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-18', 'Easy 5mi',      'distance_time', 'shakeout'),
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-19', 'Rest',          'rest',          null),
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-20', 'Long run 18mi', 'distance_time', 'last 4 at goal pace'),
  ((select id from runners where handle='ben'), '2026-06-15', '2026-06-21', 'Open',          'open',          'easy by feel')
on conflict (runner_id, day_date) do update
  set week_start   = excluded.week_start,
      title        = excluded.title,
      workout_type = excluded.workout_type,
      detail       = excluded.detail;
