import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { LiveCard } from '@/components/live-detail';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { StartRunControl } from '@/components/start-run-control';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useLiveStatus } from '@/hooks/use-live-status';
import { useSession } from '@/lib/session';
import type { Runner } from '@/lib/types';

type Tab = 'mine' | 'watching';

export default function LiveScreen() {
  const { me, watching } = useSession();

  // Default to Watching — the point of Live is seeing who's out right now.
  const [tab, setTab] = useState<Tab>(watching.length > 0 ? 'watching' : 'mine');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Remounts the cards to force a refetch on pull-to-refresh.
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Only poll / subscribe while the Live screen is actually focused.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

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
    </View>
  );

  return (
    <Screen title="Live" subtitle={header} refreshing={refreshing} onRefresh={onRefresh}>
      {tab === 'mine' ? (
        me ? (
          <MyLive key={refreshKey} me={me} active={focused} />
        ) : null
      ) : watching.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            You&apos;re not watching anyone yet. Add people from the Crew tab to see when they head
            out.
          </ThemedText>
        </Card>
      ) : (
        watching.map((w) => (
          <LiveRunnerCard
            key={`${w.id}-${refreshKey}`}
            runner={w}
            active={focused}
            expanded={Boolean(expanded[w.id])}
            onToggle={() => setExpanded((e) => ({ ...e, [w.id]: !e[w.id] }))}
          />
        ))
      )}
    </Screen>
  );
}

/** Your own run: the Start control plus an always-expanded live card. */
function MyLive({ me, active }: { me: Runner; active: boolean }) {
  const status = useLiveStatus(me.id, active);
  return (
    <>
      <StartRunControl runEvent={status.runEvent} onChanged={status.reload} />
      <LiveCard title="You" status={status} expanded />
    </>
  );
}

/** A watched runner in the feed: collapsible live card. */
function LiveRunnerCard({
  runner,
  active,
  expanded,
  onToggle,
}: {
  runner: Runner;
  active: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = useLiveStatus(runner.id, active);
  return <LiveCard title={runner.name} status={status} expanded={expanded} onToggle={onToggle} />;
}

const styles = StyleSheet.create({
  segmentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
});
