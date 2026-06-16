// POST /spotify-connect  (Bearer <supabase user JWT>)
// Starts the Spotify connect flow for the signed-in runner. Returns the Spotify
// authorize URL; the app opens it in an auth session. A one-time state row ties
// the eventual callback back to this runner.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getAuthedUserId, UnauthorizedError } from '../_shared/env.ts';
import { appCredentials } from '../_shared/spotify.ts';

const SCOPE = 'user-read-currently-playing';

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

    const { clientId, redirectUri } = await appCredentials(admin);

    const state = crypto.randomUUID();
    const { error: stErr } = await admin
      .from('oauth_states')
      .insert({ state, runner_id: runner.id, provider: 'spotify' });
    if (stErr) throw stErr;

    const url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', SCOPE);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    // Force the account chooser so a runner can pick the right Spotify account.
    url.searchParams.set('show_dialog', 'true');

    return json({ url: url.toString() });
  } catch (err) {
    if (err instanceof UnauthorizedError) return json({ error: err.message }, 401);
    console.error('spotify-connect error', err);
    return json({ error: String(err) }, 500);
  }
});
