// POST /run-event  (Bearer RUNWATCH_TOKEN)
// The Shortcut hits this on start and stop.
//
// { "event_type": "start", "workout_type": "distance_time", "workout_label": "6mi easy" }
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, resolveRunnerFromToken, UnauthorizedError } from '../_shared/env.ts';
import { sendExpoPush } from '../_shared/expoPush.ts';
import { getNowPlaying } from '../_shared/spotify.ts';

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const admin = adminClient();
    const rid = await resolveRunnerFromToken(admin, req);

    const { event_type, workout_type, workout_label } = (await req.json()) as {
      event_type?: string;
      workout_type?: string;
      workout_label?: string;
    };
    if (event_type !== 'start' && event_type !== 'stop') {
      return json({ error: "event_type must be 'start' or 'stop'" }, 400);
    }

    let runId = crypto.randomUUID();
    let trackSnapshot: unknown = null;
    let durationLabel: string | null = null;
    let pushTitle: string;
    let pushBody: string;

    if (event_type === 'start') {
      // Snapshot now-playing at start; never let Spotify hiccups block the event.
      try {
        const np = await getNowPlaying(admin, rid);
        trackSnapshot = np;
      } catch (e) {
        console.warn('now-playing snapshot failed (continuing):', String(e));
      }
      pushTitle = 'Ben started a run 🏃';
      pushBody = workout_label ?? 'Heading out';
    } else {
      // Reuse the run_id from the latest open start for this runner.
      const { data: lastStart } = await admin
        .from('run_events')
        .select('run_id, created_at, workout_label')
        .eq('runner_id', rid)
        .eq('event_type', 'start')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastStart?.run_id) {
        runId = lastStart.run_id;
        const elapsed = Date.now() - new Date(lastStart.created_at).getTime();
        durationLabel = formatDuration(elapsed);
      }
      pushTitle = 'Ben finished his run ✅';
      pushBody = durationLabel ? `Out for ${durationLabel}` : (workout_label ?? 'Done');
    }

    const { error: insErr } = await admin.from('run_events').insert({
      runner_id: rid,
      run_id: runId,
      event_type,
      workout_type: workout_type ?? null,
      workout_label: workout_label ?? null,
      track_snapshot: trackSnapshot,
    });
    if (insErr) throw insErr;

    // Notify the crew.
    const { data: tokenRows } = await admin
      .from('push_tokens')
      .select('token')
      .eq('runner_id', rid);
    const tokens = (tokenRows ?? []).map((t) => t.token as string);
    await sendExpoPush(tokens, { title: pushTitle, body: pushBody });

    return json({ ok: true, run_id: runId, notified: tokens.length });
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ error: err.message }, 401);
    console.error('run-event error', err);
    return json({ error: String(err) }, 500);
  }
});
