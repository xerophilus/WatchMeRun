import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLatestPosition, fetchLatestRunEvent, fetchNowPlaying } from '@/lib/api';
import { RUNNER_ID, isConfigured } from '@/lib/config';
import { clockTime, elapsedSince } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { LivePosition, NowPlaying, RunEvent } from '@/lib/types';

const POLL_MS = 30_000;

function msToClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LiveScreen() {
  const theme = useTheme();
  const [runEvent, setRunEvent] = useState<RunEvent | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Locally-advanced playback position for a smooth progress bar between polls.
  const [progressMs, setProgressMs] = useState(0);
  const lastSync = useRef<number>(Date.now());

  const load = useCallback(async () => {
    const [event, np] = await Promise.all([
      fetchLatestRunEvent().catch(() => null),
      fetchNowPlaying().catch(() => ({ isPlaying: false }) as NowPlaying),
    ]);
    setRunEvent(event);
    setNowPlaying(np);
    if (np.isPlaying) {
      setProgressMs(np.progressMs);
      lastSync.current = Date.now();
    }
    // Only an in-progress run has a live position worth showing.
    const runId = event?.event_type === 'start' ? event.run_id : null;
    setPosition(await fetchLatestPosition(runId).catch(() => null));
  }, []);

  // Poll (covers Spotify, which can't be realtime) + subscribe to run/position
  // changes for instant start/stop and GPS updates, while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (!isConfigured) return;
      load();
      const interval = setInterval(load, POLL_MS);

      const channel = supabase
        .channel('live-screen')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'run_events', filter: `runner_id=eq.${RUNNER_ID}` },
          () => load(),
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_positions', filter: `runner_id=eq.${RUNNER_ID}` },
          () => load(),
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }, [load]),
  );

  // Tick the progress bar locally each second between polls.
  useEffect(() => {
    if (!nowPlaying?.isPlaying) return;
    const id = setInterval(() => {
      const synced = nowPlaying.progressMs + (Date.now() - lastSync.current);
      setProgressMs(Math.min(synced, nowPlaying.durationMs));
    }, 1000);
    return () => clearInterval(id);
  }, [nowPlaying]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const isRunning = runEvent?.event_type === 'start';
  const startTrack = isRunning && runEvent?.track_snapshot?.isPlaying ? runEvent.track_snapshot : null;

  return (
    <Screen
      title="Live"
      subtitle="What Ben's up to right now"
      refreshing={refreshing}
      onRefresh={isConfigured ? onRefresh : undefined}>
      {!isConfigured ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Add your Supabase config to .env to see live status.
          </ThemedText>
        </Card>
      ) : (
        <>
          {/* Run status card */}
          <Card highlighted={isRunning}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isRunning ? '#22c55e' : theme.textSecondary },
                ]}
              />
              <ThemedText type="default" style={styles.statusText}>
                {isRunning ? 'Running' : 'Resting'}
              </ThemedText>
            </View>
            {runEvent ? (
              <ThemedText type="small" themeColor="textSecondary">
                {isRunning
                  ? `Since ${clockTime(runEvent.created_at!)} · ${elapsedSince(runEvent.created_at!)}`
                  : `Last run ended ${clockTime(runEvent.created_at!)}`}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No runs logged yet.
              </ThemedText>
            )}
            {isRunning && runEvent?.workout_label ? (
              <ThemedText type="small" style={styles.workoutLabel}>
                {runEvent.workout_label}
              </ThemedText>
            ) : null}
            {startTrack ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.startTrack}>
                🎧 Headed out to {startTrack.track} — {startTrack.artist}
              </ThemedText>
            ) : null}
          </Card>

          {/* Live location card (v2 groundwork) */}
          {isRunning ? (
            <Card>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                LIVE LOCATION
              </ThemedText>
              {position ? (
                // TODO(v2): drop a react-native-maps <MapView> here with a marker
                // at {position.lat, position.lng} and a breadcrumb trail.
                <View>
                  <ThemedText type="default">
                    {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Updated {clockTime(position.recorded_at)} · map coming in v2
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Not sharing location for this run.
                </ThemedText>
              )}
            </Card>
          ) : null}

          {/* Now-playing card */}
          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              NOW PLAYING
            </ThemedText>
            {nowPlaying?.isPlaying ? (
              <View style={styles.npRow}>
                {nowPlaying.albumArt ? (
                  <Image source={{ uri: nowPlaying.albumArt }} style={styles.albumArt} />
                ) : (
                  <View style={[styles.albumArt, { backgroundColor: theme.backgroundSelected }]} />
                )}
                <View style={styles.npBody}>
                  <ThemedText type="default" numberOfLines={1} style={styles.track}>
                    {nowPlaying.track}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {nowPlaying.artist}
                  </ThemedText>
                  <ProgressBar progressMs={progressMs} durationMs={nowPlaying.durationMs} />
                </View>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing playing.
              </ThemedText>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

function ProgressBar({ progressMs, durationMs }: { progressMs: number; durationMs: number }) {
  const theme = useTheme();
  const pct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.timeRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {msToClock(progressMs)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {msToClock(durationMs)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontWeight: '700', fontSize: 20 },
  workoutLabel: { marginTop: Spacing.two, fontWeight: '600' },
  startTrack: { marginTop: Spacing.one },
  sectionLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
  npRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  albumArt: { width: 72, height: 72, borderRadius: Spacing.two },
  npBody: { flex: 1, gap: Spacing.half },
  track: { fontWeight: '700' },
  progressWrap: { marginTop: Spacing.two, gap: Spacing.half },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#3c87f7', borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
