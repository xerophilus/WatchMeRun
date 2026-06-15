import { RUNNER_ID, FUNCTIONS_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type { NowPlaying, Race, RunEvent, ScheduleDay } from '@/lib/types';

// Every read filters by runner_id. v1 has one runner so this is effectively a
// constant, but keeping the filter is what makes v2 a config change.

export async function fetchWeek(weekStart: string): Promise<ScheduleDay[]> {
  const { data, error } = await supabase
    .from('weekly_schedule')
    .select('*')
    .eq('runner_id', RUNNER_ID)
    .eq('week_start', weekStart)
    .order('day_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScheduleDay[];
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
  const rows = (data ?? []) as ScheduleDay[];
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
  return (data ?? []) as Race[];
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
  return (data as RunEvent) ?? null;
}

export async function fetchNowPlaying(): Promise<NowPlaying> {
  const res = await fetch(`${FUNCTIONS_URL}/now-playing?runner_id=${RUNNER_ID}`);
  if (!res.ok) return { isPlaying: false };
  return (await res.json()) as NowPlaying;
}
