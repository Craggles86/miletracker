/**
 * Background location task for MileageTrack.
 *
 * Registered at module load time (imported by the root layout) so the task
 * is available whenever the OS wakes the app to deliver a location update —
 * even if the JS app was fully killed.
 *
 * Web is unsupported — expo-task-manager is native-only. All module-level
 * side effects are gated by Platform.OS.
 */

import { Platform } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { haversineDistance } from '@/utils/helpers';
import type { LatLng } from '@/store/types';

export const BACKGROUND_LOCATION_TASK = 'mileagetrack-background-location';

const SPEED_START_THRESHOLD_KMH = 10;
const SPEED_STATIONARY_THRESHOLD_KMH = 5;
const STATIONARY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STATIONARY_RADIUS_M = 20;
const ROUTE_POINT_MIN_DISTANCE_M = 15;

// ── Lazy loaders ────────────────────────────────────────────────────────────

type TaskManagerModule = typeof import('expo-task-manager');
type LocationModule = typeof import('expo-location');
type NotificationsModule = typeof import('expo-notifications');

let _taskManager: TaskManagerModule | null = null;
let _location: LocationModule | null = null;
let _notifications: NotificationsModule | null = null;

async function loadTaskManager(): Promise<TaskManagerModule | null> {
  if (Platform.OS === 'web') return null;
  if (_taskManager) return _taskManager;
  try {
    _taskManager = await import('expo-task-manager');
    return _taskManager;
  } catch {
    return null;
  }
}

async function loadLocation(): Promise<LocationModule | null> {
  if (_location) return _location;
  try {
    _location = await import('expo-location');
    return _location;
  } catch {
    return null;
  }
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (_notifications) return _notifications;
  try {
    _notifications = await import('expo-notifications');
    return _notifications;
  } catch {
    return null;
  }
}

// ── Hydration helper ────────────────────────────────────────────────────────
// When the OS wakes the app, zustand's persist middleware rehydrates
// asynchronously. We must wait for hydration before reading/writing state,
// otherwise we would operate on the default (empty) state and overwrite
// the persisted trips.

async function waitForHydration(): Promise<void> {
  const persist = (useAppStore as unknown as {
    persist?: {
      hasHydrated?: () => boolean;
      onFinishHydration?: (cb: () => void) => () => void;
      rehydrate?: () => Promise<void>;
    };
  }).persist;

  if (!persist) return;
  if (persist.hasHydrated?.()) return;

  await new Promise<void>((resolve) => {
    const unsub = persist.onFinishHydration?.(() => {
      unsub?.();
      resolve();
    });
    // Trigger rehydration in case it wasn't started
    persist.rehydrate?.().then(() => resolve()).catch(() => resolve());
  });
}

// ── Reverse geocoding helper ────────────────────────────────────────────────

async function reverseGeocodeSuburb(lat: number, lng: number): Promise<string> {
  try {
    const Location = await loadLocation();
    if (!Location) return 'Unknown';
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
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
    // Geocoding can fail silently
  }
  return 'Unknown';
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function notifyTripStarted(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Trip started',
        body: 'MileageTrack is logging your journey',
      },
      trigger: null,
    });
  } catch {
    // Swallow — notifications may be denied
  }
}

export async function notifyTripEnded(distanceKm: number, unit: 'km' | 'miles' = 'km'): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    const display =
      unit === 'miles'
        ? `${(distanceKm * 0.621371).toFixed(1)} mi`
        : `${distanceKm.toFixed(1)} km`;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Trip ended',
        body: `${display} logged`,
      },
      trigger: null,
    });
  } catch {
    // Swallow
  }
}

// ── Core location processor ─────────────────────────────────────────────────
// Called by both the background task and the foreground watcher so behaviour
// stays in sync across app states.

export interface ProcessedLocation {
  latitude: number;
  longitude: number;
  speedKmh: number;
  timestamp: number;
}

