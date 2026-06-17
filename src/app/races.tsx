import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PersonSwitcher } from '@/components/person-switcher';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchRaces } from '@/lib/api';
import { daysUntil, fullDate, relativeDay } from '@/lib/date';
import { useSession } from '@/lib/session';
import type { Race } from '@/lib/types';

export default function RacesScreen() {
  const theme = useTheme();
  const { me, watching, viewedId } = useSession();
  const targetId = viewedId ?? me?.id ?? null;
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    try {
      setRaces(await fetchRaces(targetId));
    } catch {
      // surfaced as empty state; pull to retry
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

  // Future races first (soonest at top), then past races most-recent first.
  const upcoming = races.filter((r) => daysUntil(r.race_date) >= 0);
  const past = races.filter((r) => daysUntil(r.race_date) < 0).reverse();
  const ordered = [...upcoming, ...past];

  const isSelf = targetId === me?.id;
  const viewedRunner = isSelf ? me : watching.find((w) => w.id === targetId);
  const subtitle = isSelf ? 'The season ahead' : `${viewedRunner?.name ?? 'Their'}'s season`;

  // The next upcoming A-race anchors the season-goal hero (soonest first).
  const goal = upcoming.find((r) => r.is_a_race);

  return (
    <Screen title="Races" subtitle={subtitle} refreshing={refreshing} onRefresh={onRefresh}>
      <PersonSwitcher />
      {goal ? (
        <View style={[styles.hero, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={styles.heroKicker}>
            SEASON GOAL · A-RACE
          </ThemedText>
          <View style={styles.heroDaysRow}>
            <ThemedText style={styles.heroDays}>{Math.max(0, daysUntil(goal.race_date))}</ThemedText>
            <ThemedText style={styles.heroDaysUnit}>days out</ThemedText>
          </View>
          <ThemedText type="default" style={styles.heroName}>
            {goal.name}
          </ThemedText>
          <ThemedText type="small" style={styles.heroMeta}>
            {fullDate(goal.race_date)}
            {goal.distance ? ` · ${goal.distance}` : ''}
            {goal.location ? ` · ${goal.location}` : ''}
          </ThemedText>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : ordered.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            No races on the calendar.
          </ThemedText>
        </Card>
      ) : (
        <>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
            FULL SCHEDULE
          </ThemedText>
          {ordered.map((race) => {
          const isPast = daysUntil(race.race_date) < 0;
          return (
            <Card key={race.id} highlighted={Boolean(race.is_a_race) && !isPast} style={isPast && styles.past}>
              <View style={styles.headerRow}>
                <ThemedText type="default" style={styles.name}>
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

              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  {fullDate(race.race_date)}
                  {race.distance ? ` · ${race.distance}` : ''}
                  {race.location ? ` · ${race.location}` : ''}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {relativeDay(race.race_date)}
                </ThemedText>
              </View>

              {race.notes ? (
                <ThemedText type="small" style={styles.notes}>
                  {race.notes}
                </ThemedText>
              ) : null}
            </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.four },
  past: { opacity: 0.55 },
  hero: { borderRadius: Spacing.four, padding: Spacing.four },
  heroKicker: { color: '#ffffff', opacity: 0.85, fontSize: 11, letterSpacing: 1.6 },
  heroDaysRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, marginTop: Spacing.one },
  heroDays: { color: '#ffffff', fontFamily: Font.display, fontSize: 76, lineHeight: 92, letterSpacing: 0.5 },
  heroDaysUnit: { color: '#ffffff', opacity: 0.9, fontSize: 18, fontWeight: '600' },
  sectionLabel: { letterSpacing: 1.6, marginTop: Spacing.one },
  heroName: { color: '#ffffff', fontWeight: '700', fontSize: 20, marginTop: Spacing.three },
  heroMeta: { color: '#ffffff', opacity: 0.9, marginTop: Spacing.half },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: { fontWeight: '700', flexShrink: 1 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.half,
    gap: Spacing.two,
  },
  badge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  badgeText: { color: '#ffffff', fontSize: 11 },
  notes: { marginTop: Spacing.two },
});
