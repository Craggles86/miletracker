import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import {
  processLocationUpdate,
  startBackgroundLocationUpdates,
  stopBackgroundLocationUpdates,
  isBackgroundTaskRegistered,
} from '@/utils/background-location-task';

type LocationModule = typeof import('expo-location');
type NotificationsModule = typeof import('expo-notifications');

export interface PermissionState {
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
}

const initialPermissions: PermissionState = {
  foreground: 'undetermined',
  background: 'undetermined',
  notifications: 'undetermined',
};

/**
 * Hook that drives the MileageTrack location tracking engine.
 *
 * - On native: registers the background location task so trips are tracked
 *   even when the app is fully closed. Falls back to a foreground watcher
 *   while the app is active to update the UI more smoothly.
 * - On web: uses `watchPositionAsync` only. Background tracking isn't
 *   supported on the web; feature gates keep the code safe.
 */
export function useLocationTracking() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const [permissions, setPermissions] = useState<PermissionState>(initialPermissions);
  const [backgroundActive, setBackgroundActive] = useState(false);

  const locationModuleRef = useRef<LocationModule | null>(null);
  const notificationsModuleRef = useRef<NotificationsModule | null>(null);
  const foregroundWatchRef = useRef<{ remove: () => void } | null>(null);
  const mountedRef = useRef(true);

  // ── Module loaders ──────────────────────────────────────────────────────
  const getLocation = useCallback(async (): Promise<LocationModule | null> => {
    if (locationModuleRef.current) return locationModuleRef.current;
    try {
      const mod = await import('expo-location');
      locationModuleRef.current = mod;
      return mod;
    } catch {
      return null;
    }
  }, []);

  const getNotifications = useCallback(async (): Promise<NotificationsModule | null> => {
    if (notificationsModuleRef.current) return notificationsModuleRef.current;
    try {
      const mod = await import('expo-notifications');
      notificationsModuleRef.current = mod;
      return mod;
    } catch {
      return null;
    }
  }, []);

  // ── Permission handling ────────────────────────────────────────────────
  const requestPermissions = useCallback(async (): Promise<PermissionState> => {
    const Location = await getLocation();
    const Notifications = await getNotifications();

    const next: PermissionState = { ...initialPermissions };

    if (Location) {
      try {
        const fg = await Location.requestForegroundPermissionsAsync();
        next.foreground = fg.status as PermissionState['foreground'];

        if (fg.status === 'granted' && Platform.OS !== 'web') {
          const bg = await Location.requestBackgroundPermissionsAsync();
          next.background = bg.status as PermissionState['background'];
        } else {
          next.background = fg.status === 'granted' ? 'undetermined' : 'denied';
        }
      } catch {
        next.foreground = 'denied';
        next.background = 'denied';
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
      } catch {
        next.notifications = 'denied';
      }
    }

    if (mountedRef.current) setPermissions(next);
    return next;
  }, [getLocation, getNotifications]);

  // ── Foreground watcher (UI refresh while app is visible) ───────────────
  const startForegroundWatcher = useCallback(async () => {
    if (foregroundWatchRef.current) return;
    const Location = await getLocation();
    if (!Location) return;

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          const speedKmh = Math.max(0, (location.coords.speed ?? 0) * 3.6);
          processLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            speedKmh,
            timestamp: location.timestamp,
          }).catch(() => {});
        }
      );
      foregroundWatchRef.current = sub;
    } catch (err) {
      console.warn('[LocationTracking] watchPositionAsync failed', err);
    }
  }, [getLocation]);

  const stopForegroundWatcher = useCallback(() => {
    foregroundWatchRef.current?.remove();
    foregroundWatchRef.current = null;
  }, []);

  // ── Background task control ────────────────────────────────────────────
  const ensureBackgroundRunning = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    const ok = await startBackgroundLocationUpdates();
    if (mountedRef.current) setBackgroundActive(ok);
    return ok;
  }, []);

  const stopBackground = useCallback(async () => {
    if (Platform.OS === 'web') return;
    await stopBackgroundLocationUpdates();
    if (mountedRef.current) setBackgroundActive(false);
  }, []);

  // ── Public start/stop (called by UI or auto-start on mount) ────────────
  const startMonitoring = useCallback(async () => {
    const perms = await requestPermissions();
    if (perms.foreground !== 'granted') return false;

    // Web: foreground only
    if (Platform.OS === 'web') {
      await startForegroundWatcher();
      return true;
    }

    // Native: start the background task so the trip keeps tracking when
    // the app is backgrounded/killed. If background permission is denied
    // we fall back to a foreground-only watcher.
    if (perms.background === 'granted') {
      await ensureBackgroundRunning();
    }
    await startForegroundWatcher();
    return true;
  }, [requestPermissions, startForegroundWatcher, ensureBackgroundRunning]);

  const stopMonitoring = useCallback(async () => {
    stopForegroundWatcher();
    await stopBackground();
  }, [stopForegroundWatcher, stopBackground]);

  // ── Lifecycle: auto-start on mount, reconcile on foreground ────────────
  useEffect(() => {
    mountedRef.current = true;
    // Defensive: never allow startMonitoring to throw synchronously —
    // permission APIs can reject unexpectedly on first launch and we don't
    // want to crash the root component tree.
    try {
      startMonitoring().catch((err) => {
        console.warn('[LocationTracking] startMonitoring failed', err);
      });
    } catch (err) {
      console.warn('[LocationTracking] startMonitoring threw', err);
    }

    // If the background task is already registered (e.g. app was killed and
    // the OS relaunched us), sync the indicator state so the UI is accurate.
    isBackgroundTaskRegistered()
      .then((registered) => {
        if (registered && mountedRef.current) setBackgroundActive(true);
      })
      .catch(() => {});

    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          // Re-attach foreground watcher when returning to the app. The
          // background task keeps running independently.
          startForegroundWatcher().catch(() => {});
          // Rehydrate the zustand store so any trips persisted by the
          // background task show up immediately.
          const persist = (useAppStore as unknown as {
            persist?: { rehydrate?: () => Promise<void> };
          }).persist;
          persist?.rehydrate?.().catch(() => {});
        } else if (nextState === 'background' || nextState === 'inactive') {
          // Release the foreground watcher — the background task continues.
          stopForegroundWatcher();
        }
      }
    );

    return () => {
      mountedRef.current = false;
      appStateSub.remove();
      stopForegroundWatcher();
      // Intentionally do NOT stop the background task on unmount — it must
      // keep running when the app is backgrounded or closed.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeTrip,
    isTracking: activeTrip.isTracking,
    permissions,
    backgroundActive,
    startMonitoring,
    stopMonitoring,
    requestPermissions,
  };
}
