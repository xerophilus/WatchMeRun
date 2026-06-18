import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { daysUntil, fullDate, relativeDay } from '@/lib/date';
import type { Race, Runner } from '@/lib/types';

/**
 * Read-only Watching card: one followed athlete with their initial avatar,
 * handle, and their upcoming races. The next A-race is highlighted in the accent.
 */
export function AthleteRacesCard({ runner, races }: { runner: Runner; races: Race[] }) {
  const theme = useTheme();
  const upcoming = races.filter((r) => daysUntil(r.race_date) >= 0);
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
        <View style={styles.count}>
          <ThemedText style={[styles.countNum, { color: theme.accent }]}>{upcoming.length}</ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.countLabel}>
            UPCOMING
          </ThemedText>
        </View>
      </View>

      {upcoming.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No races on the calendar.
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {upcoming.map((race) => (
            <View
              key={race.id}
              style={[
                styles.row,
                race.is_a_race ? { backgroundColor: withAlpha(theme.accent, 0.12) } : undefined,
              ]}>
              <View style={styles.rowBody}>
                <View style={styles.rowTitleLine}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.rowName}>
                    {race.name}
                  </ThemedText>
                  {race.is_a_race ? (
                    <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                      <ThemedText type="smallBold" style={styles.badgeText}>
                        A-RACE
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {fullDate(race.race_date)}
                  {race.distance ? ` · ${race.distance}` : ''}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rowWhen}>
                {relativeDay(race.race_date)}
              </ThemedText>
            </View>
          ))}
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
  count: { alignItems: 'flex-end' },
  countNum: { fontFamily: Font.display, fontSize: 26, lineHeight: 30 },
  countLabel: { fontSize: 10, letterSpacing: 1 },
  list: { marginTop: Spacing.three, gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  rowBody: { flex: 1, gap: Spacing.half },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowName: { flexShrink: 1 },
  badge: { borderRadius: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 10 },
  rowWhen: { flexShrink: 0 },
  empty: { marginTop: Spacing.three },
});
