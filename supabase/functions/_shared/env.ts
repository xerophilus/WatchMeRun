import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

// Service-role client. The only writer for run events and the only reader of
// app_secrets. Never expose this key to the device.
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

// Ben's seeded runners.id. Every function scopes its reads/writes to it.
// In v2 this comes from the request instead of env.
export function runnerId(): string {
  const id = Deno.env.get('RUNNER_ID');
  if (!id) throw new Error('Missing RUNNER_ID env var');
  return id;
}

// Shared bearer token guarding the write endpoints Ben curls.
export function assertBearer(req: Request): void {
  const expected = Deno.env.get('RUNWATCH_TOKEN');
  if (!expected) throw new Error('Missing RUNWATCH_TOKEN env var');
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (token !== expected) {
    throw new UnauthorizedError('Invalid or missing bearer token');
  }
}

export class UnauthorizedError extends Error {}
