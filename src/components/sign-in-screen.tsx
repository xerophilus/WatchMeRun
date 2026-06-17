import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

/**
 * First screen for a signed-out user. Sign in with Apple yields an identity
 * token we hand straight to Supabase Auth; the session is then persisted and
 * the SessionProvider takes over (onboarding or the app).
 */
export function SignInScreen() {
  const scheme = useColorScheme();
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple.');
      const { error: authErr } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (authErr) throw authErr;
      // onAuthStateChange in SessionProvider handles the rest.
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') return; // user backed out
      setError(err.message ?? String(e));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <ThemedText style={styles.logo}>🏃</ThemedText>
        <ThemedText type="title" style={styles.wordmark}>
          Crewd
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
          Follow your crew&apos;s training, and let them follow yours.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={Spacing.three}
            style={styles.appleButton}
            onPress={signIn}
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Sign in with Apple is available on iOS.
          </ThemedText>
        )}
        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: Spacing.six },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
  // lineHeight must clear the glyph or the default 24px body line-height clips it.
  logo: { fontSize: 64, lineHeight: 76, textAlign: 'center' },
  wordmark: { textTransform: 'uppercase', fontSize: 56, lineHeight: 70 },
  tagline: { textAlign: 'center', maxWidth: 300 },
  actions: { gap: Spacing.three, paddingBottom: Spacing.six },
  appleButton: { height: 52, width: '100%' },
  error: { color: '#e5484d', textAlign: 'center' },
});
