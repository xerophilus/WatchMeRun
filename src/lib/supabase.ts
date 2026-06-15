import { createClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';
import type { Database } from '@/lib/database.types';

// Read-mostly client for Kenz's device. No secrets here: anon key only, and
// the display tables are anon-readable by RLS. Writes go through Edge Functions.
//
// Typed with the generated Database schema so query results are type-checked.
// No session persistence — the app never signs anyone in.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
