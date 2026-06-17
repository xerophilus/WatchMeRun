import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PersonSwitcher } from '@/components/person-switcher';
import { ScheduleEditor } from '@/components/schedule-editor';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePushRegistration } from '@/hooks/use-push';
import { fetchLatestWeek } from '@/lib/api';
import { fullDate, isToday, weekdayShort } from '@/lib/date';
import { useSession } from '@/lib/session';
import type { ScheduleDay, WorkoutType } from '@/lib/types';

const WORKOUT_GLYPH: Record<WorkoutType, string> = {
  distance_time: '🏃',
  custom: '⚡️',
  rest: '😴',
  open: '🧭',
};

function glyph(type: string | null): string {
  return (type && WORKOUT_GLYPH[type as WorkoutType]) || '🏃';
}

export default function ThisWeekScreen() {
  const theme = useTheme();
  const { me, watching, viewedId } = useSession();
  const targetId = viewedId ?? me?.id ?? null;
  const isSelf = targetId === me?.id;
  const viewedRunner = isSelf ? me : watching.find((w) => w.id === targetId);

  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const push = usePushRegistration();

  const load = useCallback(async () => {
    if (!targetId) return;
    try {
      setError(null);
      setDays(await fetchLatestWeek(targetId));
    } catch (e) {
      setError(String(e));
    }
  }, [targetId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const subtitle = isSelf
    ? 'Your training schedule'
    : `${viewedRunner?.name ?? 'Their'}'s training schedule`;

  return (
    <Screen title="This Week" subtitle={subtitle} refreshing={refreshing} onRefresh={onRefresh}>
      <PersonSwitcher />

      {push?.status === 'denied' ? (
        <Card style={styles.banner}>
          <ThemedText type="smallBold">Enable notifications</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Turn on notifications in Settings to know when your crew heads out.
          </ThemedText>
        </Card>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : error ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            Couldn&apos;t load the schedule. Pull to retry.
          </ThemedText>
        </Card>
      ) : days.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            {isSelf ? 'No schedule yet — paste one below.' : 'No schedule posted yet.'}
          </ThemedText>
        </Card>
      ) : (
        days.map((day) => {
          const today = isToday(day.day_date);
          return (
            <Card key={day.id} highlighted={today}>
              <View style={styles.row}>
                <ThemedText style={styles.glyph}>{glyph(day.workout_type)}</ThemedText>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <ThemedText
                      themeColor="textSecondary"
                      type="smallBold"
                      style={today ? { color: theme.accent } : undefined}>
                      {today ? 'TODAY' : weekdayShort(day.day_date).toUpperCase()}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {fullDate(day.day_date)}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.workoutTitle}>
                    {day.title}
                  </ThemedText>
                  {day.detail ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {day.detail}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        })
      )}

      {isSelf && !loading && !error ? (
        <ScheduleEditor week={days} weekStart={days[0]?.week_start ?? null} onSaved={load} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.four },
  banner: { borderColor: '#f59e0b', borderWidth: 2, gap: Spacing.half },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  glyph: { fontSize: 28, lineHeight: 34 },
  body: { flex: 1, gap: Spacing.half },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTitle: { fontWeight: '700' },
});
