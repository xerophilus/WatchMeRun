// GET /spotify-callback?code=...&state=...  (public — Spotify redirects here)
// Exchanges the auth code for a refresh token, stores it for the runner who
// started the flow (looked up via the one-time state), then redirects back into
// the app via the watchmerun:// scheme. No JWT: the state is the proof.
import { adminClient } from '../_shared/env.ts';
import { appCredentials } from '../_shared/spotify.ts';

const APP_RETURN = 'watchmerun://spotify-connected';
const STATE_TTL_MS = 10 * 60 * 1000;

function backToApp(params: Record<string, string>): Response {
  const url = new URL(APP_RETURN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(async (req) => {
  const qs = new URL(req.url).searchParams;
  const code = qs.get('code');
  const state = qs.get('state');
  const oauthError = qs.get('error');

  try {
    if (oauthError) return backToApp({ error: oauthError });
    if (!code || !state) return backToApp({ error: 'missing_code' });

    const admin = adminClient();

    // Consume the one-time state -> runner.
    const { data: st } = await admin
      .from('oauth_states')
      .select('runner_id, created_at')
      .eq('state', state)
      .eq('provider', 'spotify')
      .maybeSingle();
    if (st) await admin.from('oauth_states').delete().eq('state', state);
    if (!st) return backToApp({ error: 'invalid_state' });
    if (Date.now() - new Date(st.created_at).getTime() > STATE_TTL_MS) {
      return backToApp({ error: 'expired_state' });
    }

    const { clientId, clientSecret, redirectUri } = await appCredentials(admin);
    const basic = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      console.error('spotify token exchange failed', tokenRes.status, await tokenRes.text());
      return backToApp({ error: 'exchange_failed' });
    }
    const { refresh_token } = (await tokenRes.json()) as { refresh_token?: string };
    if (!refresh_token) return backToApp({ error: 'no_refresh_token' });

    const { error: upErr } = await admin.from('app_secrets').upsert(
      { runner_id: st.runner_id, key: 'spotify_refresh_token', value: refresh_token },
      { onConflict: 'runner_id, key' },
    );
    if (upErr) {
      console.error('store refresh token failed', upErr);
      return backToApp({ error: 'store_failed' });
    }

    return backToApp({ ok: '1' });
  } catch (err) {
    console.error('spotify-callback error', err);
    return backToApp({ error: 'server_error' });
  }
});
