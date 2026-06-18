-- Doubles: allow multiple sessions per day (AM/PM). v1 enforced a single
-- (runner_id, day_date) row; the schedule redesign treats a day as an ordered
-- list of sessions, so drop the unique constraint and add an explicit intra-day
-- ordering column. Writes remain delete-then-insert per week (see updateWeek /
-- the update-week function), which is unaffected by the dropped constraint.
alter table weekly_schedule drop constraint weekly_schedule_runner_id_day_date_key;

alter table weekly_schedule add column position smallint not null default 0;

create index weekly_schedule_runner_day_position_idx
  on weekly_schedule (runner_id, day_date, position);
