import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { haversineDistance } from '@/utils/helpers';
import type { LatLng } from '@/store/types';

type LocationModule = typeof import('expo-location');
type NotificationsModule = typeof import('expo-notifications');

const ROUTE_POINT_MIN_DISTANCE_M = 15;

export interface PermissionState {
  foreground: 'granted' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
}

const initialPermissions: PermissionState = {
  foreground: 'undetermined',
  notifications: 'undetermined',
};

// ── Lazy loaders for native modules ─────────────────────────────────────────
// Kept lazy so a missing/broken native module cannot crash the hook on import.

async function loadLocation(): Promise<LocationModule | null> {
  try {
    return await import('expo-location');
  } catch (err) {
    console.warn('[LocationTracking] expo-location unavailable', err);
    return null;
  }
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  try {
    return await import('expo-notifications');
  } catch (err) {
    console.warn('[LocationTracking] expo-notifications unavailable', err);
    return null;
  }
}

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

async function safeNotify(title: string, body: string): Promise<void> {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // Ignore — notifications may not be granted
  }
}

/**
 * Manual trip tracking hook.
 *
 * The user explicitly starts and stops trips. While a trip is active and the
 * app is in the foreground, we watch GPS position and accumulate distance.
 *
 * Background location has been removed to isolate a native crash on Android.
 */
