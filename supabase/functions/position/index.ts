// POST /position   (Bearer <runner token> OR <supabase user JWT>)
// The runner's device posts their location every ~15-30s during a run — from the
// app (user JWT, via expo-location) or a watchOS Shortcut (runner token).
//
// { "lat": 39.0, "lng": -76.9, "run_id": "<uuid from the active run>" }
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, resolveRunner, UnauthorizedError } from '../_shared/env.ts';

// Keep the table bounded — drop this runner's points older than a long run.
const PRUNE_OLDER_THAN_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const admin = adminClient();
    const rid = await resolveRunner(admin, req);

    const { lat, lng, run_id } = (await req.json()) as {
      lat?: number;
      lng?: number;
      run_id?: string;
    };
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return json({ error: 'lat and lng (numbers) are required' }, 400);
    }

    const { error: insErr } = await admin.from('live_positions').insert({
      runner_id: rid,
      run_id: run_id ?? null,
      lat,
      lng,
    });
    if (insErr) throw insErr;

    // Best-effort prune of stale points for this runner.
    const cutoff = new Date(Date.now() - PRUNE_OLDER_THAN_MS).toISOString();
    await admin
      .from('live_positions')
      .delete()
      .eq('runner_id', rid)
      .lt('recorded_at', cutoff);

    return json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ error: err.message }, 401);
    console.error('position error', err);
    return json({ error: String(err) }, 500);
  }
});
