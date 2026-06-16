// POST /register-token  { token, label, runner_id }
// Called by the app on launch. Upserts the Expo push token for the runner the
// device follows. No bearer needed (insert-only, unique token); the runner_id
// comes from the request (the app knows which runner it follows).
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/env.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { token, label, runner_id } = await req.json();
    if (!token || typeof token !== 'string') {
      return json({ error: 'token is required' }, 400);
    }
    if (!runner_id || typeof runner_id !== 'string') {
      return json({ error: 'runner_id is required' }, 400);
    }

    const admin = adminClient();
    const { error } = await admin
      .from('push_tokens')
      .upsert(
        { runner_id, token, label: label ?? null },
        { onConflict: 'token' },
      );

    if (error) throw error;
    return json({ ok: true });
  } catch (err) {
    console.error('register-token error', err);
    return json({ error: String(err) }, 500);
  }
});
