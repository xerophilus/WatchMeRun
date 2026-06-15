// POST /register-token  { token, label }
// Called by the app on launch. Upserts the Expo push token for RUNNER_ID.
// No auth needed (insert-only, unique token).
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, runnerId } from '../_shared/env.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { token, label } = await req.json();
    if (!token || typeof token !== 'string') {
      return json({ error: 'token is required' }, 400);
    }

    const admin = adminClient();
    const { error } = await admin
      .from('push_tokens')
      .upsert(
        { runner_id: runnerId(), token, label: label ?? null },
        { onConflict: 'token' },
      );

    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error('register-token error', err);
    return json({ error: String(err) }, 500);
  }
});
