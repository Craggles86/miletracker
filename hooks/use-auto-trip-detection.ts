import { useEffect, useRef, useCallback } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useAppStore } from '@/store/app-store';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistance } from '@/utils/geo';

/**
 * Auto-trip detection hook using foreground-only location watching.
 *
 * When enabled:
 * - Shows a persistent (user-dismissible) notification to indicate monitoring state
 * - Uses watchPositionAsync to monitor device speed in the foreground
 * - Auto-starts a trip when speed exceeds 10 km/h
 * - Auto-ends a trip after 5 minutes stationary within 20m radius
 * - Sends one-time notifications on trip start/end events
 *
 * Safety:
 * - No TaskManager, no background location, no defineTask
 * - All location watching is foreground-only with requestForegroundPermissionsAsync
 * - Subscription stored in ref, cleaned up on unmount or disable
 * - Wrapped in try/catch to prevent crashes
 */
export function useAutoTripDetection() {
  const autoDetectEnabled = useAppStore((s) => s.settings.autoDetectEnabled);
  const isTracking = useAppStore((s) => s.isTracking);
  const activeTrip = useAppStore((s) => s.activeTrip);
  const distanceUnit = useAppStore((s) => s.settings.distanceUnit);

  const {
    showMonitoringNotification,
    dismissMonitoringNotification,
    notifyTripStarted,
    notifyTripEnded,
  } = useNotifications();

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const prevActiveTripRef = useRef<typeof activeTrip>(null);

  // Track trip transitions for notifications
  useEffect(() => {
    const prevTrip = prevActiveTripRef.current;
    const currentTrip = activeTrip;

    // Trip just started (was null, now active)
    if (!prevTrip && currentTrip && autoDetectEnabled) {
      notifyTripStarted();
    }

    // Trip just ended (was active, now null) — only if auto-detect caused it
    if (prevTrip && !currentTrip && autoDetectEnabled) {
      const distStr = formatDistance(prevTrip.distance, distanceUnit);
      notifyTripEnded(`${distStr} ${distanceUnit}`);
    }

    prevActiveTripRef.current = currentTrip;
  }, [activeTrip, autoDetectEnabled, distanceUnit, notifyTripStarted, notifyTripEnded]);

  const startWatching = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (watchRef.current) return; // Already watching

    try {
      // Request foreground permissions only
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[AutoDetect] Foreground location permission not granted');
        return;
      }

      // Start high-accuracy foreground watcher
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (location) => {
          try {
            useAppStore.getState().processLocationUpdate([location]);
          } catch (err) {
            console.warn('[AutoDetect] Error processing location:', err);
          }
        }
      );

      // Show monitoring notification
      showMonitoringNotification();
    } catch (err) {
      console.warn('[AutoDetect] Failed to start watching:', err);
    }
  }, [showMonitoringNotification]);

  const stopWatching = useCallback(async () => {
    try {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      dismissMonitoringNotification();
    } catch (err) {
      console.warn('[AutoDetect] Failed to stop watching:', err);
    }
  }, [dismissMonitoringNotification]);

  // Start/stop watching based on autoDetectEnabled setting
  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (autoDetectEnabled && !isTracking) {
      // Auto-detect is on and manual tracking isn't active — start monitoring
      startWatching();
    } else if (!autoDetectEnabled) {
      // Auto-detect turned off — stop monitoring
      stopWatching();
    }

    return () => {
      // Cleanup on unmount
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [autoDetectEnabled, isTracking, startWatching, stopWatching]);

  // Pause/resume when app goes to background/foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      try {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          // App came to foreground — resume if auto-detect is on
          if (useAppStore.getState().settings.autoDetectEnabled && !watchRef.current) {
            startWatching();
          }
        } else if (
          appStateRef.current === 'active' &&
          nextState.match(/inactive|background/)
        ) {
          // App went to background — watchPositionAsync will naturally pause
          // We don't stop it here because iOS/Android may keep it briefly alive
          // but we won't get updates. This is by design (foreground-only).
        }
        appStateRef.current = nextState;
      } catch (err) {
        console.warn('[AutoDetect] AppState change error:', err);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [startWatching]);

  return {
    isAutoDetecting: autoDetectEnabled && watchRef.current !== null,
  };
}
