// POST /provision-runner  (Bearer <supabase user JWT>)
// Called by the app right after Sign in with Apple. Idempotent:
//  - returns the runner already linked to this auth user, OR
//  - claims an existing unclaimed handle (e.g. the seeded 'ben'), OR
//  - creates a new runner.
//
// Body (only needed the first time): { "name": "Ben", "handle": "ben" }
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getAuthedUserId } from '../_shared/env.ts';

const HANDLE_RE = /^[a-z0-9_]{2,30}$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const admin = adminClient();

    // Already linked? Return it — this is the common case on every launch.
    const { data: existing } = await admin
      .from('runners')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) return json({ runner: existing });

    const { name, handle } = (await req.json().catch(() => ({}))) as {
      name?: string;
      handle?: string;
    };
    const cleanName = (name ?? '').trim();
    const cleanHandle = (handle ?? '').trim().toLowerCase().replace(/^@/, '');
    if (!cleanName) return json({ error: 'A display name is required.' }, 400);
    if (!HANDLE_RE.test(cleanHandle)) {
      return json({ error: 'Handle must be 2–30 chars: letters, numbers, or _.' }, 400);
    }

    // Claim an existing unclaimed handle, otherwise create a fresh runner.
    const { data: byHandle } = await admin
      .from('runners')
      .select('id, user_id')
      .eq('handle', cleanHandle)
      .maybeSingle();

    if (byHandle) {
      if (byHandle.user_id) return json({ error: 'That handle is taken.' }, 409);
      const { data: claimed, error } = await admin
        .from('runners')
        .update({ user_id: userId, name: cleanName })
        .eq('id', byHandle.id)
        .select()
        .single();
      if (error) throw error;
      return json({ runner: claimed });
    }

    const { data: created, error } = await admin
      .from('runners')
      .insert({ user_id: userId, name: cleanName, handle: cleanHandle })
      .select()
      .single();
    if (error) throw error;
    return json({ runner: created });
  } catch (err) {
    console.error('provision-runner error', err);
    return json({ error: String(err) }, 500);
  }
});
