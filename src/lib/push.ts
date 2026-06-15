import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { FUNCTIONS_URL } from '@/lib/config';

// Show banners while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushRegistration =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unsupported' }
  | { status: 'error'; message: string };

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

/**
 * Requests permission, gets the Expo push token, and registers it with the
 * backend for Ben's crew. Returns the outcome so the UI can show a banner when
 * permission is denied.
 */
export async function registerForPush(label = 'Kenz'): Promise<PushRegistration> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  if (!Device.isDevice) {
    // Push tokens only work on physical devices.
    return { status: 'unsupported' };
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return { status: 'denied' };

  try {
    const projectId = getProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    const res = await fetch(`${FUNCTIONS_URL}/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, label }),
    });
    if (!res.ok) {
      return { status: 'error', message: `register-token ${res.status}` };
    }
    return { status: 'registered', token };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

// Memoize so the layout (side effect) and any screen (banner) share one
// registration attempt instead of racing to register the token twice.
let registrationPromise: Promise<PushRegistration> | null = null;

export function ensurePushRegistration(label = 'Kenz'): Promise<PushRegistration> {
  if (!registrationPromise) {
    registrationPromise = registerForPush(label);
  }
  return registrationPromise;
}
