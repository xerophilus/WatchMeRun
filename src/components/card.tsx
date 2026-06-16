import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = PropsWithChildren<{
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

/** A rounded surface used for schedule days, races, and the live cards. */
export function Card({ highlighted, style, children }: CardProps) {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        highlighted && { borderColor: theme.accent, borderWidth: 2 },
        style,
      ]}>
      <View>{children}</View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
