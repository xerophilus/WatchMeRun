import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { OnboardingScreen } from '@/components/onboarding-screen';
import { SignInScreen } from '@/components/sign-in-screen';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isConfigured } from '@/lib/config';
import { useSession } from '@/lib/session';
import type { PropsWithChildren } from 'react';

/**
 * Decides what the signed-in-ness of the user means for what they see:
 *   not configured -> setup hint
 *   loading        -> spinner
 *   no session     -> sign in
 *   no profile yet -> onboarding
 *   otherwise      -> the app (children)
 */
export function AuthGate({ children }: PropsWithChildren) {
  const theme = useTheme();
  const { loading, session, me } = useSession();

  if (!isConfigured) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Card>
          <ThemedText type="smallBold">Not configured yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
          </ThemedText>
        </Card>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  if (!session) return <SignInScreen />;
  if (!me) return <OnboardingScreen />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
});
