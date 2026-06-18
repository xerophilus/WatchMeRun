import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isToday, weekdayShort } from '@/lib/date';
import { sessionMiles } from '@/lib/session-type';
import type { Runner, ScheduleDay } from '@/lib/types';

/**
 * Read-only Watching card: one followed athlete with their initial avatar,
 * handle, weekly mileage, and a compact day-by-day list of their sessions.
 * Today's sessions are highlighted in the accent.
 */
export function AthleteScheduleCard({ runner, days }: { runner: Runner; days: ScheduleDay[] }) {
  const theme = useTheme();
  const miles = Math.round(days.reduce((sum, d) => sum + sessionMiles(d), 0));
  const initial = (runner.name || runner.handle || '?').charAt(0).toUpperCase();

  return (
    <Card>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(theme.accent, 0.16) }]}>
          <ThemedText style={[styles.avatarText, { color: theme.accent }]}>{initial}</ThemedText>
        </View>
        <View style={styles.identity}>
          <ThemedText type="default" style={styles.name}>
            {runner.name}
          </ThemedText>
          {runner.handle ? (
            <ThemedText type="small" themeColor="textSecondary">
              @{runner.handle}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.mileage}>
          <ThemedText style={[styles.mileageNum, { color: theme.accent }]}>{miles}</ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.mileageUnit}>
            MI
          </ThemedText>
        </View>
      </View>

      {days.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No schedule posted yet.
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {days.map((day) => {
            const today = isToday(day.day_date);
            return (
              <View
                key={day.id}
                style={[
                  styles.row,
                  today ? { backgroundColor: withAlpha(theme.accent, 0.12) } : undefined,
                ]}>
                <IconTile workoutType={day.workout_type} tint={today} size={30} />
                <ThemedText
                  type="smallBold"
                  style={[styles.dayLabel, today ? { color: theme.accent } : undefined]}
                  themeColor={today ? undefined : 'textSecondary'}>
                  {today ? 'TODAY' : weekdayShort(day.day_date).toUpperCase()}
                </ThemedText>
                <ThemedText type="small" style={styles.rowTitle} numberOfLines={1}>
                  {day.title}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', fontSize: 18 },
  identity: { flex: 1, gap: Spacing.half },
  name: { fontWeight: '700' },
  mileage: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  mileageNum: { fontFamily: Font.display, fontSize: 26, lineHeight: 30 },
  mileageUnit: { fontSize: 11, letterSpacing: 1 },
  list: { marginTop: Spacing.three, gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  dayLabel: { width: 52, fontSize: 11, letterSpacing: 0.8 },
  rowTitle: { flex: 1 },
  empty: { marginTop: Spacing.three },
});
