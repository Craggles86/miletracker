import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useAppStore } from '@/store/useAppStore';

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

async function safeProcessLocationUpdate(
  args: {
    latitude: number;
    longitude: number;
    speedKmh: number;
    timestamp: number;
  }
): Promise<void> {
  try {
    const mod = await import('@/utils/background-location-task');
    await mod.processLocationUpdate(args);
  } catch (err) {
    console.warn('[LocationTracking] processLocationUpdate failed', err);
  }
}

async function safeStartBackground(): Promise<boolean> {
  try {
    const mod = await import('@/utils/background-location-task');
    return await mod.startBackgroundLocationUpdates();
  } catch (err) {
    console.warn('[LocationTracking] background start failed', err);
    return false;
  }
}

async function safeStopBackground(): Promise<void> {
  try {
    const mod = await import('@/utils/background-location-task');
    await mod.stopBackgroundLocationUpdates();
  } catch (err) {
    console.warn('[LocationTracking] background stop failed', err);
  }
}

async function safeIsBackgroundRegistered(): Promise<boolean> {
  try {
    const mod = await import('@/utils/background-location-task');
    return await mod.isBackgroundTaskRegistered();
  } catch {
    return false;
  }
}

/**
 * Hook that drives MileageTrack's location tracking engine.
 *
 * Tracking is **opt-in**: nothing happens unless `settings.trackingEnabled`
 * is true. This prevents permission requests from blocking first launch, and
 * makes crashes in location code impossible on a fresh install.
 *
 * - Native: foreground watcher + background task (if permission granted).
 *   Background permission denial falls back to foreground-only.
 * - Web: foreground watcher only.
 */
export function useLocationTracking() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const trackingEnabled = useAppStore((s) => s.settings.trackingEnabled);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [permissions, setPermissions] = useState<PermissionState>(initialPermissions);
  const [backgroundActive, setBackgroundActive] = useState(false);

  const foregroundWatchRef = useRef<{ remove: () => void } | null>(null);
  const mountedRef = useRef(true);

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

      if (next.foreground === 'granted' && Platform.OS !== 'web') {
        try {
          const bg = await Location.requestBackgroundPermissionsAsync();
          next.background = bg.status as PermissionState['background'];
        } catch (err) {
          // Background permission can throw on Android if the user hasn't
          // granted "Allow all the time" — treat as denied and carry on with
          // foreground-only tracking.
          console.warn('[LocationTracking] background perm request failed', err);
          next.background = 'denied';
        }
      } else {
        next.background =
          next.foreground === 'granted' ? 'undetermined' : 'denied';
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

  // ── Foreground watcher ─────────────────────────────────────────────────
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
            safeProcessLocationUpdate({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              speedKmh,
              timestamp: location.timestamp,
            });
          } catch (err) {
            console.warn('[LocationTracking] watcher callback threw', err);
          }
        }
      );
      foregroundWatchRef.current = sub;
    } catch (err) {
      console.warn('[LocationTracking] watchPositionAsync failed', err);
    }
  }, []);

  const stopForegroundWatcher = useCallback(() => {
    try {
      foregroundWatchRef.current?.remove();
    } catch {
      // ignore
    }
    foregroundWatchRef.current = null;
  }, []);

  // ── Public start/stop (called by UI when user toggles tracking) ────────
  const startMonitoring = useCallback(async () => {
    try {
      const perms = await requestPermissions();
      if (perms.foreground !== 'granted') return false;

      if (Platform.OS === 'web') {
        await startForegroundWatcher();
        return true;
      }

      if (perms.background === 'granted') {
        const ok = await safeStartBackground();
        if (mountedRef.current) setBackgroundActive(ok);
      }

      await startForegroundWatcher();
      return true;
    } catch (err) {
      console.warn('[LocationTracking] startMonitoring threw', err);
      return false;
    }
  }, [requestPermissions, startForegroundWatcher]);

  const stopMonitoring = useCallback(async () => {
    stopForegroundWatcher();
    try {
      await safeStopBackground();
    } catch {
      // ignore
    }
    if (mountedRef.current) setBackgroundActive(false);
  }, [stopForegroundWatcher]);

  // Convenience toggle for UI
  const setTrackingEnabled = useCallback(
    async (enabled: boolean) => {
      try {
        if (enabled) {
          const ok = await startMonitoring();
          updateSettings({ trackingEnabled: ok });
          return ok;
        } else {
          await stopMonitoring();
          updateSettings({ trackingEnabled: false });
          return true;
        }
      } catch (err) {
        console.warn('[LocationTracking] setTrackingEnabled failed', err);
        updateSettings({ trackingEnabled: false });
        return false;
      }
    },
    [startMonitoring, stopMonitoring, updateSettings]
  );

  // ── Lifecycle: auto-start only if the user has previously opted in ─────
  useEffect(() => {
    mountedRef.current = true;

    // Sync background indicator (if the OS relaunched us and the task is
    // already registered).
    safeIsBackgroundRegistered()
      .then((registered) => {
        if (registered && mountedRef.current) setBackgroundActive(true);
      })
      .catch(() => {});

    const appStateSub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (!trackingEnabled) return;
        if (nextState === 'active') {
          startForegroundWatcher().catch(() => {});
          const persist = (useAppStore as unknown as {
            persist?: { rehydrate?: () => Promise<void> };
          }).persist;
          persist?.rehydrate?.().catch(() => {});
        } else if (nextState === 'background' || nextState === 'inactive') {
          stopForegroundWatcher();
        }
      }
    );

    return () => {
      mountedRef.current = false;
      try { appStateSub.remove(); } catch { /* ignore */ }
      stopForegroundWatcher();
      // Intentionally do NOT stop the background task on unmount.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to the tracking toggle. Start/stop the foreground watcher on
  // enable/disable — the background task is managed by the toggle function.
  useEffect(() => {
    if (!trackingEnabled) {
      stopForegroundWatcher();
      return;
    }
    // Fire-and-forget. If permissions aren't granted yet, the watcher simply
    // won't start — the user will need to toggle via settings which drives
    // the permission prompt.
    (async () => {
      try {
        const Location = await loadLocation();
        if (!Location) return;
        const fg = await Location.getForegroundPermissionsAsync();
        if (fg.status === 'granted') {
          startForegroundWatcher().catch(() => {});
        }
      } catch (err) {
        console.warn('[LocationTracking] reconcile failed', err);
      }
    })();
  }, [trackingEnabled, startForegroundWatcher, stopForegroundWatcher]);

  return {
    activeTrip,
    isTracking: activeTrip.isTracking,
    trackingEnabled,
    permissions,
    backgroundActive,
    startMonitoring,
    stopMonitoring,
    setTrackingEnabled,
    requestPermissions,
  };
}
