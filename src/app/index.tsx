import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { usePushRegistration } from '@/hooks/use-push';
import { fetchLatestWeek } from '@/lib/api';
import { isConfigured } from '@/lib/config';
import { fullDate, isToday, weekdayShort } from '@/lib/date';
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
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const push = usePushRegistration();

  const load = useCallback(async () => {
    try {
      setError(null);
      setDays(await fetchLatestWeek());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <Screen
      title="This Week"
      subtitle="Ben's current training schedule"
      refreshing={refreshing}
      onRefresh={isConfigured ? onRefresh : undefined}>
      {push?.status === 'denied' ? (
        <Card style={styles.banner}>
          <ThemedText type="smallBold">Enable notifications</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Turn on notifications in Settings to know when Ben heads out.
          </ThemedText>
        </Card>
      ) : null}
      {!isConfigured ? (
        <Card>
          <ThemedText type="smallBold">Not configured yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY and
            EXPO_PUBLIC_RUNNER_ID in your .env (see .env.example).
          </ThemedText>
        </Card>
      ) : loading ? (
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
            No schedule posted yet.
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
                    <ThemedText themeColor="textSecondary" type="smallBold">
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
