import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { useFonts } from 'expo-font';
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

  // Brand fonts (Anton display + Archivo body). Hold render until loaded so the
  // first frame isn't a flash of system font; the native splash stays up.
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });
  if (!fontsLoaded) return null;

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
