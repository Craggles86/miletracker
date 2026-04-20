/**
 * Background location task for MileageTrack.
 *
 * Every entry point is wrapped in layered try/catch + Platform gates so that
 * missing native modules, denied permissions, or OS-level failures can never
 * crash the JS bundle. The worst case is that background tracking silently
 * does nothing.
 *
 * Web: entirely no-op — expo-task-manager and expo-location background APIs
 * are native-only.
 */

import { Platform } from 'react-native';
import { haversineDistance } from '@/utils/helpers';
import type { LatLng } from '@/store/types';

export const BACKGROUND_LOCATION_TASK = 'mileagetrack-background-location';

const SPEED_START_THRESHOLD_KMH = 10;
const SPEED_STATIONARY_THRESHOLD_KMH = 5;
const STATIONARY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STATIONARY_RADIUS_M = 20;
const ROUTE_POINT_MIN_DISTANCE_M = 15;

// ── Lazy loaders ────────────────────────────────────────────────────────────
// NOTE: We deliberately avoid a top-level `import` of expo-location /
// expo-notifications / expo-task-manager so that any native link failure
// cannot abort the initial JS bundle evaluation and crash the app.

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
  } catch (err) {
    console.warn('[BackgroundLocation] expo-task-manager unavailable', err);
    return null;
  }
}

async function loadLocation(): Promise<LocationModule | null> {
  if (_location) return _location;
  try {
    _location = await import('expo-location');
    return _location;
  } catch (err) {
    console.warn('[BackgroundLocation] expo-location unavailable', err);
    return null;
  }
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (_notifications) return _notifications;
  try {
    _notifications = await import('expo-notifications');
    return _notifications;
  } catch (err) {
    console.warn('[BackgroundLocation] expo-notifications unavailable', err);
    return null;
  }
}

// ── Zustand store loader ───────────────────────────────────────────────────
// Lazy-load the store to break any chance of a circular import when the task
// module is imported early during bundle evaluation (the store imports
// helpers, which are also imported here).

type AppStoreLike = {
  getState: () => {
    activeTrip: {
      isTracking: boolean;
      currentDistance: number;
      lastPosition: LatLng | null;
      routePoints: LatLng[];
      stationaryStartTime: string | null;
      stationaryPosition: LatLng | null;
    };
    settings: { distanceUnit: 'km' | 'miles' };
    startTrip: (lat: number, lng: number) => void;
    updateActiveTrip: (updates: Partial<{
      currentSpeed: number;
      currentDistance: number;
      lastPosition: LatLng | null;
      stationaryStartTime: string | null;
      stationaryPosition: LatLng | null;
    }>) => void;
    addRoutePoint: (point: LatLng) => void;
    endTrip: (startSuburb: string, endSuburb: string) => void;
  };
  persist?: {
    hasHydrated?: () => boolean;
    onFinishHydration?: (cb: () => void) => () => void;
    rehydrate?: () => Promise<void>;
  };
};

async function loadStore(): Promise<AppStoreLike | null> {
  try {
    const mod = await import('@/store/useAppStore');
    return mod.useAppStore as unknown as AppStoreLike;
  } catch (err) {
    console.warn('[BackgroundLocation] store unavailable', err);
    return null;
  }
}

