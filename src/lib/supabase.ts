import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';
import type { Database } from '@/lib/database.types';

// v2: real auth. Each user signs in (Sign in with Apple) and the session is
// persisted on-device so they stay signed in across launches. All reads/writes
// run as the authenticated user; RLS gates what they can see (self + people
// they have an approved follow on). Writes that need service role (now-playing
// snapshot, push fan-out) still go through Edge Functions.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // No window/localStorage on native; AsyncStorage backs the session there.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