export function useLocationTracking() {
  const activeTrip = useAppStore((s) => s.activeTrip);

  const [permissions, setPermissions] = useState<PermissionState>(initialPermissions);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const foregroundWatchRef = useRef<{ remove: () => void } | null>(null);
  const mountedRef = useRef(true);
  const isTrackingRef = useRef(activeTrip.isTracking);

  useEffect(() => {
    isTrackingRef.current = activeTrip.isTracking;
  }, [activeTrip.isTracking]);

  // ── Permission handling ────────────────────────────────────────────────
  const requestPermissions = useCallback(async (): Promise<PermissionState> => {
    const next: PermissionState = { ...initialPermissions };

    const Location = await loadLocation();
    const Notifications = await loadNotifications();

    if (Location) {
      try {
        const fg = await Location.requestForegroundPermissionsAsync();
        next.foreground = fg.status as PermissionState['foreground'];
      } catch (err) {
        console.warn('[LocationTracking] foreground perm request failed', err);
        next.foreground = 'denied';
      }
    }

    if (Notifications) {
      try {
        const existing = await Notifications.getPermissionsAsync();
        if (existing.status === 'granted') {
          next.notifications = 'granted';
        } else {
          const req = await Notifications.requestPermissionsAsync();
          next.notifications = req.status as PermissionState['notifications'];
        }
      } catch (err) {
        console.warn('[LocationTracking] notifications perm request failed', err);
        next.notifications = 'denied';
      }
    }

    if (mountedRef.current) setPermissions(next);
    return next;
  }, []);

  // ── Location update processor ──────────────────────────────────────────
  const processLocation = useCallback(
    (latitude: number, longitude: number, speedKmh: number) => {
      const store = useAppStore.getState();
      const trip = store.activeTrip;
      if (!trip.isTracking) return;

      let addedDistance = 0;
      if (trip.lastPosition) {
        addedDistance =
          haversineDistance(
            trip.lastPosition.lat,
            trip.lastPosition.lng,
            latitude,
            longitude
          ) / 1000;
      }

      // Guard against GPS jitter — ignore absurd jumps
      if (addedDistance > 2) addedDistance = 0;

      const newDistance = trip.currentDistance + addedDistance;

      const lastRoute =
        trip.routePoints.length > 0
          ? trip.routePoints[trip.routePoints.length - 1]
          : null;
      if (
        !lastRoute ||
        haversineDistance(lastRoute.lat, lastRoute.lng, latitude, longitude) >=
          ROUTE_POINT_MIN_DISTANCE_M
      ) {
        store.addRoutePoint({ lat: latitude, lng: longitude });
      }

      store.updateActiveTrip({
        currentSpeed: speedKmh,
        currentDistance: newDistance,
        lastPosition: { lat: latitude, lng: longitude },
      });
    },
    []
  );

  // ── Foreground watcher lifecycle ───────────────────────────────────────
  const startForegroundWatcher = useCallback(async () => {
    if (foregroundWatchRef.current) return;
    const Location = await loadLocation();
    if (!Location) return;

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          try {
            const speedKmh = Math.max(0, (location.coords.speed ?? 0) * 3.6);
            processLocation(
              location.coords.latitude,
              location.coords.longitude,
              speedKmh
            );
          } catch (err) {
            console.warn('[LocationTracking] watcher callback threw', err);
          }
        }
      );
      foregroundWatchRef.current = sub;
    } catch (err) {
      console.warn('[LocationTracking] watchPositionAsync failed', err);
    }
  }, [processLocation]);

  const stopForegroundWatcher = useCallback(() => {
    try {
      foregroundWatchRef.current?.remove();
    } catch {
      // ignore
    }
    foregroundWatchRef.current = null;
  }, []);

  // ── Manual start/stop ──────────────────────────────────────────────────
  const startTrip = useCallback(async (): Promise<boolean> => {
    if (starting || isTrackingRef.current) return false;
    setStarting(true);
    try {
      const perms = await requestPermissions();
      if (perms.foreground !== 'granted') {
        return false;
      }

      const Location = await loadLocation();
      if (!Location) return false;

      let lat = 0;
      let lng = 0;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn('[LocationTracking] getCurrentPosition failed', err);
      }

      useAppStore.getState().startTrip(lat, lng);
      safeNotify('Trip started', 'MileageTrack is logging your journey').catch(() => {});

      if (Platform.OS !== 'web' || typeof navigator !== 'undefined') {
        await startForegroundWatcher();
      }
      return true;
    } catch (err) {
      console.warn('[LocationTracking] startTrip threw', err);
      return false;
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }, [requestPermissions, startForegroundWatcher, starting]);

  const stopTrip = useCallback(async (): Promise<boolean> => {
    if (stopping || !isTrackingRef.current) return false;
    setStopping(true);
    try {
      stopForegroundWatcher();

      const state = useAppStore.getState();
      const trip = state.activeTrip;
      const routePts = trip.routePoints;

      const startPt: LatLng | null =
        routePts.length > 0 ? routePts[0] : trip.lastPosition;
      const endPt: LatLng | null =
        routePts.length > 0
          ? routePts[routePts.length - 1]
          : trip.lastPosition;

      const [startSuburb, endSuburb] = await Promise.all([
        startPt
          ? reverseGeocodeSuburb(startPt.lat, startPt.lng)
          : Promise.resolve('Unknown'),
        endPt
          ? reverseGeocodeSuburb(endPt.lat, endPt.lng)
          : Promise.resolve('Unknown'),
      ]);

      const unit = state.settings.distanceUnit;
      const distanceKm = trip.currentDistance;
      state.endTrip(startSuburb, endSuburb);

      const display =
        unit === 'miles'
          ? `${(distanceKm * 0.621371).toFixed(1)} mi`
          : `${distanceKm.toFixed(1)} km`;
      safeNotify('Trip ended', `${display} logged`).catch(() => {});
      return true;
    } catch (err) {
      console.warn('[LocationTracking] stopTrip threw', err);
      return false;
    } finally {
      if (mountedRef.current) setStopping(false);
    }
  }, [stopForegroundWatcher, stopping]);

  // ── Lifecycle: pause watcher when app is backgrounded, resume on foreground ──
  useEffect(() => {
    mountedRef.current = true;

    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (!isTrackingRef.current) return;
        if (nextState === 'active') {
          startForegroundWatcher().catch(() => {});
        } else if (nextState === 'background' || nextState === 'inactive') {
          stopForegroundWatcher();
        }
      }
    );

    return () => {
      mountedRef.current = false;
      try {
        appStateSub.remove();
      } catch {
        // ignore
      }
      stopForegroundWatcher();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume the watcher if we have an active trip but no subscription (e.g. app
  // remount, fast refresh during dev).
  useEffect(() => {
    if (activeTrip.isTracking && !foregroundWatchRef.current) {
      startForegroundWatcher().catch(() => {});
    } else if (!activeTrip.isTracking && foregroundWatchRef.current) {
      stopForegroundWatcher();
    }
  }, [activeTrip.isTracking, startForegroundWatcher, stopForegroundWatcher]);

  return {
    activeTrip,
    isTracking: activeTrip.isTracking,
    permissions,
    starting,
    stopping,
    startTrip,
    stopTrip,
    requestPermissions,
  };
}
