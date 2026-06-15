import { PropsWithChildren, ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

/** Scrollable screen with a header, safe-area insets, and pull-to-refresh. */
export function Screen({ title, subtitle, refreshing, onRefresh, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const contentStyle = Platform.select({
    web: { paddingTop: Spacing.six, paddingBottom: Spacing.six },
    default: {
      paddingTop: insets.top + Spacing.four,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
  });

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, contentStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={theme.textSecondary}
          />
        ) : undefined
      }>
      <ThemedView style={styles.inner}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {typeof subtitle === 'string' ? (
            <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
          ) : (
            subtitle
          )}
        </ThemedView>
        {children}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
});
