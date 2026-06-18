import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AddWorkoutSheet, type NewSession } from '@/components/add-workout-sheet';
import { AthleteScheduleCard } from '@/components/athlete-schedule-card';
import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ScheduleEditor } from '@/components/schedule-editor';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePushRegistration } from '@/hooks/use-push';
import { fetchLatestWeek, updateWeek } from '@/lib/api';
import { fullDate, isToday, mondayOf, todayIso, weekDates, weekdayShort } from '@/lib/date';
import { useSession } from '@/lib/session';
import { isRestType, sessionMiles } from '@/lib/session-type';
import type { ScheduleDay } from '@/lib/types';

type Tab = 'mine' | 'watching';

/** A session reduced to the fields updateWeek persists. */
type SessionInput = { day_date: string; title: string; detail?: string; workout_type?: string };

function toInput(d: ScheduleDay): SessionInput {
  return {
    day_date: d.day_date,
    title: d.title,
    detail: d.detail ?? undefined,
    workout_type: d.workout_type ?? undefined,
  };
}

export default function ThisWeekScreen() {
  const theme = useTheme();
  const { me, watching } = useSession();
  const push = usePushRegistration();

  const [tab, setTab] = useState<Tab>('mine');

  // --- Mine ---
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- Watching ---
  const [watchingWeeks, setWatchingWeeks] = useState<Record<string, ScheduleDay[]>>({});
  const [watchingLoading, setWatchingLoading] = useState(false);

  // --- Add-workout sheet ---
  const [sheet, setSheet] = useState<{ visible: boolean; date: string }>({
    visible: false,
    date: todayIso(),
  });

  const loadMine = useCallback(async () => {
    if (!me) return;
    try {
      setError(null);
      setDays(await fetchLatestWeek(me.id));
    } catch (e) {
      setError(String(e));
    }
  }, [me]);

  useEffect(() => {
    setLoading(true);
    loadMine().finally(() => setLoading(false));
  }, [loadMine]);

  const loadWatching = useCallback(async () => {
    if (watching.length === 0) {
      setWatchingWeeks({});
      return;
    }
    setWatchingLoading(true);
    try {
      const entries = await Promise.all(
        watching.map(async (w) => [w.id, await fetchLatestWeek(w.id).catch(() => [])] as const),
      );
      setWatchingWeeks(Object.fromEntries(entries));
    } finally {
      setWatchingLoading(false);
    }
  }, [watching]);

  // Pull the watched athletes' weeks the first time that tab opens.
  useEffect(() => {
    if (tab === 'watching') loadWatching();
  }, [tab, loadWatching]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await (tab === 'mine' ? loadMine() : loadWatching());
    setRefreshing(false);
  }, [tab, loadMine, loadWatching]);

  // The week being edited: the latest one we have, else the current calendar week.
  const weekStart = days[0]?.week_start ?? mondayOf();
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const byDay = useMemo(() => {
    const map: Record<string, ScheduleDay[]> = {};
    for (const d of days) (map[d.day_date] ??= []).push(d);
    return map;
  }, [days]);

  const summary = useMemo(() => {
    const miles = Math.round(days.reduce((sum, d) => sum + sessionMiles(d), 0));
    const runs = days.filter((d) => !isRestType(d.workout_type)).length;
    return { miles, runs, rests: days.length - runs };
  }, [days]);

  const persist = useCallback(
    async (sessions: SessionInput[]) => {
      if (!me) return;
      setSaving(true);
      try {
        await updateWeek(me.id, weekStart, sessions);
        await loadMine();
      } catch (e) {
        setError(String(e instanceof Error ? e.message : e));
      } finally {
        setSaving(false);
      }
    },
    [me, weekStart, loadMine],
  );

  const addSession = useCallback(
    (s: NewSession) => {
      // Stable sort by date keeps any existing same-day sessions ahead of the
      // new one, so its position lands after them (AM before the PM you add).
      const next = [...days.map(toInput), s].sort((a, b) => a.day_date.localeCompare(b.day_date));
      persist(next);
    },
    [days, persist],
  );

  const removeSession = useCallback(
    (id: string) => persist(days.filter((d) => d.id !== id).map(toInput)),
    [days, persist],
  );

  function openSheet(date: string) {
    setSheet({ visible: true, date });
  }

  function openForToday() {
    const today = todayIso();
    openSheet(dates.includes(today) ? today : weekStart);
  }

  const header = (
    <View style={styles.segmentRow}>
      <View style={[styles.segment, { backgroundColor: theme.backgroundSelected }]}>
        {(['mine', 'watching'] as const).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segmentItem, active && { backgroundColor: theme.backgroundElement }]}>
              <ThemedText
                type="smallBold"
                style={{ color: active ? theme.text : theme.textSecondary }}>
                {t === 'mine' ? 'Mine' : 'Watching'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {tab === 'mine' ? (
        <Pressable
          onPress={openForToday}
          disabled={loading || Boolean(error)}
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
    <Screen title="This Week" subtitle={header} refreshing={refreshing} onRefresh={onRefresh}>
      {push?.status === 'denied' ? (
        <Card style={styles.banner}>
          <ThemedText type="smallBold">Enable notifications</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Turn on notifications in Settings to know when your crew heads out.
          </ThemedText>
        </Card>
      ) : null}

      {tab === 'mine'
        ? renderMine({ theme, loading, error, summary, dates, byDay, openSheet, removeSession, saving })
        : renderWatching({ watching, watchingWeeks, watchingLoading })}

      {/* Bulk entry: paste a whole week, then tweak day-by-day above. */}
      {tab === 'mine' && !loading && !error ? (
        <ScheduleEditor week={days} weekStart={days[0]?.week_start ?? null} onSaved={loadMine} />
      ) : null}

      <AddWorkoutSheet
        visible={sheet.visible}
        weekStart={weekStart}
        initialDate={sheet.date}
        onAdd={addSession}
        onClose={() => setSheet((s) => ({ ...s, visible: false }))}
      />
    </Screen>
  );
}

// --- Mine -------------------------------------------------------------------

function renderMine({
  theme,
  loading,
  error,
  summary,
  dates,
  byDay,
  openSheet,
  removeSession,
  saving,
}: {
  theme: ReturnType<typeof useTheme>;
  loading: boolean;
  error: string | null;
  summary: { miles: number; runs: number; rests: number };
  dates: string[];
  byDay: Record<string, ScheduleDay[]>;
  openSheet: (date: string) => void;
  removeSession: (id: string) => void;
  saving: boolean;
}) {
  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (error) {
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Couldn&apos;t load the schedule. Pull to retry.
        </ThemedText>
      </Card>
    );
  }

  return (
    <>
      {/* Week summary — planned miles + run/rest count, recomputed live. */}
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

      {dates.map((date) => {
        const today = isToday(date);
        const sessions = byDay[date] ?? [];
        return (
          <Card
            key={date}
            highlighted={today}
            style={today ? { backgroundColor: withAlpha(theme.accent, 0.12) } : undefined}>
            <ThemedText
              type="smallBold"
              themeColor="textSecondary"
              style={[styles.dayLabel, today ? { color: theme.accent } : undefined]}>
              {today ? 'TODAY' : weekdayShort(date).toUpperCase()} · {fullDate(date)}
            </ThemedText>

            {sessions.map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <IconTile
                  workoutType={session.workout_type}
                  tint={today || !isRestType(session.workout_type)}
                />
                <View style={styles.sessionBody}>
                  <ThemedText type="default" style={styles.workoutTitle}>
                    {session.title}
                  </ThemedText>
                  {session.detail ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {session.detail}
                    </ThemedText>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => removeSession(session.id)}
                  disabled={saving}
                  hitSlop={8}
                  style={[styles.remove, { backgroundColor: theme.backgroundSelected }]}>
                  <SymbolView
                    name="xmark"
                    size={12}
                    tintColor={theme.textSecondary}
                    weight="bold"
                    fallback={<ThemedText themeColor="textSecondary">✕</ThemedText>}
                  />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => openSheet(date)}
              style={[styles.addSession, { borderColor: theme.backgroundSelected }]}>
              <SymbolView
                name="plus"
                size={14}
                tintColor={theme.textSecondary}
                weight="semibold"
                fallback={<ThemedText themeColor="textSecondary">＋</ThemedText>}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.addSessionText}>
                Add a session
              </ThemedText>
            </Pressable>
          </Card>
        );
      })}
    </>
  );
}

