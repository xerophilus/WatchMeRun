import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useNotificationRouting } from '@/hooks/use-notification-routing';
import { usePushRegistration } from '@/hooks/use-push';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // Request permission + register the Expo push token on launch.
  usePushRegistration();
  // Tapping a run notification opens the Live tab.
  useNotificationRouting();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
