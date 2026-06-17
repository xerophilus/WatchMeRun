// POST /redeem-invite  (Bearer <supabase user JWT>)
// Redeem a code someone shared. Creates an APPROVED follow where the caller
// watches the invite's owner (sharing the code is the owner's consent), so the
// caller doesn't need to read others' invite rows under RLS.
//
// Body: { "code": "rosy-otter-42" }
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getAuthedUserId } from '../_shared/env.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const userId = await getAuthedUserId(req);
    if (!userId) return json({ error: 'Not authenticated' }, 401);

    const admin = adminClient();
    const { data: me } = await admin
      .from('runners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!me) return json({ error: 'Set up your profile first.' }, 400);

    const { code } = (await req.json().catch(() => ({}))) as { code?: string };
    const cleanCode = (code ?? '').trim();
    if (!cleanCode) return json({ error: 'An invite code is required.' }, 400);

    const { data: invite } = await admin
      .from('invites')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();
    if (!invite) return json({ error: 'That invite code is invalid.' }, 404);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return json({ error: 'That invite has expired.' }, 410);
    }
    if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
      return json({ error: 'That invite has already been used up.' }, 410);
    }
    if (invite.runner_id === me.id) {
      return json({ error: "That's your own invite." }, 400);
    }

    // Approved follow: caller watches the invite owner. Idempotent on re-redeem.
    const { error: fErr } = await admin.from('follows').upsert(
      {
        watcher_id: me.id,
        runner_id: invite.runner_id,
        status: 'approved',
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'watcher_id, runner_id' },
    );
    if (fErr) throw fErr;

    await admin.from('invites').update({ uses: invite.uses + 1 }).eq('id', invite.id);
    return json({ ok: true, runner_id: invite.runner_id });
  } catch (err) {
    console.error('redeem-invite error', err);
    return json({ error: String(err) }, 500);
  }
});
