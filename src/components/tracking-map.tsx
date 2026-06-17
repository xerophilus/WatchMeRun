import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

import { LiveDot } from '@/components/live-dot';
import { ThemedText } from '@/components/themed-text';
import { Font, Spacing, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

function fmtTime(sec: number): string {
  const t = Math.max(0, sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + ':' + String(s).padStart(2, '0');
}

const METERS_PER_MI = 1609.344;
// Easy ~9:30/mi — the estimate used to fill distance/pace before GPS has ≥2 points.
const EST_SEC_PER_MI = 570;
// Zoom of the follow view (~0.01 ≈ a few city blocks).
const ZOOM_DELTA = 0.01;

export type RunTelemetry = {
  elapsedSec?: number;
  /** Measured distance from GPS; when null we estimate from elapsed time. */
  distanceMeters?: number | null;
  /** Breadcrumb trail + current point — drives the route polyline + marker. */
  path?: { lat: number; lng: number }[];
  current?: { lat: number; lng: number } | null;
};

/**
 * Live run-tracking map. Renders the real route (react-native-maps, Apple Maps
 * on iOS) as a breadcrumb polyline with a pulsing marker at the current point,
 * and overlays the LIVE badge, a recenter button, and a distance/time/pace bar.
 * With measured GPS distance the stats are exact; with only `elapsedSec` they
 * estimate at an easy pace so the card still reads as "live" before points land.
 */
export function TrackingMap({
  elapsedSec = 0,
  distanceMeters = null,
  path = [],
  current = null,
}: RunTelemetry) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const mapRef = useRef<MapView>(null);

  // The point to center on: the current location, else the last/first breadcrumb.
  const center = current ?? path[path.length - 1] ?? path[0] ?? null;

  const coords = useMemo(() => path.map((p) => ({ latitude: p.lat, longitude: p.lng })), [path]);

  const initialRegion = center
    ? { latitude: center.lat, longitude: center.lng, latitudeDelta: ZOOM_DELTA, longitudeDelta: ZOOM_DELTA }
    : undefined;

  // Follow the runner: ease the camera to each new current point.
  useEffect(() => {
    if (center && mapRef.current) {
      mapRef.current.animateToRegion(
        { latitude: center.lat, longitude: center.lng, latitudeDelta: ZOOM_DELTA, longitudeDelta: ZOOM_DELTA },
        500,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng]);

  function recenter() {
    if (center) {
      mapRef.current?.animateToRegion(
        { latitude: center.lat, longitude: center.lng, latitudeDelta: ZOOM_DELTA, longitudeDelta: ZOOM_DELTA },
        300,
      );
    }
  }

  // Measured when GPS gives us distance; estimated from elapsed time otherwise.
  const measured = distanceMeters != null;
  const distMiNum = measured ? distanceMeters / METERS_PER_MI : elapsedSec / EST_SEC_PER_MI;
  const distMi = distMiNum.toFixed(2);
  const paceSecPerMi = measured && distMiNum > 0 ? elapsedSec / distMiNum : EST_SEC_PER_MI;
  const pace = `${Math.floor(paceSecPerMi / 60)}:${String(Math.round(paceSecPerMi % 60)).padStart(2, '0')}`;

  const overlay = dark ? 'rgba(10,11,13,0.92)' : 'rgba(255,255,255,0.95)';
  const chrome = withAlpha(dark ? '#000000' : '#FFFFFF', 0.6);

  return (
    <View style={styles.map}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        userInterfaceStyle={dark ? 'dark' : 'light'}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}>
        {coords.length > 1 ? (
          <Polyline coordinates={coords} strokeColor={theme.accent} strokeWidth={5} />
        ) : null}
        {center ? (
          <Marker coordinate={{ latitude: center.lat, longitude: center.lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <LiveDot color={theme.accent} size={16} />
          </Marker>
        ) : null}
      </MapView>

      {/* LIVE badge */}
      <View style={[styles.badge, { backgroundColor: chrome, borderColor: theme.backgroundSelected }]}>
        <View style={[styles.badgeDot, { backgroundColor: theme.accent }]} />
        <ThemedText type="smallBold" style={styles.badgeText}>
          LIVE
        </ThemedText>
      </View>

      {/* recenter */}
      <Pressable
        onPress={recenter}
        style={[styles.recenter, { backgroundColor: chrome, borderColor: theme.backgroundSelected }]}>
        <SymbolView name="location.fill" size={16} tintColor={theme.accent} />
      </Pressable>

      {/* stats bar */}
      <View
        style={[
          styles.stats,
          { experimental_backgroundImage: `linear-gradient(to top, ${overlay}, ${withAlpha(dark ? '#0A0B0D' : '#FFFFFF', 0)})` },
        ]}
        pointerEvents="none">
        <MapStat n={distMi} label="mi" />
        <MapStat n={fmtTime(elapsedSec)} label="time" />
        <MapStat n={pace} label="/mi" />
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
  statNum: { fontFamily: Font.display, fontSize: 28, lineHeight: 28, letterSpacing: 0.5 },
  statLabel: { fontSize: 10, letterSpacing: 1.2, marginTop: 4 },
});
