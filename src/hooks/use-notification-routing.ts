import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Every push we send is a run event, so tapping one should land on the Live
// tab. Handles both a cold start (app launched by the tap) and a warm tap
// (app already running/backgrounded).
export function useNotificationRouting() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let active = true;
    const goLive = () => router.navigate('/live');

    try {
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (active && response) goLive();
        })
        .catch(() => {});

      const sub = Notifications.addNotificationResponseReceivedListener(goLive);
      return () => {
        active = false;
        sub.remove();
      };
    } catch {
      // Native module unavailable (e.g. outdated build) — no routing to wire up.
      return () => {
        active = false;
      };
    }
  }, []);
}
