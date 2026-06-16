import { RUNNER_ID, FUNCTIONS_URL, RUNNER_TOKEN } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { LivePosition, NowPlaying, Race, RunEvent, ScheduleDay } from '@/lib/types';

// Every read filters by runner_id. v1 has one runner so this is effectively a
// constant, but keeping the filter is what makes v2 a config change. Results are
// typed via the generated Database schema on the client.

export async function fetchWeek(weekStart: string): Promise<ScheduleDay[]> {
  const { data, error } = await supabase
    .from('weekly_schedule')
    .select('*')
    .eq('runner_id', RUNNER_ID)
    .eq('week_start', weekStart)
    .order('day_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Falls back to the most recent week if the current week has no rows yet. */
export async function fetchLatestWeek(): Promise<ScheduleDay[]> {
  const { data, error } = await supabase
    .from('weekly_schedule')
    .select('*')
    .eq('runner_id', RUNNER_ID)
    .order('week_start', { ascending: false })
    .order('day_date', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const latestWeek = rows[0].week_start;
  return rows.filter((r) => r.week_start === latestWeek);
}

export async function fetchRaces(): Promise<Race[]> {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('runner_id', RUNNER_ID)
    .order('race_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** The single most recent run event (start or stop), for the Live status card. */
export async function fetchLatestRunEvent(): Promise<RunEvent | null> {
  const { data, error } = await supabase
    .from('run_events')
    .select('*')
    .eq('runner_id', RUNNER_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as RunEvent | null) ?? null;
}

/** Latest GPS position for the active run (v2 live tracking). */
export async function fetchLatestPosition(runId: string | null): Promise<LivePosition | null> {
  if (!runId) return null;
  const { data, error } = await supabase
    .from('live_positions')
    .select('*')
    .eq('runner_id', RUNNER_ID)
    .eq('run_id', runId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchNowPlaying(): Promise<NowPlaying> {
  const res = await fetch(`${FUNCTIONS_URL}/now-playing?runner_id=${RUNNER_ID}`);
  if (!res.ok) return { isPlaying: false };
  return (await res.json()) as NowPlaying;
}

/**
 * Fire a run start/stop beacon — the same `run-event` Edge Function the iOS
 * Shortcut hits. Runner-only: requires RUNNER_TOKEN (the runner's own build).
 * The function resolves runner_id from the token, snapshots now-playing on
 * start, and notifies watchers, so there's nothing else to pass.
 */
export async function sendRunEvent(
  eventType: 'start' | 'stop',
  opts: { workoutType?: string; workoutLabel?: string } = {},
): Promise<void> {
  if (!RUNNER_TOKEN) throw new Error('No runner token configured on this device.');
  const res = await fetch(`${FUNCTIONS_URL}/run-event`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RUNNER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_type: eventType,
      workout_type: opts.workoutType,
      workout_label: opts.workoutLabel,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`run-event failed (${res.status}): ${detail}`);
  }
}

/**
 * Replace a whole week's schedule. Runner-only: hits the same `update-week`
 * Edge Function Ben used to curl, which resolves the runner from RUNNER_TOKEN,
 * wipes the existing rows for that week_start, and inserts the new set.
 */
export async function updateWeek(
  weekStart: string,
  days: { day_date: string; title: string; detail?: string; workout_type?: string }[],
): Promise<number> {
  if (!RUNNER_TOKEN) throw new Error('No runner token configured on this device.');
  const res = await fetch(`${FUNCTIONS_URL}/update-week`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RUNNER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ week_start: weekStart, days }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`update-week failed (${res.status}): ${detail}`);
  }
  const body = (await res.json().catch(() => ({}))) as { count?: number };
  return body.count ?? days.length;
}
