import type { SymbolViewProps } from 'expo-symbols';

import { parseRunGoal } from '@/lib/run-apps';

// The schedule redesign models a day as an ordered list of *sessions*, each
// tagged with one of five types. The type drives the icon, the suggested title,
// and whether a distance is collected (Rest has none). These values are stored
// straight into weekly_schedule.workout_type.

export type SessionType = 'easy' | 'workout' | 'long' | 'recovery' | 'rest';

/** Order shown in the Add-workout sheet's type picker. */
export const SESSION_TYPES: SessionType[] = ['easy', 'workout', 'long', 'recovery', 'rest'];

type SessionTypeMeta = {
  /** Picker label, e.g. "Long run". */
  label: string;
  /** SF Symbol (iOS); emoji is the cross-platform fallback. */
  symbol: SymbolViewProps['name'];
  emoji: string;
  /** Title stem used when the runner leaves the title blank. */
  titleStem: string;
};

export const SESSION_TYPE_META: Record<SessionType, SessionTypeMeta> = {
  easy: { label: 'Easy run', symbol: 'figure.run', emoji: '🏃', titleStem: 'Easy' },
  workout: { label: 'Workout', symbol: 'bolt.fill', emoji: '⚡️', titleStem: 'Workout' },
  long: { label: 'Long run', symbol: 'mountain.2.fill', emoji: '⛰️', titleStem: 'Long run' },
  recovery: { label: 'Recovery', symbol: 'leaf.fill', emoji: '🌿', titleStem: 'Recovery' },
  rest: { label: 'Rest', symbol: 'moon.zzz.fill', emoji: '😴', titleStem: 'Rest' },
};

export function isRestType(type: string | null | undefined): boolean {
  return type === 'rest';
}

/**
 * Map any stored workout_type — including v1's values (open / distance_time /
 * custom) — onto one of the five session types, so older weeks still render
 * with a sensible icon and label.
 */
export function toSessionType(type: string | null | undefined): SessionType {
  if (type && type in SESSION_TYPE_META) return type as SessionType;
  switch (type) {
    case 'rest':
      return 'rest';
    case 'custom':
      return 'workout';
    case 'open':
      return 'easy';
    default:
      return 'easy'; // distance_time + anything unrecognized
  }
}

/** "6" / "13.1" — drops the trailing zero on whole miles. */
export function formatMiles(miles: number): string {
  return Number.isInteger(miles) ? String(miles) : String(Math.round(miles * 10) / 10);
}

/**
 * A sensible title from the type (+ distance) for when the runner leaves the
 * field blank — "Easy 6mi", "Long run 18mi", "Workout", "Rest".
 */
export function defaultSessionTitle(type: SessionType, miles?: number | null): string {
  const { titleStem } = SESSION_TYPE_META[type];
  if (type === 'rest') return titleStem;
  return miles && miles > 0 ? `${titleStem} ${formatMiles(miles)}mi` : titleStem;
}

const KM_TO_MI = 0.621371;

/** Best-effort planned miles for a session from its type + text (km → mi). */
export function sessionMiles(session: {
  workout_type?: string | null;
  title: string;
  detail?: string | null;
}): number {
  const goal = parseRunGoal(session.workout_type ?? undefined, session.title, session.detail);
  if (goal.kind !== 'distance') return 0;
  return goal.unit === 'km' ? goal.value * KM_TO_MI : goal.value;
}
