// App config. Only public, non-secret values live on the device.
// Set these in a .env file (see .env.example). Expo inlines EXPO_PUBLIC_* vars
// at build time.

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Ben's seeded runners.id. v1 has one runner so this is effectively a constant;
// keeping the filter in every query is what makes v2 a config change.
export const RUNNER_ID = process.env.EXPO_PUBLIC_RUNNER_ID ?? '';

// Edge Functions base URL. Derived from the Supabase URL by default.
export const FUNCTIONS_URL =
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? `${SUPABASE_URL}/functions/v1`;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && RUNNER_ID);

// Runner-only. This is the SAME value the iOS Shortcut carries (a row in
// runner_tokens). It belongs ONLY on the runner's own device — never on a
// watcher's build. When set, the app can fire start/stop run events itself.
// When empty (the default, e.g. Kenz's build) the app stays read-only.
export const RUNNER_TOKEN = process.env.EXPO_PUBLIC_RUNNER_TOKEN ?? '';

// Which run app the in-app "Start My Run" button opens after firing the beacon.
// One of: 'apple_workout' | 'strava' | 'nike_run_club' | 'none'.
export const PREFERRED_RUN_APP = process.env.EXPO_PUBLIC_PREFERRED_RUN_APP ?? 'apple_workout';

// True only on a build that holds a write token — i.e. the runner's device.
export const isRunner = Boolean(RUNNER_TOKEN);
