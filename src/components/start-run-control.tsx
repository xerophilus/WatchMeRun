import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sendRunEvent } from '@/lib/api';
import { PREFERRED_RUN_APP } from '@/lib/config';
import { isRunApp, openRunApp, RUN_APPS, RUN_APP_ORDER, type RunApp } from '@/lib/run-apps';
import type { RunEvent } from '@/lib/types';

const DEFAULT_APP: RunApp = isRunApp(PREFERRED_RUN_APP) ? PREFERRED_RUN_APP : 'apple_workout';

/**
 * Runner-only control: one button to fire the start/stop beacon, plus a quick
 * picker for which run app to open on start. Mirrors the iOS Shortcut, but lives
 * in the app so the runner can kick off a tracked run (and the now-playing
 * snapshot + watcher push) without leaving WatchMeRun. Only rendered when the
 * build holds a runner token — see `isRunner`.
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRunning = runEvent?.event_type === 'start';

  async function onPress() {
    setBusy(true);
    setError(null);
    try {
      if (isRunning) {
        await sendRunEvent('stop');
      } else {
        await sendRunEvent('start');
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
        <View style={styles.chips}>
          {RUN_APP_ORDER.map((app) => {
            const active = app === selectedApp;
            return (
              <Pressable
                key={app}
                onPress={() => setSelectedApp(app)}
                disabled={busy}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.tint : theme.backgroundSelected,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={[styles.chipText, active ? styles.chipTextActive : undefined]}>
                  {RUN_APPS[app].glyph} {RUN_APPS[app].label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
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

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: Spacing.two, letterSpacing: 1 },
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
