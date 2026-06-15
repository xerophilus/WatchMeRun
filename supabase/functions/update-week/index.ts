// POST /update-week  (Bearer RUNWATCH_TOKEN)
// Ben curls this to set the current week. Deletes existing rows for this
// runner + week_start, then inserts the new set.
//
// {
//   "week_start": "2026-06-15",
//   "days": [
//     { "day_date": "2026-06-15", "title": "Easy 6mi", "workout_type": "distance_time", "detail": "z2" },
//     { "day_date": "2026-06-16", "title": "Rest", "workout_type": "rest" }
//   ]
// }
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, assertBearer, runnerId, UnauthorizedError } from '../_shared/env.ts';

type Day = {
  day_date: string;
  title: string;
  workout_type?: string;
  detail?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    assertBearer(req);

    const { week_start, days } = (await req.json()) as {
      week_start?: string;
      days?: Day[];
    };
    if (!week_start || !Array.isArray(days)) {
      return json({ error: 'week_start and days[] are required' }, 400);
    }

    const rid = runnerId();
    const admin = adminClient();

    // Replace the whole week for this runner.
    const { error: delErr } = await admin
      .from('weekly_schedule')
      .delete()
      .eq('runner_id', rid)
      .eq('week_start', week_start);
    if (delErr) throw delErr;

    const rows = days.map((d) => ({
      runner_id: rid,
      week_start,
      day_date: d.day_date,
      title: d.title,
      workout_type: d.workout_type ?? null,
      detail: d.detail ?? null,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await admin
        .from('weekly_schedule')
        .upsert(rows, { onConflict: 'runner_id, day_date' });
      if (insErr) throw insErr;
    }

    return json({ ok: true, count: rows.length });
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ error: err.message }, 401);
    console.error('update-week error', err);
    return json({ error: String(err) }, 500);
  }
});
