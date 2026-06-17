import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutType } from '@/lib/types';

// SF Symbol per workout type, with an emoji fallback for platforms without
// SF Symbols (Android/web) — mirrors the per-kind glyphs in the design.
const WORKOUT_SYMBOL: Record<WorkoutType, SymbolViewProps['name']> = {
  distance_time: 'figure.run',
  custom: 'bolt.fill',
  rest: 'moon.zzz.fill',
  open: 'safari.fill',
};

const WORKOUT_EMOJI: Record<WorkoutType, string> = {
  distance_time: '🏃',
  custom: '⚡️',
  rest: '😴',
  open: '🧭',
};

function asWorkoutType(type: string | null | undefined): WorkoutType {
  return type && type in WORKOUT_SYMBOL ? (type as WorkoutType) : 'distance_time';
}

/**
 * A rounded square holding a workout icon. Tinted (soft-accent bg + accent
 * glyph) for runs and today; muted otherwise. Recreated from the design's
 * `<Tile>` using SF Symbols.
 */
export function IconTile({
  workoutType,
  tint,
  size = 46,
}: {
  workoutType: string | null | undefined;
  tint?: boolean;
  size?: number;
}) {
  const theme = useTheme();
  const type = asWorkoutType(workoutType);
  const fg = tint ? theme.accent : theme.textSecondary;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: tint ? withAlpha(theme.accent, 0.16) : theme.backgroundSelected,
        },
      ]}>
      <SymbolView
        name={WORKOUT_SYMBOL[type]}
        size={Math.round(size * 0.5)}
        tintColor={fg}
        weight="semibold"
        fallback={<ThemedText style={{ fontSize: Math.round(size * 0.46) }}>{WORKOUT_EMOJI[type]}</ThemedText>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
