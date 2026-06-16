import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { FUNCTIONS_URL } from '@/lib/config';

// Show banners while the app is foregrounded too. Wrapped because this runs at
// module-eval time — if the native module is missing (e.g. an outdated build),
// an uncaught throw here would take down everything that imports this file.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (err) {
  console.warn('expo-notifications native module unavailable:', err);
}

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
 * Requests permission, gets the Expo push token, and registers it as owned by
 * the signed-in runner (`ownerRunnerId`). run-event then fans out to the people
 * who watch a runner via their own tokens. Returns the outcome so the UI can
 * show a banner when permission is denied.
 */
export async function registerForPush(
  ownerRunnerId: string,
  label?: string,
): Promise<PushRegistration> {
  try {
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

    const projectId = getProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    const res = await fetch(`${FUNCTIONS_URL}/register-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, label: label ?? null, runner_id: ownerRunnerId }),
    });
    if (!res.ok) {
      return { status: 'error', message: `register-token ${res.status}` };
    }
    return { status: 'registered', token };
  } catch (err) {
    // A missing native module (outdated build) surfaces here as a thrown
    // "Cannot find native module" — treat it like push being unsupported on
    // this build rather than crashing the registration flow.
    if (String(err).includes('native module')) {
      return { status: 'unsupported' };
    }
    return { status: 'error', message: String(err) };
  }
}

// Memoize per owner so the layout (side effect) and any screen (banner) share
// one registration attempt instead of racing to register the token twice.
let registrationOwner: string | null = null;
let registrationPromise: Promise<PushRegistration> | null = null;

export function ensurePushRegistration(
  ownerRunnerId: string,
  label?: string,
): Promise<PushRegistration> {
  if (!registrationPromise || registrationOwner !== ownerRunnerId) {
    registrationOwner = ownerRunnerId;
    registrationPromise = registerForPush(ownerRunnerId, label);
  }
  return registrationPromise;
}
