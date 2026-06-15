export type WorkoutType = 'open' | 'distance_time' | 'custom' | 'rest';

export type ScheduleDay = {
  id: string;
  runner_id: string;
  week_start: string;
  day_date: string;
  title: string;
  detail: string | null;
  workout_type: WorkoutType | null;
};

export type Race = {
  id: string;
  runner_id: string;
  name: string;
  race_date: string;
  distance: string | null;
  location: string | null;
  is_a_race: boolean;
  notes: string | null;
};

export type RunEvent = {
  id: string;
  runner_id: string;
  run_id: string | null;
  event_type: 'start' | 'stop';
  workout_type: string | null;
  workout_label: string | null;
  created_at: string;
};

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
