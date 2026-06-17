// GET /now-playing?runner_id=<uuid>  (Bearer <supabase user JWT>)
// Polled by the Live screen every 30s. Gated like the rest of v2: only the
// runner themselves or an approved watcher may see what's playing. A missing or
// unauthorized viewer fails soft to "nothing playing" (never leaks the track).
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getAuthedUserId } from '../_shared/env.ts';
import { getNowPlaying } from '../_shared/spotify.ts';

async function viewerMaySee(admin: ReturnType<typeof adminClient>, req: Request, runnerId: string) {
  const userId = await getAuthedUserId(req);
  if (!userId) return false;
  const { data: viewer } = await admin
    .from('runners')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!viewer) return false;
  if (viewer.id === runnerId) return true;
  const { data: follow } = await admin
    .from('follows')
    .select('id')
    .eq('watcher_id', viewer.id)
    .eq('runner_id', runnerId)
    .eq('status', 'approved')
    .maybeSingle();
  return Boolean(follow);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const runnerId = new URL(req.url).searchParams.get('runner_id');
  if (!runnerId) return json({ isPlaying: false, error: 'runner_id is required' }, 400);

  try {
    const admin = adminClient();
    if (!(await viewerMaySee(admin, req, runnerId))) {
      return json({ isPlaying: false }, 200);
    }
    const np = await getNowPlaying(admin, runnerId);
    return json(np);
  } catch (err) {
    console.error('now-playing error', err);
    // Fail soft: the Live screen treats this as "nothing playing".
    return json({ isPlaying: false, error: String(err) }, 200);
  }
});