export async function processLocationUpdate(loc: ProcessedLocation): Promise<void> {
  await waitForHydration();

  const { latitude, longitude, speedKmh } = loc;
  const state = useAppStore.getState();
  const trip = state.activeTrip;

  // ── Not tracking → auto-start when moving fast enough ──
  if (!trip.isTracking) {
    if (speedKmh >= SPEED_START_THRESHOLD_KMH) {
      state.startTrip(latitude, longitude);
      state.updateActiveTrip({ currentSpeed: speedKmh });
      // Fire-and-forget notification
      notifyTripStarted().catch(() => {});
    }
    return;
  }

  // ── Tracking → update distance, route, stationary detection ──
  let addedDistance = 0;
  if (trip.lastPosition) {
    addedDistance =
      haversineDistance(trip.lastPosition.lat, trip.lastPosition.lng, latitude, longitude) /
      1000;
  }

  // Guard against GPS jitter — ignore absurd jumps
  if (addedDistance > 2 /* km in one sample */) {
    addedDistance = 0;
  }

  const newDistance = trip.currentDistance + addedDistance;

  // Append route point if moved enough
  const lastRoutePoint =
    trip.routePoints.length > 0 ? trip.routePoints[trip.routePoints.length - 1] : null;
  if (
    !lastRoutePoint ||
    haversineDistance(lastRoutePoint.lat, lastRoutePoint.lng, latitude, longitude) >=
      ROUTE_POINT_MIN_DISTANCE_M
  ) {
    state.addRoutePoint({ lat: latitude, lng: longitude });
  }

  // Stationary detection — use the stored anchor, fall back to last position
  const stationaryAnchor: LatLng | null = trip.stationaryPosition ?? trip.lastPosition;
  const distToAnchor = stationaryAnchor
    ? haversineDistance(stationaryAnchor.lat, stationaryAnchor.lng, latitude, longitude)
    : Infinity;

  const isStationary =
    distToAnchor < STATIONARY_RADIUS_M && speedKmh < SPEED_STATIONARY_THRESHOLD_KMH;

  if (isStationary) {
    const stationaryStart = trip.stationaryStartTime ?? new Date().toISOString();
    const stationaryPos = trip.stationaryPosition ?? { lat: latitude, lng: longitude };
    const elapsed = Date.now() - new Date(stationaryStart).getTime();

    if (elapsed >= STATIONARY_TIMEOUT_MS) {
      // ── Auto-end the trip ──
      // Ensure the latest distance is persisted before reading it in endTrip.
      state.updateActiveTrip({
        currentSpeed: speedKmh,
        currentDistance: newDistance,
      });

      const routePts = useAppStore.getState().activeTrip.routePoints;
      const startPt = routePts.length > 0 ? routePts[0] : { lat: latitude, lng: longitude };
      const endPt = routePts.length > 0 ? routePts[routePts.length - 1] : { lat: latitude, lng: longitude };

      const [startSuburb, endSuburb] = await Promise.all([
        reverseGeocodeSuburb(startPt.lat, startPt.lng),
        reverseGeocodeSuburb(endPt.lat, endPt.lng),
      ]);

      const unit = useAppStore.getState().settings.distanceUnit;
      useAppStore.getState().endTrip(startSuburb, endSuburb);
      notifyTripEnded(newDistance, unit).catch(() => {});
      return;
    }

    state.updateActiveTrip({
      currentSpeed: speedKmh,
      currentDistance: newDistance,
      stationaryStartTime: stationaryStart,
      stationaryPosition: stationaryPos,
    });
  } else {
    state.updateActiveTrip({
      currentSpeed: speedKmh,
      currentDistance: newDistance,
      lastPosition: { lat: latitude, lng: longitude },
      stationaryStartTime: null,
      stationaryPosition: null,
    });
  }
}

// ── Task registration (module-level) ────────────────────────────────────────
// MUST run synchronously at module load so the task is defined before the
// OS delivers a background location event.

type LocationTaskBody = {
  data?: {
    locations?: {
      coords: {
        latitude: number;
        longitude: number;
        speed: number | null;
        accuracy: number | null;
      };
      timestamp: number;
    }[];
  };
  error?: { message?: string } | null;
};

let _defined = false;

export function defineBackgroundLocationTask(): void {
  if (_defined) return;
  if (Platform.OS === 'web') return;

  // Synchronous require is required here — defineTask must be called at
  // module load, before the runtime delivers any deferred task events.
  let TaskManager: TaskManagerModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    TaskManager = require('expo-task-manager') as TaskManagerModule;
  } catch {
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async (body: LocationTaskBody) => {
    if (body.error) {
      console.warn('[BackgroundLocation] task error', body.error);
      return;
    }

    const locations = body.data?.locations ?? [];
    if (locations.length === 0) return;

    for (const sample of locations) {
      const speedKmh = Math.max(0, (sample.coords.speed ?? 0) * 3.6);
      try {
        await processLocationUpdate({
          latitude: sample.coords.latitude,
          longitude: sample.coords.longitude,
          speedKmh,
          timestamp: sample.timestamp,
        });
      } catch (err) {
        console.warn('[BackgroundLocation] processing error', err);
      }
    }
  });

  _defined = true;
}

// Register on import. Safe no-op on web. Wrapped so that any unexpected
// failure here (e.g. native module mis-link) cannot crash the JS bundle
// at load time.
try {
  defineBackgroundLocationTask();
} catch (err) {
  console.warn('[BackgroundLocation] define failed', err);
}

// ── Public helpers for starting/stopping the task ───────────────────────────

export async function isBackgroundTaskRegistered(): Promise<boolean> {
  const TaskManager = await loadTaskManager();
  if (!TaskManager) return false;
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startBackgroundLocationUpdates(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const Location = await loadLocation();
  const TaskManager = await loadTaskManager();
  if (!Location || !TaskManager) return false;

  try {
    const already = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (already) {
      const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isRunning) return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 3000,
      distanceInterval: 10,
      deferredUpdatesInterval: 5000,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      foregroundService: {
        notificationTitle: 'MileageTrack is tracking your trip',
        notificationBody: 'Location is being used to log your mileage',
        notificationColor: '#4F46E5',
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch (err) {
    console.warn('[BackgroundLocation] failed to start updates', err);
    return false;
  }
}

export async function stopBackgroundLocationUpdates(): Promise<void> {
  if (Platform.OS === 'web') return;
  const Location = await loadLocation();
  if (!Location) return;
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (running) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    console.warn('[BackgroundLocation] failed to stop updates', err);
  }
}
