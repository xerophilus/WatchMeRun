import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AthleteRacesCard } from '@/components/athlete-races-card';
import { Card } from '@/components/card';
import { RaceEditorSheet } from '@/components/race-editor-sheet';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createRace, deleteRace, fetchRaces, updateRace, type RaceInput } from '@/lib/api';
import { daysUntil, fullDate, relativeDay } from '@/lib/date';
import { useSession } from '@/lib/session';
import type { Race } from '@/lib/types';

type Tab = 'mine' | 'watching';

export default function RacesScreen() {
  const theme = useTheme();
  const { me, watching } = useSession();

  const [tab, setTab] = useState<Tab>('mine');

  // --- Mine ---
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Watching ---
  const [watchingRaces, setWatchingRaces] = useState<Record<string, Race[]>>({});
  const [watchingLoading, setWatchingLoading] = useState(false);

  // --- Editor ---
  const [editor, setEditor] = useState<{ visible: boolean; race: Race | null }>({
    visible: false,
    race: null,
  });

  const loadMine = useCallback(async () => {
    if (!me) return;
    try {
      setRaces(await fetchRaces(me.id));
    } catch {
      // surfaced as empty state; pull to retry
    }
  }, [me]);

  useEffect(() => {
    setLoading(true);
    loadMine().finally(() => setLoading(false));
  }, [loadMine]);

  const loadWatching = useCallback(async () => {
    if (watching.length === 0) {
      setWatchingRaces({});
      return;
    }
    setWatchingLoading(true);
    try {
      const entries = await Promise.all(
        watching.map(async (w) => [w.id, await fetchRaces(w.id).catch(() => [])] as const),
      );
      setWatchingRaces(Object.fromEntries(entries));
    } finally {
      setWatchingLoading(false);
    }
  }, [watching]);

  useEffect(() => {
    if (tab === 'watching') loadWatching();
  }, [tab, loadWatching]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await (tab === 'mine' ? loadMine() : loadWatching());
    setRefreshing(false);
  }, [tab, loadMine, loadWatching]);

  const saveRace = useCallback(
    async (input: RaceInput, id?: string) => {
      if (!me) return;
      try {
        if (id) await updateRace(id, input);
        else await createRace(me.id, input);
        await loadMine();
      } catch {
        // best-effort; the list just won't change
      }
    },
    [me, loadMine],
  );

  const removeRace = useCallback(
    async (id: string) => {
      try {
        await deleteRace(id);
        await loadMine();
      } catch {
        /* no-op */
      }
    },
    [loadMine],
  );

  // Future races first (soonest at top), then past races most-recent first.
  const upcoming = races.filter((r) => daysUntil(r.race_date) >= 0);
  const past = races.filter((r) => daysUntil(r.race_date) < 0).reverse();
  const ordered = [...upcoming, ...past];
  const goal = upcoming.find((r) => r.is_a_race);

  const header = (
    <View style={styles.segmentRow}>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: 'mine', label: 'Mine' },
          { value: 'watching', label: 'Watching' },
        ]}
      />
      {tab === 'mine' ? (
        <Pressable
          onPress={() => setEditor({ visible: true, race: null })}
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <SymbolView
            name="plus"
            size={20}
            tintColor="#fff"
            weight="bold"
            fallback={<ThemedText style={styles.addPlus}>＋</ThemedText>}
          />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Screen title="Races" subtitle={header} refreshing={refreshing} onRefresh={onRefresh}>
      {tab === 'mine' ? (
        loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : (
          <>
            {goal ? (
              <View style={[styles.hero, { backgroundColor: theme.accent }]}>
                <ThemedText type="smallBold" style={styles.heroKicker}>
                  SEASON GOAL · A-RACE
                </ThemedText>
                <View style={styles.heroDaysRow}>
                  <ThemedText style={styles.heroDays}>
                    {Math.max(0, daysUntil(goal.race_date))}
                  </ThemedText>
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

            {ordered.length > 0 ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                FULL SCHEDULE
              </ThemedText>
            ) : null}

            {ordered.map((race) => {
              const isPast = daysUntil(race.race_date) < 0;
              return (
                <Pressable key={race.id} onPress={() => setEditor({ visible: true, race })}>
                  <Card
                    highlighted={Boolean(race.is_a_race) && !isPast}
                    style={isPast ? styles.past : undefined}>
                    <View style={styles.headerRow}>
                      <ThemedText type="default" style={styles.name}>
                        {race.name}
                      </ThemedText>
                      <View style={styles.headerRight}>
                        {race.is_a_race ? (
                          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                            <ThemedText type="smallBold" style={styles.badgeText}>
                              A-RACE
                            </ThemedText>
                          </View>
                        ) : null}
                        <SymbolView
                          name="pencil"
                          size={15}
                          tintColor={theme.textSecondary}
                          weight="semibold"
                          fallback={<ThemedText themeColor="textSecondary">✎</ThemedText>}
                        />
                      </View>
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
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setEditor({ visible: true, race: null })}
              style={[styles.addRace, { borderColor: theme.backgroundSelected }]}>
              <SymbolView
                name="plus"
                size={14}
                tintColor={theme.textSecondary}
                weight="semibold"
                fallback={<ThemedText themeColor="textSecondary">＋</ThemedText>}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.addRaceText}>
                Add a race
              </ThemedText>
            </Pressable>
          </>
        )
      ) : watching.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            You&apos;re not watching anyone yet. Add people from the Crew tab to see their races here.
          </ThemedText>
        </Card>
      ) : watchingLoading && Object.keys(watchingRaces).length === 0 ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        watching.map((w) => (
          <AthleteRacesCard key={w.id} runner={w} races={watchingRaces[w.id] ?? []} />
        ))
      )}

      <RaceEditorSheet
        visible={editor.visible}
        race={editor.race}
        onSave={saveRace}
        onDelete={removeRace}
        onClose={() => setEditor((e) => ({ ...e, visible: false }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.four },
  segmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addPlus: { color: '#fff', fontSize: 22, lineHeight: 26 },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
  addRace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addRaceText: { fontWeight: '600' },
});
