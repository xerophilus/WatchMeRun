import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { LiveDot } from '@/components/live-dot';
import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

function fmtTime(sec: number): string {
  const t = Math.max(0, sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(s).padStart(2, '0');
}

/**
 * A stylized live run-tracking map. There's no real GPS source yet (v2), so the
 * streets are decorative and the distance/pace are estimated from elapsed time
 * at an easy ~9:30/mi — enough to convey "you're being tracked right now".
 * Recreated natively from the design's SVG `<TrackingMap>` using plain Views
 * (no SVG dependency) so it drops straight into the Live screen.
 */
export function TrackingMap({ elapsedSec = 0 }: { elapsedSec?: number }) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const m = dark
    ? { base: '#14161B', block: '#1B1E25', road: '#272B34', main: '#343945' }
    : { base: '#E7E8E2', block: '#F1F1EB', road: '#FFFFFF', main: '#FFFFFF' };

  const distMi = (elapsedSec / 570).toFixed(2);
  const overlay = dark ? 'rgba(10,11,13,0.92)' : 'rgba(255,255,255,0.95)';
  const chrome = withAlpha(dark ? '#000000' : '#FFFFFF', 0.6);

  return (
    <View style={[styles.map, { backgroundColor: m.base }]}>
      {/* decorative streets + blocks */}
      <View style={[styles.block, { top: 24, left: 16, width: 96, height: 64, backgroundColor: m.block }]} />
      <View style={[styles.block, { top: 24, right: 18, width: 84, height: 70, backgroundColor: m.block }]} />
      <View style={[styles.block, { bottom: 70, left: 20, width: 80, height: 56, backgroundColor: m.block }]} />
      <View style={[styles.block, { bottom: 64, right: 24, width: 92, height: 60, backgroundColor: m.block }]} />
      <View style={[styles.hRoad, { top: 96, backgroundColor: m.road }]} />
      <View style={[styles.hRoad, { bottom: 86, backgroundColor: m.road }]} />
      <View style={[styles.vRoad, { left: 120, backgroundColor: m.road }]} />
      <View style={[styles.vRoad, { right: 70, backgroundColor: m.road }]} />
      <View style={[styles.vRoad, { left: '52%', width: 13, backgroundColor: m.main }]} />

      {/* current position */}
      <View style={styles.position}>
        <LiveDot color={theme.accent} size={14} />
      </View>

      {/* LIVE badge */}
      <View style={[styles.badge, { backgroundColor: chrome, borderColor: theme.backgroundSelected }]}>
        <View style={[styles.badgeDot, { backgroundColor: theme.accent }]} />
        <ThemedText type="smallBold" style={styles.badgeText}>
          LIVE
        </ThemedText>
      </View>

      {/* recenter */}
      <View style={[styles.recenter, { backgroundColor: chrome, borderColor: theme.backgroundSelected }]}>
        <SymbolView name="location.fill" size={16} tintColor={theme.accent} />
      </View>

      {/* stats bar */}
      <View
        style={[
          styles.stats,
          { experimental_backgroundImage: `linear-gradient(to top, ${overlay}, ${withAlpha(dark ? '#0A0B0D' : '#FFFFFF', 0)})` },
        ]}>
        <MapStat n={distMi} label="mi" />
        <MapStat n={fmtTime(elapsedSec)} label="time" />
        <MapStat n="9:30" label="/mi" />
      </View>
    </View>
  );
}

function MapStat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statNum}>{n}</ThemedText>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.statLabel}>
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 240, borderRadius: 18, overflow: 'hidden' },
  block: { position: 'absolute', borderRadius: 8 },
  hRoad: { position: 'absolute', left: 0, right: 0, height: 7, borderRadius: 4 },
  vRoad: { position: 'absolute', top: 0, bottom: 0, width: 7, borderRadius: 4 },
  position: { position: 'absolute', top: '42%', left: '46%' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 10, letterSpacing: 1.4 },
  recenter: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 22,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  stat: { flex: 1 },
  statNum: { fontSize: 26, lineHeight: 28, fontWeight: '800', letterSpacing: 0.5 },
  statLabel: { fontSize: 10, letterSpacing: 1.2, marginTop: 4 },
});
