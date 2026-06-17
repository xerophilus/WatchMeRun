import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { PersonSwitcher } from '@/components/person-switcher';
import { ScheduleEditor } from '@/components/schedule-editor';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePushRegistration } from '@/hooks/use-push';
import { fetchLatestWeek } from '@/lib/api';
import { fullDate, isToday, weekdayShort } from '@/lib/date';
import { parseRunGoal } from '@/lib/run-apps';
import { useSession } from '@/lib/session';
import type { ScheduleDay } from '@/lib/types';

const KM_TO_MI = 0.621371;

/** Best-effort planned miles for a day from its workout text (km → mi). */
function dayMiles(day: ScheduleDay): number {
  const goal = parseRunGoal(day.workout_type ?? undefined, day.title, day.detail);
  if (goal.kind !== 'distance') return 0;
  return goal.unit === 'km' ? goal.value * KM_TO_MI : goal.value;
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

  const summary = useMemo(() => {
    const miles = days.reduce((sum, d) => sum + dayMiles(d), 0);
    const runs = days.filter((d) => d.workout_type !== 'rest').length;
    return { miles: Math.round(miles), runs, rests: days.length - runs };
  }, [days]);

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
        <>
          {/* Week summary — planned miles + run/rest count */}
          <Card>
            <View style={styles.summaryRow}>
              <View>
                <SectionLabel>MILES PLANNED</SectionLabel>
                <View style={styles.milesRow}>
                  <ThemedText style={[styles.milesNum, { color: theme.accent }]}>
                    {summary.miles}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.milesUnit}>
                    mi
                  </ThemedText>
                </View>
              </View>
              <View style={styles.stats}>
                <Stat n={summary.runs} label="RUNS" />
                <Stat n={summary.rests} label="REST" />
              </View>
            </View>
          </Card>

          {days.map((day) => {
            const today = isToday(day.day_date);
            return (
              <Card
                key={day.id}
                highlighted={today}
                style={today ? { backgroundColor: withAlpha(theme.accent, 0.12) } : undefined}>
                <View style={styles.row}>
                  <IconTile workoutType={day.workout_type} tint={today || day.workout_type !== 'rest'} />
                  <View style={styles.body}>
                    <View style={styles.titleRow}>
                      <ThemedText
                        type="smallBold"
                        themeColor="textSecondary"
                        style={[styles.dayLabel, today ? { color: theme.accent } : undefined]}>
                        {today ? 'TODAY' : weekdayShort(day.day_date).toUpperCase()} · {fullDate(day.day_date)}
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
          })}
        </>
      )}

      {isSelf && !loading && !error ? (
        <ScheduleEditor week={days} weekStart={days[0]?.week_start ?? null} onSaved={load} />
      ) : null}
    </Screen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statNum}>{n}</ThemedText>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.statLabel}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.four },
  banner: { borderColor: '#f59e0b', borderWidth: 2, gap: Spacing.half },
  sectionLabel: { letterSpacing: 1.4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  milesRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, marginTop: Spacing.one },
  milesNum: { fontFamily: Font.display, fontSize: 64, lineHeight: 58, letterSpacing: 1 },
  milesUnit: { fontSize: 18, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: Spacing.four },
  stat: { alignItems: 'flex-end' },
  statNum: { fontFamily: Font.display, fontSize: 32, lineHeight: 30 },
  statLabel: { fontSize: 11, letterSpacing: 1, marginTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  body: { flex: 1, gap: Spacing.half },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { letterSpacing: 1.2, fontSize: 11 },
  workoutTitle: { fontWeight: '700' },
});
