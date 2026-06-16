// App config. Only public, non-secret values live on the device.
// Set these in EAS environment variables (or a local .env for dev). Expo inlines
// EXPO_PUBLIC_* vars at build time.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Edge Functions base URL. Derived from the Supabase URL by default.
export const FUNCTIONS_URL =
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`;

// v2: identity comes from the signed-in user (Sign in with Apple), not a
// build-time runner id/token. The app just needs Supabase to be reachable.
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Which run app the in-app "Start My Run" button opens after firing the beacon.
// One of: 'apple_workout' | 'apple_shortcut' | 'strava' | 'nike_run_club' | 'none'.
export const PREFERRED_RUN_APP = process.env.EXPO_PUBLIC_PREFERRED_RUN_APP ?? 'apple_workout';

// Name of the runner's watchOS Shortcut that starts an Apple workout. When set,
// the "Apple Watch (Shortcut)" option appears and is launched with the picked
// workout as JSON input, so the selection carries into Apple's Workout app.
export const RUN_SHORTCUT_NAME = process.env.EXPO_PUBLIC_RUN_SHORTCUT_NAME ?? '';
