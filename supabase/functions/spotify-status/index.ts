// POST /spotify-status  (Bearer <supabase user JWT>)
// { action?: 'status' | 'disconnect' }  (default 'status')
// Reports whether the signed-in runner has connected Spotify, and can remove the
// connection. app_secrets is service-role only, so this is how the app learns
// its own connection state without ever reading the secret.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getAuthedUserId, UnauthorizedError } from '../_shared/env.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const admin = adminClient();
    const userId = await getAuthedUserId(req);
    if (!userId) throw new UnauthorizedError('Not authenticated');

    const { data: runner } = await admin
      .from('runners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!runner) throw new UnauthorizedError('No runner profile');

    const { action } = (await req.json().catch(() => ({}))) as { action?: string };

    if (action === 'disconnect') {
      const { error } = await admin
        .from('app_secrets')
        .delete()
        .eq('runner_id', runner.id)
        .eq('key', 'spotify_refresh_token');
      if (error) throw error;
      return json({ connected: false });
    }

    const { data } = await admin
      .from('app_secrets')
      .select('runner_id')
      .eq('runner_id', runner.id)
      .eq('key', 'spotify_refresh_token')
      .maybeSingle();
    return json({ connected: Boolean(data) });
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ error: err.message }, 401);
    console.error('spotify-status error', err);
    return json({ error: String(err) }, 500);
  }
});