async function waitForHydration(store: AppStoreLike): Promise<void> {
  const persist = store.persist;
  if (!persist) return;
  if (persist.hasHydrated?.()) return;

  await new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    try {
      const unsub = persist.onFinishHydration?.(() => {
        try { unsub?.(); } catch { /* ignore */ }
        finish();
      });
      persist.rehydrate?.().then(finish).catch(finish);
    } catch {
      finish();
    }
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
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
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

export async function notifyTripEnded(
  distanceKm: number,
  unit: 'km' | 'miles' = 'km'
): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
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

export interface ProcessedLocation {
  latitude: number;
  longitude: number;
  speedKmh: number;
  timestamp: number;
}

export async function processLocationUpdate(loc: ProcessedLocation): Promise<void> {
  const store = await loadStore();
  if (!store) return;

  try {
    await waitForHydration(store);
  } catch {
    // ignore — proceed with whatever state is available
  }

  const { latitude, longitude, speedKmh } = loc;
  const state = store.getState();
  const trip = state.activeTrip;

  // ── Not tracking → auto-start when moving fast enough ──
  if (!trip.isTracking) {
    if (speedKmh >= SPEED_START_THRESHOLD_KMH) {
      state.startTrip(latitude, longitude);
      state.updateActiveTrip({ currentSpeed: speedKmh });
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

  const lastRoutePoint =
    trip.routePoints.length > 0 ? trip.routePoints[trip.routePoints.length - 1] : null;
  if (
    !lastRoutePoint ||
    haversineDistance(lastRoutePoint.lat, lastRoutePoint.lng, latitude, longitude) >=
      ROUTE_POINT_MIN_DISTANCE_M
  ) {
    state.addRoutePoint({ lat: latitude, lng: longitude });
  }

  const stationaryAnchor: LatLng | null =
    trip.stationaryPosition ?? trip.lastPosition;
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
      state.updateActiveTrip({
        currentSpeed: speedKmh,
        currentDistance: newDistance,
      });

      const routePts = store.getState().activeTrip.routePoints;
      const startPt =
        routePts.length > 0 ? routePts[0] : { lat: latitude, lng: longitude };
      const endPt =
        routePts.length > 0
          ? routePts[routePts.length - 1]
          : { lat: latitude, lng: longitude };

      const [startSuburb, endSuburb] = await Promise.all([
        reverseGeocodeSuburb(startPt.lat, startPt.lng),
        reverseGeocodeSuburb(endPt.lat, endPt.lng),
      ]);

      const unit = store.getState().settings.distanceUnit;
      store.getState().endTrip(startSuburb, endSuburb);
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

// ── Task registration ───────────────────────────────────────────────────────
// Must be called BEFORE the OS delivers any deferred task event. This is now
// invoked from the app's entry (index.js / expo-router root) rather than from
// React components. It is fully fire-and-forget: any failure is swallowed.

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
  if (Platform.OS === 'web') {
    _defined = true;
    return;
  }

  let TaskManager: TaskManagerModule | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    TaskManager = require('expo-task-manager') as TaskManagerModule;
  } catch (err) {
    console.warn('[BackgroundLocation] defineTask skipped (module load failed)', err);
    _defined = true; // don't retry — the module isn't available on this build
    return;
  }

  try {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async (body: LocationTaskBody) => {
      try {
        if (body.error) {
          console.warn('[BackgroundLocation] task error', body.error);
          return;
        }

        const locations = body.data?.locations ?? [];
        if (locations.length === 0) return;

        for (const sample of locations) {
          try {
            const speedKmh = Math.max(0, (sample.coords.speed ?? 0) * 3.6);
            await processLocationUpdate({
              latitude: sample.coords.latitude,
              longitude: sample.coords.longitude,
              speedKmh,
              timestamp: sample.timestamp,
            });
          } catch (innerErr) {
            console.warn('[BackgroundLocation] processing error', innerErr);
          }
        }
      } catch (outerErr) {
        // Never allow an error in the task handler to bubble out — the OS
        // treats an unhandled rejection as a crash signal.
        console.warn('[BackgroundLocation] task handler crashed', outerErr);
      }
    });
    _defined = true;
  } catch (err) {
    console.warn('[BackgroundLocation] defineTask threw', err);
    _defined = true;
  }
}

// ── Public helpers for starting/stopping the task ───────────────────────────

export async function isBackgroundTaskRegistered(): Promise<boolean> {
  try {
    const TaskManager = await loadTaskManager();
    if (!TaskManager) return false;
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startBackgroundLocationUpdates(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    // Ensure the task is defined before we try to start it. Safe no-op if
    // already defined.
    defineBackgroundLocationTask();

    const Location = await loadLocation();
    const TaskManager = await loadTaskManager();
    if (!Location || !TaskManager) return false;

    try {
      const already = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (already) {
        const isRunning = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_LOCATION_TASK
        );
        if (isRunning) return true;
      }
    } catch {
      // If we can't check, try to start anyway — starting is idempotent.
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
  try {
    const Location = await loadLocation();
    if (!Location) return;
    const running = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    );
    if (running) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (err) {
    console.warn('[BackgroundLocation] failed to stop updates', err);
  }
}
