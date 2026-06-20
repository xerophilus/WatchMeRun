import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchLatestRunEvent, fetchNowPlaying, fetchRunPath } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { LivePosition, NowPlaying, RunEvent } from '@/lib/types';

const POLL_MS = 30_000;

export type LiveStatus = {
  runEvent: RunEvent | null;
  nowPlaying: NowPlaying | null;
  path: LivePosition[];
  progressMs: number;
  reload: () => void;
};

/**
 * Live telemetry for one runner: latest run event, now-playing, and the GPS
 * trail of an in-progress run. Polls (covers Spotify, which isn't realtime) and
 * subscribes to run/position changes for instant start/stop + GPS updates while
 * `active` (i.e. the Live screen is focused and this runner is on screen).
 */
export function useLiveStatus(runnerId: string | null, active: boolean): LiveStatus {
  const [runEvent, setRunEvent] = useState<RunEvent | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [path, setPath] = useState<LivePosition[]>([]);
  const [progressMs, setProgressMs] = useState(0);
  const lastSync = useRef<number>(Date.now());

  const load = useCallback(async () => {
    if (!runnerId) return;
    const [event, np] = await Promise.all([
      fetchLatestRunEvent(runnerId).catch(() => null),
      fetchNowPlaying(runnerId).catch(() => ({ isPlaying: false }) as NowPlaying),
    ]);
    setRunEvent(event);
    setNowPlaying(np);
    if (np.isPlaying) {
      setProgressMs(np.progressMs);
      lastSync.current = Date.now();
    }
    // Only an in-progress run has a live trail worth showing.
    const runId = event?.event_type === 'start' ? event.run_id : null;
    setPath(await fetchRunPath(runnerId, runId).catch(() => []));
  }, [runnerId]);

  useEffect(() => {
    if (!runnerId || !active) return;
    load();
    const interval = setInterval(load, POLL_MS);
    const channel = supabase
      .channel(`live-${runnerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'run_events', filter: `runner_id=eq.${runnerId}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_positions', filter: `runner_id=eq.${runnerId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [runnerId, active, load]);

  // Advance the playback position locally between polls for a smooth bar.
  useEffect(() => {
    if (!nowPlaying?.isPlaying) return;
    const id = setInterval(() => {
      const synced = nowPlaying.progressMs + (Date.now() - lastSync.current);
      setProgressMs(Math.min(synced, nowPlaying.durationMs));
    }, 1000);
    return () => clearInterval(id);
  }, [nowPlaying]);

  return { runEvent, nowPlaying, path, progressMs, reload: load };
}

/** Re-render every second while `enabled`, so elapsed-time displays advance. */
export function useSecondsTick(enabled: boolean): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
}
