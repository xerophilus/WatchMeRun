import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { provisionRunner } from '@/lib/api';
import { useSession } from '@/lib/session';

/**
 * Shown once, right after first sign-in: pick a display name and @handle. The
 * handle is how crewmates find you in search; provision-runner also lets you
 * "claim" an unclaimed seeded handle (e.g. the original 'ben').
 */
export function OnboardingScreen() {
  const theme = useTheme();
  const { refresh, signOut } = useSession();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && handle.trim().length >= 2;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await provisionRunner({ name: name.trim(), handle: handle.trim() });
      await refresh();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Set up your profile</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          This is how your crew sees and finds you.
        </ThemedText>
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        DISPLAY NAME
      </ThemedText>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ben"
        placeholderTextColor={theme.textSecondary}
        editable={!busy}
        style={[styles.input, inputColors(theme)]}
      />

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        HANDLE
      </ThemedText>
      <View style={[styles.input, styles.handleRow, inputColors(theme)]}>
        <ThemedText themeColor="textSecondary">@</ThemedText>
        <TextInput
          value={handle}
          onChangeText={(t) => setHandle(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
          placeholder="ben"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
          style={[styles.handleInput, { color: theme.text }]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        Letters, numbers, and underscores. 2–30 characters.
      </ThemedText>

      <Pressable
        onPress={submit}
        disabled={!canSubmit || busy}
        style={[styles.button, { backgroundColor: theme.accent }, !canSubmit || busy ? styles.disabled : null]}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="default" style={styles.buttonText}>
            Continue
          </ThemedText>
        )}
      </Pressable>

      {error ? (
        <ThemedText type="small" style={[styles.hint, { color: theme.accent }]}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable onPress={signOut} style={styles.signOut}>
        <ThemedText type="small" themeColor="textSecondary">
          Sign out
        </ThemedText>
      </Pressable>
    </View>
  );
}

function inputColors(theme: ReturnType<typeof useTheme>) {
  return { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected };
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six, paddingTop: Spacing.six * 1.5 },
  header: { gap: Spacing.one, marginBottom: Spacing.five },
  label: { marginBottom: Spacing.one, letterSpacing: 1 },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 17,
    marginBottom: Spacing.three,
  },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  handleInput: { flex: 1, fontSize: 17, padding: 0 },
  hint: { marginTop: -Spacing.one, marginBottom: Spacing.three },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  disabled: { opacity: 0.5 },
  signOut: { alignItems: 'center', marginTop: Spacing.four, padding: Spacing.two },
});
