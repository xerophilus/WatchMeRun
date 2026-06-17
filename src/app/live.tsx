import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { LiveDot } from '@/components/live-dot';
import { PersonSwitcher } from '@/components/person-switcher';
import { Screen } from '@/components/screen';
import { StartRunControl } from '@/components/start-run-control';
import { TrackingMap } from '@/components/tracking-map';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLatestPosition, fetchLatestRunEvent, fetchNowPlaying } from '@/lib/api';
import { clockTime, elapsedSince } from '@/lib/date';
import { useSession } from '@/lib/session';
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
  const { me, watching, viewedId } = useSession();
  const targetId = viewedId ?? me?.id ?? null;
  const isSelf = targetId === me?.id;
  const viewedRunner = isSelf ? me : watching.find((w) => w.id === targetId);

  const [runEvent, setRunEvent] = useState<RunEvent | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Locally-advanced playback position for a smooth progress bar between polls.
  const [progressMs, setProgressMs] = useState(0);
  const lastSync = useRef<number>(Date.now());

  const load = useCallback(async () => {
    if (!targetId) return;
    const [event, np] = await Promise.all([
      fetchLatestRunEvent(targetId).catch(() => null),
      fetchNowPlaying(targetId).catch(() => ({ isPlaying: false }) as NowPlaying),
    ]);
    setRunEvent(event);
    setNowPlaying(np);
    if (np.isPlaying) {
      setProgressMs(np.progressMs);
      lastSync.current = Date.now();
    }
    // Only an in-progress run has a live position worth showing.
    const runId = event?.event_type === 'start' ? event.run_id : null;
    setPosition(await fetchLatestPosition(targetId, runId).catch(() => null));
  }, [targetId]);

  // Poll (covers Spotify, which can't be realtime) + subscribe to run/position
  // changes for instant start/stop and GPS updates, while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (!targetId) return;
      load();
      const interval = setInterval(load, POLL_MS);

      const channel = supabase
        .channel(`live-${targetId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'run_events', filter: `runner_id=eq.${targetId}` },
          () => load(),
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_positions', filter: `runner_id=eq.${targetId}` },
          () => load(),
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }, [load, targetId]),
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
  const elapsedSec =
    isRunning && runEvent?.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(runEvent.created_at).getTime()) / 1000))
      : 0;
  const startTrack = isRunning && runEvent?.track_snapshot?.isPlaying ? runEvent.track_snapshot : null;
  const subtitle = isSelf
    ? "What you're up to right now"
    : `What ${viewedRunner?.name ?? 'they'} are up to right now`;

  return (
    <Screen title="Live" subtitle={subtitle} refreshing={refreshing} onRefresh={onRefresh}>
      <PersonSwitcher />

      {/* You can only start/stop your own run. */}
      {isSelf ? <StartRunControl runEvent={runEvent} onChanged={load} /> : null}

      {/* Run status card */}
      <Card highlighted={isRunning}>
        <View style={styles.statusRow}>
          <LiveDot color={isRunning ? theme.accent : theme.textSecondary} />
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
            // TODO(v2): swap the stylized streets for a react-native-maps
            // <MapView> anchored at {position.lat, position.lng} with a
            // breadcrumb trail; the LIVE badge + stats overlay stay.
            <View style={styles.mapWrap}>
              <TrackingMap elapsedSec={elapsedSec} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.mapCaption}>
                Updated {clockTime(position.recorded_at)} · {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
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
    </Screen>
  );
}

function ProgressBar({ progressMs, durationMs }: { progressMs: number; durationMs: number }) {
  const theme = useTheme();
  const pct = durationMs > 0 ? Math.min(100, (progressMs / durationMs) * 100) : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.tint }]} />
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  statusText: { fontWeight: '700', fontSize: 20 },
  mapWrap: { gap: Spacing.two },
  mapCaption: { textAlign: 'center' },
  workoutLabel: { marginTop: Spacing.two, fontWeight: '600' },
  startTrack: { marginTop: Spacing.one },
  sectionLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
  npRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  albumArt: { width: 72, height: 72, borderRadius: Spacing.two },
  npBody: { flex: 1, gap: Spacing.half },
  track: { fontWeight: '700' },
  progressWrap: { marginTop: Spacing.two, gap: Spacing.half },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
