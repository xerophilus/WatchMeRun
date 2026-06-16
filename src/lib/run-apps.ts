import * as Linking from 'expo-linking';

// The run apps the "Start My Run" button can hand off to after firing the
// beacon. IMPORTANT: no third-party app exposes a "start my run" API — the most
// we can do from outside is *open* the app (often to its record screen) so the
// runner taps go themselves. Apple's own Workout app has no iPhone URL scheme at
// all; it's started on the watch (e.g. a watchOS Shortcut), so here it's
// beacon-only.

export type RunApp = 'apple_workout' | 'strava' | 'nike_run_club' | 'none';

type RunAppMeta = {
  label: string;
  glyph: string;
  // Deep link that opens the app. null = nothing to open (beacon only).
  url: string | null;
};

export const RUN_APPS: Record<RunApp, RunAppMeta> = {
  apple_workout: { label: 'Apple Watch', glyph: '⌚️', url: null },
  strava: { label: 'Strava', glyph: '🟧', url: 'strava://record' },
  nike_run_club: { label: 'Nike Run Club', glyph: '🏃', url: 'nikerunclub://' },
  none: { label: 'Just the beacon', glyph: '📡', url: null },
};

export const RUN_APP_ORDER: RunApp[] = ['apple_workout', 'strava', 'nike_run_club', 'none'];

export function isRunApp(value: string): value is RunApp {
  return value in RUN_APPS;
}

/**
 * Best-effort hand-off to the chosen run app. Returns true if we actually
 * opened something. Never throws — the beacon has already fired by the time we
 * get here, so a missing app must not surface as a failure.
 */
export async function openRunApp(app: RunApp): Promise<boolean> {
  const url = RUN_APPS[app]?.url;
  if (!url) return false;
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // App not installed / scheme not allowed — fall through.
  }
  return false;
}
