import { FUNCTIONS_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import type {
  IncomingRequest,
  Invite,
  LivePosition,
  NowPlaying,
  Race,
  RunEvent,
  Runner,
  ScheduleDay,
} from '@/lib/types';

// v2: reads/writes run as the signed-in user. RLS decides what's visible (self +
// people you have an approved follow on), so callers just pass the runner id they
// want to view — a forbidden one simply returns nothing.

/** POST to an Edge Function with the current user's access token. */
async function authedFetch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in.');
  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: { error?: string } & Record<string, unknown> = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) throw new Error(parsed.error ?? `${path} failed (${res.status}).`);
  return parsed as T;
}

// --- Identity ---------------------------------------------------------------

/**
 * Resolve (or, with a profile, create/claim) the signed-in user's runner row.
 * Returns null when the user has no profile yet (-> onboarding).
 */
export async function provisionRunner(profile?: {
  name: string;
  handle: string;
}): Promise<Runner | null> {
  const out = await authedFetch<{ runner: Runner | null }>('provision-runner', profile ?? {});
  return out.runner ?? null;
}

// --- Spotify connect --------------------------------------------------------

/** Authorize URL for the signed-in runner to connect their Spotify account. */
export async function getSpotifyConnectUrl(): Promise<string> {
  const out = await authedFetch<{ url: string }>('spotify-connect');
  return out.url;
}

/** Whether the signed-in runner has Spotify connected. */
export async function fetchSpotifyStatus(): Promise<boolean> {
  const out = await authedFetch<{ connected: boolean }>('spotify-status', { action: 'status' });
  return out.connected;
}

/** Remove the signed-in runner's Spotify connection. */
export async function disconnectSpotify(): Promise<void> {
  await authedFetch('spotify-status', { action: 'disconnect' });
}

// --- Social graph -----------------------------------------------------------

/** Runners I watch (approved follows where I'm the watcher). */
export async function fetchWatching(meId: string): Promise<Runner[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('runner:runners!follows_runner_id_fkey(*)')
    .eq('watcher_id', meId)
    .eq('status', 'approved');
  if (error) throw error;
  return (data ?? []).map((r) => (r as unknown as { runner: Runner }).runner).filter(Boolean);
}

/** People watching me, already approved. */
export async function fetchMyWatchers(meId: string): Promise<Runner[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('watcher:runners!follows_watcher_id_fkey(*)')
    .eq('runner_id', meId)
    .eq('status', 'approved');
  if (error) throw error;
  return (data ?? []).map((r) => (r as unknown as { watcher: Runner }).watcher).filter(Boolean);
}

/** Pending requests to watch me, awaiting my approval. */
export async function fetchIncomingRequests(meId: string): Promise<IncomingRequest[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('id, watcher_id, runner_id, status, created_at, approved_at, watcher:runners!follows_watcher_id_fkey(*)')
    .eq('runner_id', meId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const { watcher, ...follow } = row as unknown as IncomingRequest['follow'] & { watcher: Runner };
    return { follow: follow as IncomingRequest['follow'], watcher };
  });
}