// --- Watching ---------------------------------------------------------------

function renderWatching({
  watching,
  watchingWeeks,
  watchingLoading,
}: {
  watching: ReturnType<typeof useSession>['watching'];
  watchingWeeks: Record<string, ScheduleDay[]>;
  watchingLoading: boolean;
}) {
  if (watching.length === 0) {
    return (
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          You&apos;re not watching anyone yet. Add people from the Crew tab to see their weeks here.
        </ThemedText>
      </Card>
    );
  }
  if (watchingLoading && Object.keys(watchingWeeks).length === 0) {
    return <ActivityIndicator style={styles.loader} />;
  }
  return (
    <>
      {watching.map((w) => (
        <AthleteScheduleCard key={w.id} runner={w} days={watchingWeeks[w.id] ?? []} />
      ))}
    </>
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

  // Header: segmented control + add button
  segmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  segment: { flex: 1, flexDirection: 'row', borderRadius: Spacing.two, padding: 3 },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.one + 2,
  },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addPlus: { color: '#fff', fontSize: 22, lineHeight: 26 },

  // Summary hero
  sectionLabel: { letterSpacing: 1.4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  milesRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two, marginTop: Spacing.one },
  milesNum: { fontFamily: Font.display, fontSize: 64, lineHeight: 78, letterSpacing: 1 },
  milesUnit: { fontSize: 18, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: Spacing.four },
  stat: { alignItems: 'flex-end' },
  statNum: { fontFamily: Font.display, fontSize: 32, lineHeight: 40 },
  statLabel: { fontSize: 11, letterSpacing: 1, marginTop: Spacing.one },

  // Day cards
  dayLabel: { letterSpacing: 1.2, fontSize: 11, marginBottom: Spacing.two },
  sessionRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center', marginBottom: Spacing.two },
  sessionBody: { flex: 1, gap: Spacing.half },
  workoutTitle: { fontWeight: '700' },
  remove: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  addSession: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSessionText: { fontWeight: '600' },
});
