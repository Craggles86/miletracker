/**
 * Safe runtime helpers for background GPS trip tracking.
 *
 * All native calls live here and are wrapped in try/catch so a failure in any
 * of them can never crash the app. The `locationTask` module registers the
 * TaskManager handler at the top level — this file only controls
 * enable/disable, permission checks, and syncing of completed trips into the
 * Zustand store.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LatLng, Trip } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { getWeekId, isWithinBusinessHours } from '@/utils/helpers';

// Pull in the task-module constants. The module registers the TaskManager
// task as a side-effect at top level (see `/tasks/locationTask.js`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TaskConsts = require('@/tasks/locationTask') as {
  LOCATION_TASK_NAME: string;
  STORAGE_KEY_STATE: string;
  STORAGE_KEY_PENDING: string;
  STORAGE_KEY_ENABLED: string;
  isRegistered: () => boolean;
};

export const {
  LOCATION_TASK_NAME,
  STORAGE_KEY_STATE,
  STORAGE_KEY_PENDING,
  STORAGE_KEY_ENABLED,
} = TaskConsts;

export interface PendingBackgroundTrip {
  id: string;
  startTime: string;
  endTime: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distanceKm: number;
  duration: number;
  routePoints: LatLng[];
  source: 'background';
}

type LocationModule = typeof import('expo-location');
type TaskManagerModule = typeof import('expo-task-manager');

async function loadLocation(): Promise<LocationModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-location');
  } catch (err) {
    console.warn('[bgTracking] expo-location unavailable', err);
    return null;
  }
}

async function loadTaskManager(): Promise<TaskManagerModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-task-manager');
  } catch (err) {
    console.warn('[bgTracking] expo-task-manager unavailable', err);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Permission helpers
// ────────────────────────────────────────────────────────────────────────────

export interface BackgroundPermissionResult {
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
}

export async function requestBackgroundPermissions(): Promise<BackgroundPermissionResult> {
  const result: BackgroundPermissionResult = {
    foreground: 'undetermined',
    background: 'undetermined',
  };

  const Location = await loadLocation();
  if (!Location) return result;

  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    result.foreground = fg.status as BackgroundPermissionResult['foreground'];
    if (fg.status !== 'granted') return result;
  } catch (err) {
    console.warn('[bgTracking] foreground permission request failed', err);
    result.foreground = 'denied';
    return result;
  }

  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    result.background = bg.status as BackgroundPermissionResult['background'];
  } catch (err) {
    console.warn('[bgTracking] background permission request failed', err);
    result.background = 'denied';
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Enable / disable
// ────────────────────────────────────────────────────────────────────────────

export async function isBackgroundTrackingActive(): Promise<boolean> {
  const Location = await loadLocation();
  if (!Location) return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (err) {
    console.warn('[bgTracking] hasStartedLocationUpdatesAsync failed', err);
    return false;
  }
}

export async function enableBackgroundTracking(): Promise<{
  ok: boolean;
  reason?: 'unsupported' | 'permission' | 'error';
}> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  if (!TaskConsts.isRegistered()) {
    console.warn('[bgTracking] task not registered — skipping enable');
    return { ok: false, reason: 'unsupported' };
  }

  const Location = await loadLocation();
  if (!Location) return { ok: false, reason: 'unsupported' };

  const perms = await requestBackgroundPermissions();
  if (perms.foreground !== 'granted' || perms.background !== 'granted') {
    return { ok: false, reason: 'permission' };
  }

  try {
    const already = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    if (already) {
      await AsyncStorage.setItem(STORAGE_KEY_ENABLED, '1');
      return { ok: true };
    }
  } catch {
    // fall through to start
  }

  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 25,
      deferredUpdatesInterval: 10000,
      deferredUpdatesDistance: 50,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: 'MileageTrack is tracking your trips',
        notificationBody:
          'Automatic trip detection is running. Tap to open the app.',
        notificationColor: '#4F46E5',
      },
    });
    await AsyncStorage.setItem(STORAGE_KEY_ENABLED, '1');
    return { ok: true };
  } catch (err) {
    console.warn('[bgTracking] startLocationUpdatesAsync failed', err);
    return { ok: false, reason: 'error' };
  }
}

export async function disableBackgroundTracking(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_ENABLED, '0');
  } catch {
    // ignore
  }

  const Location = await loadLocation();
  if (!Location) return;

  try {
    const started = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    if (started) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.warn('[bgTracking] stopLocationUpdatesAsync failed', err);
  }

  // Best effort — also unregister the task on clean disable.
  const TaskManager = await loadTaskManager();
  if (TaskManager) {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(
        LOCATION_TASK_NAME
      );
      // We don't actually unregister (defineTask is top-level and must stay
      // registered for the next session) — just verify state for logging.
      if (!isTaskRegistered) {
        console.warn('[bgTracking] task no longer registered after disable');
      }
    } catch {
      // ignore
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Syncing pending trips (written by the background task) into the store.
// ────────────────────────────────────────────────────────────────────────────

async function reverseGeocodeSuburb(lat: number, lng: number): Promise<string> {
  const Location = await loadLocation();
  if (!Location) return 'Unknown';
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    if (results.length > 0) {
      return (
        results[0].subregion ||
        results[0].city ||
        results[0].district ||
        results[0].region ||
        'Unknown'
      );
    }
  } catch {
    // fall through
  }
  return 'Unknown';
}

export async function syncPendingBackgroundTrips(): Promise<number> {
  let pending: PendingBackgroundTrip[] = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_PENDING);
    if (raw) pending = JSON.parse(raw) as PendingBackgroundTrip[];
  } catch (err) {
    console.warn('[bgTracking] failed to read pending trips', err);
    return 0;
  }

  if (!Array.isArray(pending) || pending.length === 0) return 0;

  const state = useAppStore.getState();
  const existingIds = new Set(state.trips.map((t) => t.id));
  let imported = 0;

  for (const p of pending) {
    if (!p || existingIds.has(p.id)) continue;
    if (p.distanceKm < 0.1) continue; // skip noise

    try {
      const [startSuburb, endSuburb] = await Promise.all([
        reverseGeocodeSuburb(p.startLat, p.startLng),
        reverseGeocodeSuburb(p.endLat, p.endLng),
      ]);

      const isBusiness =
        state.settings.logAllAsBusiness ||
        isWithinBusinessHours(state.settings.businessHoursPerDay);

      const trip: Omit<Trip, 'id' | 'createdAt'> = {
        startTime: p.startTime,
        endTime: p.endTime,
        startSuburb,
        endSuburb,
        distance: p.distanceKm,
        rawDistance: p.distanceKm,
        duration: p.duration,
        purpose: isBusiness ? 'Business' : 'Personal',
        routePoints: Array.isArray(p.routePoints) ? p.routePoints : [],
        weekId: getWeekId(new Date(p.startTime)),
        scalingFactor: 1.0,
      };
      state.addTrip(trip);
      imported += 1;
    } catch (err) {
      console.warn('[bgTracking] failed to import pending trip', err);
    }
  }

  try {
    await AsyncStorage.removeItem(STORAGE_KEY_PENDING);
  } catch {
    // ignore
  }

  return imported;
}

export async function wasBackgroundTrackingEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_ENABLED);
    return val === '1';
  } catch {
    return false;
  }
}
