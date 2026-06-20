import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { LiveDot } from '@/components/live-dot';
import { ThemedText } from '@/components/themed-text';
import { TrackingMap } from '@/components/tracking-map';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSecondsTick, type LiveStatus } from '@/hooks/use-live-status';
import { clockTime, elapsedSince } from '@/lib/date';
import { pathDistanceMeters } from '@/lib/geo';
import { parseRunGoal } from '@/lib/run-apps';
import type { RunEvent } from '@/lib/types';

/**
 * One runner's live card: a summary row (live dot + name + status) that's always
 * shown, plus the full detail (run progress, live map, now-playing) when
 * expanded. Used for both your own run (always expanded) and each watched runner
 * in the feed (tap to expand).
 */
export function LiveCard({
  title,
  status,
  expanded,
  onToggle,
}: {
  title: string;
  status: LiveStatus;
  expanded: boolean;
  /** Omit to make the card non-collapsible (no chevron). */
  onToggle?: () => void;
}) {
  const theme = useTheme();
  const { runEvent } = status;
  const isRunning = runEvent?.event_type === 'start';
  useSecondsTick(isRunning);

  const elapsedSec =
    isRunning && runEvent?.created_at
      ? Math.max(0, Math.floor((Date.now() - new Date(runEvent.created_at).getTime()) / 1000))
      : 0;

  const statusLine = isRunning
    ? `Running${runEvent?.created_at ? ` · ${elapsedSince(runEvent.created_at)}` : ''}`
    : runEvent?.created_at
      ? `Resting · last run ${clockTime(runEvent.created_at)}`
      : 'No runs logged yet';

  return (
    <Card highlighted={isRunning}>
      <Pressable disabled={!onToggle} onPress={onToggle} style={styles.summary}>
        <LiveDot color={isRunning ? theme.accent : theme.textSecondary} />
        <View style={styles.summaryBody}>
          <ThemedText type="default" style={styles.summaryTitle} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {statusLine}
          </ThemedText>
        </View>
        {onToggle ? (
          <SymbolView
            name={expanded ? 'chevron.up' : 'chevron.down'}
            size={14}
            tintColor={theme.textSecondary}
            weight="semibold"
            fallback={<ThemedText themeColor="textSecondary">{expanded ? '▲' : '▼'}</ThemedText>}
          />
        ) : null}
      </Pressable>
      {expanded ? <LiveDetailBody status={status} isRunning={isRunning} elapsedSec={elapsedSec} /> : null}
    </Card>
  );
}

function LiveDetailBody({
  status,
  isRunning,
  elapsedSec,
}: {
  status: LiveStatus;
  isRunning: boolean;
  elapsedSec: number;
}) {
  const theme = useTheme();
  const { runEvent, nowPlaying, path, progressMs } = status;

  const latlngs = useMemo(() => path.map((p) => ({ lat: p.lat, lng: p.lng })), [path]);
  const distanceMeters = useMemo(
    () => (latlngs.length > 1 ? pathDistanceMeters(latlngs) : null),
    [latlngs],
  );
  const position = path.length ? path[path.length - 1] : null;
  const current = position ? { lat: position.lat, lng: position.lng } : null;
  const startTrack =
    isRunning && runEvent?.track_snapshot?.isPlaying ? runEvent.track_snapshot : null;

  return (
    <View style={styles.detail}>
      {isRunning && runEvent?.workout_label ? (
        <ThemedText type="small" style={styles.workoutLabel}>
          {runEvent.workout_label}
        </ThemedText>
      ) : null}
      {isRunning && runEvent ? (
        <RunProgress runEvent={runEvent} elapsedSec={elapsedSec} distanceMeters={distanceMeters} />
      ) : null}
      {startTrack ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.startTrack}>
          🎧 Headed out to {startTrack.track} — {startTrack.artist}
        </ThemedText>
      ) : null}

      {isRunning ? (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            LIVE LOCATION
          </ThemedText>
          {position ? (
            <View style={styles.mapWrap}>
              <TrackingMap
                elapsedSec={elapsedSec}
                distanceMeters={distanceMeters}
                path={latlngs}
                current={current}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.mapCaption}>
                Updated {clockTime(position.recorded_at)} · {position.lat.toFixed(4)},{' '}
                {position.lng.toFixed(4)}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Not sharing location for this run.
            </ThemedText>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
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
      </View>
    </View>
  );
}

// ~9:30/mi easy pace — matches the tracking-map estimate. Used to turn a
// distance goal into a target time until real GPS distance is available.
const SEC_PER_MI = 570;
const KM_TO_MI = 0.621371;
const METERS_PER_MI = 1609.344;

function fmtClock(sec: number): string {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

function msToClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Progress toward the planned workout. Exact for a time goal, and exact for a
 * distance goal once GPS supplies `distanceMeters`; until then a distance goal
 * is estimated from an easy pace. Nothing to show for an open/unplanned run.
 */
function RunProgress({
  runEvent,
  elapsedSec,
  distanceMeters = null,
}: {
  runEvent: RunEvent;
  elapsedSec: number;
  distanceMeters?: number | null;
}) {
  const theme = useTheme();
  const goal = parseRunGoal(runEvent.workout_type ?? undefined, runEvent.workout_label);

  let pct: number | null = null;
  let left = '';
  let right = '';
  let estimated = false;

  if (goal.kind === 'time') {
    const targetSec = goal.minutes * 60;
    pct = (elapsedSec / targetSec) * 100;
    left = fmtClock(elapsedSec);
    right = `${fmtClock(targetSec)} goal`;
  } else if (goal.kind === 'distance') {
    const goalMi = goal.unit === 'km' ? goal.value * KM_TO_MI : goal.value;
    if (distanceMeters != null) {
      const doneMi = distanceMeters / METERS_PER_MI;
      pct = (doneMi / goalMi) * 100;
      left = `${doneMi.toFixed(2)} mi`;
      right = `${+goalMi.toFixed(1)} mi goal`;
    } else {
      const targetSec = goalMi * SEC_PER_MI;
      pct = (elapsedSec / targetSec) * 100;
      left = fmtClock(elapsedSec);
      right = `~${fmtClock(targetSec)} goal`;
      estimated = true;
    }
  }
  if (pct == null) return null;

  return (
    <View style={styles.runProgress}>
      <View style={[styles.runTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View
          style={[styles.runFill, { width: `${Math.min(100, pct)}%`, backgroundColor: theme.accent }]}
        />
      </View>
      <View style={styles.timeRow}>
        <ThemedText type="smallBold">{left}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {right}
        </ThemedText>
      </View>
      {estimated ? (
        <ThemedText type="small" themeColor="textSecondary">
          Estimated from the plan · real pace &amp; distance land with GPS.
        </ThemedText>
      ) : null}
    </View>
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
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  summaryBody: { flex: 1, gap: Spacing.half },
  summaryTitle: { fontWeight: '700', fontSize: 18 },
  detail: { marginTop: Spacing.three, gap: Spacing.two },
  section: { marginTop: Spacing.two },
  sectionLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
  workoutLabel: { fontWeight: '600' },
  startTrack: {},
  mapWrap: { gap: Spacing.two },
  mapCaption: { textAlign: 'center' },
  runProgress: { gap: Spacing.one },
  runTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  runFill: { height: 8, borderRadius: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  npRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  albumArt: { width: 72, height: 72, borderRadius: Spacing.two },
  npBody: { flex: 1, gap: Spacing.half },
  track: { fontWeight: '700' },
  progressWrap: { marginTop: Spacing.two, gap: Spacing.half },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
});
