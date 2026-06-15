// GET /now-playing?runner_id=<uuid>
// Polled by the Live screen every 30s. No bearer (read-only). The runner is
// named in the request so the endpoint is multi-runner ready.
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/env.ts';
import { getNowPlaying } from '../_shared/spotify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const runnerId = new URL(req.url).searchParams.get('runner_id');
  if (!runnerId) return json({ isPlaying: false, error: 'runner_id is required' }, 400);

  try {
    const admin = adminClient();
    const np = await getNowPlaying(admin, runnerId);
    return json(np);
  } catch (err) {
    console.error('now-playing error', err);
    // Fail soft: the Live screen treats this as "nothing playing".
    return json({ isPlaying: false, error: String(err) }, 200);
  }
});
