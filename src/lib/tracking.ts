import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { postPosition } from '@/lib/api';

// Background live-location reporter for the runner's OWN run. While a run is
// active, the OS wakes this task with location batches (even when the app is
// backgrounded or the screen is locked) and we forward the latest point to the
// /position Edge Function, tagged with the active run_id. Watchers see the
// breadcrumb trail update on Live. Stops the moment the run ends.

const TASK = 'watchmerun-location';
const RUN_KEY = 'wmr.active_run_id';

type LocationTaskData = { locations: Location.LocationObject[] };

// Defined at module load (required by expo-task-manager). Runs in a headless
// context when backgrounded; the supabase client re-reads its session from
// AsyncStorage, so postPosition still authenticates.
TaskManager.defineTask(TASK, async ({ data, error }: { data: unknown; error: unknown }) => {
  if (error) return;
  const runId = await AsyncStorage.getItem(RUN_KEY);
  if (!runId) return;
  const locs = (data as LocationTaskData | undefined)?.locations ?? [];
  const last = locs[locs.length - 1];
  if (!last) return;
  try {
    await postPosition(last.coords.latitude, last.coords.longitude, runId);
  } catch {
    // Best-effort: a dropped point is fine, the next one will land.
  }
});

/**
 * Begin reporting location for `runId`. Requests foreground permission (and
 * background, best-effort). Returns false if location can't be used so the
 * caller can surface it; a run still proceeds without live tracking.
 */
export async function startTracking(runId: string): Promise<boolean> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return false;
  // Background is best-effort — "While Using" still tracks with the app open.
  await Location.requestBackgroundPermissionsAsync().catch(() => undefined);

  await AsyncStorage.setItem(RUN_KEY, runId);

  const already = await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false);
  if (already) await Location.stopLocationUpdatesAsync(TASK).catch(() => undefined);

  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 15_000,
    distanceInterval: 20,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.Fitness,
    foregroundService: {
      notificationTitle: 'WatchMeRun',
      notificationBody: 'Sharing your live run with your crew',
    },
  });
  return true;
}

/** Stop reporting location (run ended). Safe to call when not tracking. */
export async function stopTracking(): Promise<void> {
  await AsyncStorage.removeItem(RUN_KEY);
  const started = await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(TASK).catch(() => undefined);
}
