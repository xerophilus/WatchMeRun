import * as Linking from 'expo-linking';

import { RUN_SHORTCUT_NAME } from '@/lib/config';

// The run apps the "Start My Run" button can hand off to after firing the
// beacon. IMPORTANT: no third-party app exposes a "start my run" API, and most
// won't accept the picked workout either — the most we can do is *open* them
// (often to a record screen). The one real exception is Apple's Workout app via
// a watchOS Shortcut: we can launch a named Shortcut with the workout as input,
// so the selection actually carries over (type + goal). Strava/Nike are
// open-only; plain Apple Workout (no Shortcut) is beacon-only.

export type RunApp = 'apple_workout' | 'apple_shortcut' | 'strava' | 'nike_run_club' | 'none';

type RunAppMeta = {
  label: string;
  glyph: string;
  // Static deep link that opens the app. null = nothing static to open (either
  // beacon-only, or built dynamically like the Shortcut bridge).
  url: string | null;
};

export const RUN_APPS: Record<RunApp, RunAppMeta> = {
  apple_workout: { label: 'Apple Watch', glyph: '⌚️', url: null },
  apple_shortcut: { label: 'Apple Watch (Shortcut)', glyph: '⌚️', url: null },
  strava: { label: 'Strava', glyph: '🟧', url: 'strava://record' },
  nike_run_club: { label: 'Nike Run Club', glyph: '🏃', url: 'nikerunclub://' },
  none: { label: 'Just the beacon', glyph: '📡', url: null },
};

export function isRunApp(value: string): value is RunApp {
  return value in RUN_APPS;
}

/** Selectable apps, in order. The Shortcut bridge only appears once configured. */
export function runAppOrder(): RunApp[] {
  const order: RunApp[] = ['apple_workout', 'strava', 'nike_run_club', 'none'];
  if (RUN_SHORTCUT_NAME) order.splice(1, 0, 'apple_shortcut');
  return order;
}

export type RunPayload = {
  workoutType?: string;
  workoutLabel?: string;
  detail?: string;
};

// A structured goal the Shortcut can feed straight into "Start Workout" without
// parsing strings on the watch.
export type RunGoal =
  | { kind: 'distance'; value: number; unit: 'mi' | 'km' }
  | { kind: 'time'; minutes: number }
  | { kind: 'open' };

/**
 * Best-effort goal extraction from the free-text schedule (title + detail),
 * e.g. "Easy 6mi" → 6 mi, "Tempo 45min" → 45 min, "10k" → 10 km. Returns an
 * open goal when nothing parseable is found, or for open/rest workouts.
 */
export function parseRunGoal(
  workoutType: string | undefined,
  ...texts: (string | null | undefined)[]
): RunGoal {
  if (workoutType === 'open' || workoutType === 'rest') return { kind: 'open' };
  const hay = texts.filter(Boolean).join(' ').toLowerCase();

  // Distance: 6mi, 6 mi, 13.1 miles, 5km, 10k.
  const dist = hay.match(/(\d+(?:\.\d+)?)\s*(miles|mile|mi|km|k)\b/);
  if (dist) {
    return {
      kind: 'distance',
      value: parseFloat(dist[1]),
      unit: dist[2].startsWith('k') ? 'km' : 'mi',
    };
  }

  // Time: 45min, 90 minutes, 1hr, 1.5h.
  const time = hay.match(/(\d+(?:\.\d+)?)\s*(hours|hour|hr|h|minutes|minute|mins|min)\b/);
  if (time) {
    const value = parseFloat(time[1]);
    const isHours = time[2].startsWith('h');
    return { kind: 'time', minutes: Math.round(isHours ? value * 60 : value) };
  }

  return { kind: 'open' };
}

async function tryOpen(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort hand-off to the chosen run app. Returns true if we actually
 * opened something. Never throws — the beacon has already fired by the time we
 * get here, so a missing app must not surface as a failure.
 *
 * For 'apple_shortcut' we launch the runner's named Shortcut with the picked
 * workout as JSON input (`shortcuts://run-shortcut?name=...&input=...`); the
 * Shortcut's "Start Workout" action turns that into a real Apple workout.
 */
export async function openRunApp(app: RunApp, payload: RunPayload = {}): Promise<boolean> {
  if (app === 'apple_shortcut') {
    if (!RUN_SHORTCUT_NAME) return false;
    const input = JSON.stringify({
      type: payload.workoutType ?? null,
      label: payload.workoutLabel ?? null,
      detail: payload.detail ?? null,
      goal: parseRunGoal(payload.workoutType, payload.workoutLabel, payload.detail),
    });
    const url =
      `shortcuts://run-shortcut?name=${encodeURIComponent(RUN_SHORTCUT_NAME)}` +
      `&input=${encodeURIComponent(input)}`;
    return tryOpen(url);
  }

  const url = RUN_APPS[app]?.url;
  if (!url) return false;
  try {
    if (await Linking.canOpenURL(url)) return tryOpen(url);
  } catch {
    // scheme not allowed / not installed — fall through.
  }
  return false;
}
