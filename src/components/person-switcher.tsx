import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';

/**
 * Horizontal chips to choose whose data This Week / Live shows: You, then each
 * person you watch. Hidden until you watch at least one person.
 */
export function PersonSwitcher() {
  const theme = useTheme();
  const { me, watching, viewedId, setViewedId } = useSession();
  if (!me || watching.length === 0) return null;

  const people = [me, ...watching];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {people.map((p) => {
        const active = (viewedId ?? me.id) === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setViewedId(p.id)}
            style={[styles.chip, { backgroundColor: active ? theme.tint : theme.backgroundSelected }]}>
            <ThemedText type="small" style={[styles.text, active ? styles.active : undefined]}>
              {p.id === me.id ? 'You' : p.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingVertical: Spacing.one, paddingRight: Spacing.three },
  chip: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.four },
  text: { fontWeight: '600' },
  active: { color: '#fff' },
});
