import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fetchRaces } from '@/lib/api';
import { isConfigured } from '@/lib/config';
import { daysUntil, fullDate, relativeDay } from '@/lib/date';
import type { Race } from '@/lib/types';

export default function RacesScreen() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRaces(await fetchRaces());
    } catch {
      // surfaced as empty state; pull to retry
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

  // Future races first (soonest at top), then past races most-recent first.
  const upcoming = races.filter((r) => daysUntil(r.race_date) >= 0);
  const past = races.filter((r) => daysUntil(r.race_date) < 0).reverse();
  const ordered = [...upcoming, ...past];

  return (
    <Screen
      title="Races"
      subtitle="The season ahead"
      refreshing={refreshing}
      onRefresh={isConfigured ? onRefresh : undefined}>
      {loading && isConfigured ? (
        <ActivityIndicator style={styles.loader} />
      ) : ordered.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            No races on the calendar.
          </ThemedText>
        </Card>
      ) : (
        ordered.map((race) => {
          const isPast = daysUntil(race.race_date) < 0;
          return (
            <Card key={race.id} highlighted={Boolean(race.is_a_race) && !isPast} style={isPast && styles.past}>
              <View style={styles.headerRow}>
                <ThemedText type="default" style={styles.name}>
                  {race.name}
                </ThemedText>
                {race.is_a_race ? (
                  <View style={styles.badge}>
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
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.four },
  past: { opacity: 0.55 },
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
    backgroundColor: '#3c87f7',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  badgeText: { color: '#ffffff', fontSize: 11 },
  notes: { marginTop: Spacing.two },
});