/** Find runners to watch, by @handle (excludes me). */
export async function searchRunners(query: string, meId: string): Promise<Runner[]> {
  const q = query.trim().replace(/^@/, '');
  if (!q) return [];
  const { data, error } = await supabase
    .from('runners')
    .select('*')
    .ilike('handle', `%${q}%`)
    .neq('id', meId)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/** Ask to watch someone (creates a pending follow). */
export async function requestFollow(meId: string, runnerId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .upsert({ watcher_id: meId, runner_id: runnerId, status: 'pending' }, { onConflict: 'watcher_id, runner_id' });
  if (error) throw error;
}

/** Approve an incoming request (I'm the runner being watched). */
export async function approveFollow(followId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', followId);
  if (error) throw error;
}

/** Decline a request / unfollow / remove a watcher (either side can delete). */
export async function removeFollow(followId: string): Promise<void> {
  const { error } = await supabase.from('follows').delete().eq('id', followId);
  if (error) throw error;
}

// --- Invites ----------------------------------------------------------------

function randomCode(): string {
  const part = () => Math.random().toString(36).slice(2, 6);
  return `${part()}-${part()}`;
}

/** Mint a shareable invite code; redeeming it auto-approves watching me. */
export async function createInvite(
  meId: string,
  opts: { maxUses?: number; expiresAt?: string } = {},
): Promise<Invite> {
  const { data, error } = await supabase
    .from('invites')
    .insert({
      runner_id: meId,
      code: randomCode(),
      max_uses: opts.maxUses ?? 0,
      expires_at: opts.expiresAt ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Redeem a code someone shared (server-side: creates an approved follow). */
export async function redeemInvite(code: string): Promise<string> {
  const out = await authedFetch<{ runner_id: string }>('redeem-invite', { code });
  return out.runner_id;
}

// --- Schedule / races / runs (read by viewed runner) ------------------------

export async function fetchWeek(runnerId: string, weekStart: string): Promise<ScheduleDay[]> {
  const { data, error } = await supabase
    .from('weekly_schedule')
    .select('*')
    .eq('runner_id', runnerId)
    .eq('week_start', weekStart)
    .order('day_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Falls back to the most recent week if the current week has no rows yet. */
export async function fetchLatestWeek(runnerId: string): Promise<ScheduleDay[]> {
  const { data, error } = await supabase
    .from('weekly_schedule')
    .select('*')
    .eq('runner_id', runnerId)
    .order('week_start', { ascending: false })
    .order('day_date', { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const latestWeek = rows[0].week_start;
  return rows.filter((r) => r.week_start === latestWeek);
}

export async function fetchRaces(runnerId: string): Promise<Race[]> {
  const { data, error } = await supabase
    .from('races')
    .select('*')
    .eq('runner_id', runnerId)
    .order('race_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** The single most recent run event (start or stop), for the Live status card. */
export async function fetchLatestRunEvent(runnerId: string): Promise<RunEvent | null> {
  const { data, error } = await supabase
    .from('run_events')
    .select('*')
    .eq('runner_id', runnerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as RunEvent | null) ?? null;
}

/** Latest GPS position for the active run (v2 live tracking). */
export async function fetchLatestPosition(
  runnerId: string,
  runId: string | null,
): Promise<LivePosition | null> {
  if (!runId) return null;
  const { data, error } = await supabase
    .from('live_positions')
    .select('*')
    .eq('runner_id', runnerId)
    .eq('run_id', runId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Every GPS point of a run, oldest first — the breadcrumb trail + distance. */
export async function fetchRunPath(runnerId: string, runId: string | null): Promise<LivePosition[]> {
  if (!runId) return [];
  const { data, error } = await supabase
    .from('live_positions')
    .select('*')
    .eq('runner_id', runnerId)
    .eq('run_id', runId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchNowPlaying(runnerId: string): Promise<NowPlaying> {
  // Send the viewer's token so the endpoint can enforce the follow gate; a
  // forbidden viewer just gets "nothing playing" rather than the track.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${FUNCTIONS_URL}/now-playing?runner_id=${runnerId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) return { isPlaying: false };
  return (await res.json()) as NowPlaying;
}

// --- Runner writes ----------------------------------------------------------

/**
 * Fire a run start/stop beacon. Authenticated as the signed-in user, so the
 * run-event function resolves the runner from their JWT (the same function the
 * iOS Shortcut hits with a runner_token), snapshots now-playing, and pushes the
 * runner's approved watchers.
 */
export async function sendRunEvent(
  eventType: 'start' | 'stop',
  opts: { workoutType?: string; workoutLabel?: string } = {},
): Promise<{ runId: string | null }> {
  const out = await authedFetch<{ run_id?: string }>('run-event', {
    event_type: eventType,
    workout_type: opts.workoutType,
    workout_label: opts.workoutLabel,
  });
  return { runId: out.run_id ?? null };
}

/** Report one GPS point for the active run (background location reporter). */
export async function postPosition(lat: number, lng: number, runId: string): Promise<void> {
  await authedFetch('position', { lat, lng, run_id: runId });
}

/**
 * Replace a week of my own schedule. Writes directly under RLS (which only lets
 * me touch my own rows) — no Edge Function needed now that the app is authed.
 */
export async function updateWeek(
  meId: string,
  weekStart: string,
  days: { day_date: string; title: string; detail?: string; workout_type?: string }[],
): Promise<number> {
  const { error: delErr } = await supabase
    .from('weekly_schedule')
    .delete()
    .eq('runner_id', meId)
    .eq('week_start', weekStart);
  if (delErr) throw delErr;

  if (days.length === 0) return 0;
  const rows = days.map((d) => ({
    runner_id: meId,
    week_start: weekStart,
    day_date: d.day_date,
    title: d.title,
    detail: d.detail ?? null,
    workout_type: d.workout_type ?? null,
  }));
  const { error: insErr } = await supabase.from('weekly_schedule').insert(rows);
  if (insErr) throw insErr;
  return rows.length;
}
