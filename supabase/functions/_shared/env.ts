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
