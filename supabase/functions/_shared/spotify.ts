import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

// Normalized now-playing shape returned to the Live screen.
export type NowPlaying =
  | { isPlaying: false }
  | {
      isPlaying: true;
      track: string;
      artist: string;
      albumArt: string | null;
      progressMs: number;
      durationMs: number;
    };

type Secrets = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

/**
 * App-level Spotify credentials, shared by every runner. Prefer Edge Function
 * env vars (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET); fall back to the
 * originally seeded runner's app_secrets rows so the pre-OAuth setup keeps
 * working. The redirect URI must match one registered in the Spotify dashboard.
 */
export async function appCredentials(
  admin: SupabaseClient,
): Promise<{ clientId: string; clientSecret: string; redirectUri: string }> {
  let clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  let clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    const { data } = await admin
      .from('app_secrets')
      .select('key, value')
      .in('key', ['spotify_client_id', 'spotify_client_secret']);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    clientId = clientId || map.get('spotify_client_id');
    clientSecret = clientSecret || map.get('spotify_client_secret');
  }
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify app credentials (set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET).');
  }

  const redirectUri =
    Deno.env.get('SPOTIFY_REDIRECT_URI') ??
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/spotify-callback`;
  return { clientId, clientSecret, redirectUri };
}

async function loadSecrets(admin: SupabaseClient, runnerId: string): Promise<Secrets> {
  const { clientId, clientSecret } = await appCredentials(admin);

  // Each runner's own refresh token, written by spotify-callback on connect.
  const { data, error } = await admin
    .from('app_secrets')
    .select('value')
    .eq('runner_id', runnerId)
    .eq('key', 'spotify_refresh_token')
    .maybeSingle();
  if (error) throw error;

  const refreshToken = data?.value as string | undefined;
  if (!refreshToken) {
    throw new Error('This runner has not connected Spotify.');
  }
  return { clientId, clientSecret, refreshToken };
}

async function mintAccessToken(secrets: Secrets): Promise<string> {
  // Tokens last ~1hr but Edge invocations are cold, so we just refresh each time.
  const basic = btoa(`${secrets.clientId}:${secrets.clientSecret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: secrets.refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
  }
  const { access_token } = await res.json();
  return access_token as string;
}

export async function getNowPlaying(
  admin: SupabaseClient,
  runnerId: string,
): Promise<NowPlaying> {
  const secrets = await loadSecrets(admin, runnerId);
  const accessToken = await mintAccessToken(secrets);

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 => nothing playing.
  if (res.status === 204 || res.status === 202) {
    return { isPlaying: false };
  }
  if (!res.ok) {
    throw new Error(`Spotify currently-playing failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  if (!data || !data.item) {
    return { isPlaying: false };
  }

  const item = data.item;
  const albumArt: string | null = item.album?.images?.[0]?.url ?? null;
  const artist: string = (item.artists ?? []).map((a: { name: string }) => a.name).join(', ');

  return {
    isPlaying: Boolean(data.is_playing),
    track: item.name ?? 'Unknown track',
    artist: artist || 'Unknown artist',
    albumArt,
    progressMs: data.progress_ms ?? 0,
    durationMs: item.duration_ms ?? 0,
  };
}
