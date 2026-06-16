import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

// Service-role client. The only writer for run events and the only reader of
// app_secrets / runner_tokens. Never expose this key to the device.
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class UnauthorizedError extends Error {}

/**
 * Resolves which runner is writing from the bearer token. The token *is* the
 * identity: each runner has their own row in `runner_tokens`, so there is no
 * global shared secret and no single source of truth. v2 multi-runner is just
 * more rows — no code change.
 */
export async function resolveRunnerFromToken(
  admin: SupabaseClient,
  req: Request,
): Promise<string> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new UnauthorizedError('Missing bearer token');

  const { data, error } = await admin
    .from('runner_tokens')
    .select('runner_id, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at) {
    throw new UnauthorizedError('Invalid or revoked token');
  }
  return data.runner_id as string;
}

/** The raw bearer credential, or '' if absent. */
function bearer(req: Request): string {
  return (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

/**
 * Resolve the acting runner from EITHER a runner_tokens value (the iOS Shortcut)
 * OR a Supabase Auth user JWT (the app, signed in with Apple). This is what lets
 * both clients hit the same write endpoints. Returns the runners.id.
 */
export async function resolveRunner(admin: SupabaseClient, req: Request): Promise<string> {
  const token = bearer(req);
  if (!token) throw new UnauthorizedError('Missing bearer token');

  // 1. Shortcut path: a long-lived per-runner token.
  const { data: rt } = await admin
    .from('runner_tokens')
    .select('runner_id, revoked_at')
    .eq('token', token)
    .maybeSingle();
  if (rt && !rt.revoked_at) return rt.runner_id as string;

  // 2. App path: a Supabase user JWT -> the runner linked to that auth user.
  const userId = await getAuthedUserId(req);
  if (userId) {
    const { data: r } = await admin
      .from('runners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (r) return r.id as string;
  }
  throw new UnauthorizedError('Invalid or revoked token');
}

/** Verify a Supabase Auth JWT from the request and return the auth user id. */
export async function getAuthedUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY');
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}
