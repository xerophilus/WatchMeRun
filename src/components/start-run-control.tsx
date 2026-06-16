import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLatestWeek, sendRunEvent } from '@/lib/api';
import { PREFERRED_RUN_APP } from '@/lib/config';
import { isToday } from '@/lib/date';
import { isRunApp, openRunApp, RUN_APPS, RUN_APP_ORDER, type RunApp } from '@/lib/run-apps';
import type { RunEvent, ScheduleDay } from '@/lib/types';

const DEFAULT_APP: RunApp = isRunApp(PREFERRED_RUN_APP) ? PREFERRED_RUN_APP : 'apple_workout';

// Sentinel for the "no schedule label" choice (start an unplanned run).
const NO_LABEL = '__none__';

/**
 * Runner-only control: one button to fire the start/stop beacon, plus quick
 * pickers for which scheduled workout to tag the run with and which run app to
 * open on start. Mirrors the iOS Shortcut, but lives in the app so the runner
 * can kick off a tracked run (now-playing snapshot + watcher push) without
 * leaving WatchMeRun. Only rendered when the build holds a runner token — see
 * `isRunner`.
 */
export function StartRunControl({
  runEvent,
  onChanged,
}: {
  runEvent: RunEvent | null;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const [selectedApp, setSelectedApp] = useState<RunApp>(DEFAULT_APP);
  const [days, setDays] = useState<ScheduleDay[]>([]);
  // run_events row id of the picked workout, or NO_LABEL for an unplanned run.
  const [selectedDayId, setSelectedDayId] = useState<string>(NO_LABEL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = runEvent?.event_type === 'start';

  // Pull this week so the runner can tag the run with a planned workout, and
  // default to today's if there is one.
  useEffect(() => {
    let active = true;
    fetchLatestWeek()
      .then((week) => {
        if (!active) return;
        const runnable = week.filter((d) => d.workout_type !== 'rest');
        setDays(runnable);
        const today = runnable.find((d) => isToday(d.day_date));
        if (today) setSelectedDayId(today.id);
      })
      .catch(() => {
        /* schedule is a nicety here; a failed load just means no labels. */
      });
    return () => {
      active = false;
    };
  }, []);

  async function onPress() {
    setBusy(true);
    setError(null);
    try {
      if (isRunning) {
        await sendRunEvent('stop');
      } else {
        const day = days.find((d) => d.id === selectedDayId);
        await sendRunEvent('start', {
          workoutType: day?.workout_type ?? undefined,
          workoutLabel: day?.title ?? undefined,
        });
        // Hand off to the chosen app (best-effort; beacon already fired).
        await openRunApp(selectedApp);
      }
      onChanged();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        {isRunning ? 'YOUR RUN' : 'START A RUN'}
      </ThemedText>

      {!isRunning ? (
        <>
          {days.length > 0 ? (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabel}>
                Workout
              </ThemedText>
              <View style={styles.chips}>
                <WorkoutChip
                  label="No label"
                  active={selectedDayId === NO_LABEL}
                  disabled={busy}
                  onPress={() => setSelectedDayId(NO_LABEL)}
                />
                {days.map((d) => (
                  <WorkoutChip
                    key={d.id}
                    label={`${isToday(d.day_date) ? 'Today · ' : ''}${d.title}`}
                    active={selectedDayId === d.id}
                    disabled={busy}
                    onPress={() => setSelectedDayId(d.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabel}>
            Open
          </ThemedText>
          <View style={styles.chips}>
            {RUN_APP_ORDER.map((app) => (
              <WorkoutChip
                key={app}
                label={`${RUN_APPS[app].glyph} ${RUN_APPS[app].label}`}
                active={app === selectedApp}
                disabled={busy}
                onPress={() => setSelectedApp(app)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Pressable
        onPress={onPress}
        disabled={busy}
        style={[
          styles.button,
          { backgroundColor: isRunning ? theme.textSecondary : theme.accent },
          busy ? styles.buttonBusy : undefined,
        ]}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="default" style={styles.buttonText}>
            {isRunning ? 'Stop run' : 'Start my run 🏃'}
          </ThemedText>
        )}
      </Pressable>

      {!isRunning && RUN_APPS[selectedApp].url == null && selectedApp !== 'none' ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Start the workout on your {RUN_APPS[selectedApp].label} — this just fires
          the beacon and snapshots your music.
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText type="small" style={[styles.hint, { color: theme.accent }]}>
          {error}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function WorkoutChip({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.tint : theme.backgroundSelected },
      ]}>
      <ThemedText type="small" style={[styles.chipText, active ? styles.chipTextActive : undefined]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
  pickerLabel: { marginBottom: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.three },
  chip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  chipText: { fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  hint: { marginTop: Spacing.two },
});
