import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthGate } from '@/components/auth-gate';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { SessionProvider } from '@/lib/session';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Tapping a run notification opens the Live tab. (Push registration happens
  // inside the app once signed in — see usePushRegistration.)
  useNotificationRouting();

  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AuthGate>
          <AppTabs />
        </AuthGate>
      </ThemeProvider>
    </SessionProvider>
  );
}
