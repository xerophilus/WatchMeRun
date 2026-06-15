// GET /now-playing
// Polled by the Live screen every 30s. No bearer (read-only).
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, runnerId } from '../_shared/env.ts';
import { getNowPlaying } from '../_shared/spotify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const admin = adminClient();
    const np = await getNowPlaying(admin, runnerId());
    return json(np);
  } catch (err) {
    console.error('now-playing error', err);
    // Fail soft: the Live screen treats this as "nothing playing".
    return json({ isPlaying: false, error: String(err) }, 200);
  }
});
