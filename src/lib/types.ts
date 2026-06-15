import type { Tables } from '@/lib/database.types';

// Domain types derived from the generated schema so they can't drift from the
// database. We narrow a couple of string/json columns to the shapes the app
// actually relies on.

export type WorkoutType = 'open' | 'distance_time' | 'custom' | 'rest';

export type ScheduleDay = Tables<'weekly_schedule'>;
export type Race = Tables<'races'>;
export type LivePosition = Tables<'live_positions'>;

export type NowPlaying =
  | { isPlaying: false }
  | {
      isPlaying: true;
      track: string;
      artist: string;
      albumArt: string | null;
      progressMs: number;
      durationMs: number;
    };

export type RunEvent = Omit<Tables<'run_events'>, 'event_type' | 'track_snapshot'> & {
  event_type: 'start' | 'stop';
  track_snapshot: NowPlaying | null;
};
