import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SESSION_TYPE_META, toSessionType } from '@/lib/session-type';

/**
 * A rounded square holding a workout icon. Tinted (soft-accent bg + accent
 * glyph) for runs and today; muted otherwise. The glyph is chosen from the
 * session type (SF Symbol on iOS, emoji fallback elsewhere).
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
  const meta = SESSION_TYPE_META[toSessionType(workoutType)];
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
        name={meta.symbol}
        size={Math.round(size * 0.5)}
        tintColor={fg}
        weight="semibold"
        fallback={<ThemedText style={{ fontSize: Math.round(size * 0.46) }}>{meta.emoji}</ThemedText>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
