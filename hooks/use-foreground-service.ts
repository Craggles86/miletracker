import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAppStore } from '@/store/app-store';
import { formatDistance } from '@/utils/geo';

/**
 * Android Foreground Service hook.
 *
 * Purpose: Keep the JS thread alive when the app is minimised on Android.
 * This does NOT replace or modify watchPositionAsync — it simply prevents
 * Android from killing the process that the existing GPS watcher runs in.
 *
 * Strategy:
 * - Primary: Uses expo-foreground-actions to start a native Android Foreground Service
 * - Fallback: Uses expo-notifications with an ongoing notification channel (IMPORTANCE_HIGH)
 *   if expo-foreground-actions is unavailable or errors at runtime
 *
 * When active:
 * - Auto-detect ON, no trip: "MileageTrack is monitoring for trips"
 * - Trip in progress: "Trip in progress — X km logged"
 *
 * Lifecycle:
 * - Starts when autoDetect is enabled OR manual tracking begins
 * - Stops when autoDetect is disabled AND no trip is active AND not manually tracking
 */

const FOREGROUND_NOTIFICATION_CHANNEL = 'mileagetrack-foreground';
const FOREGROUND_NOTIFICATION_ID = 'mileagetrack-foreground-service';

// Interval for updating notification text with trip distance
const NOTIFICATION_UPDATE_INTERVAL_MS = 10_000;

export function useForegroundService() {
  const autoDetectEnabled = useAppStore((s) => s.settings.autoDetectEnabled);
  const isTracking = useAppStore((s) => s.isTracking);
  const activeTrip = useAppStore((s) => s.activeTrip);
  const distanceUnit = useAppStore((s) => s.settings.distanceUnit);

  const foregroundIdRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedFallbackRef = useRef(false);

  // Determine if the foreground service should be active
  const shouldBeActive = autoDetectEnabled || isTracking;

  // Set up the Android notification channel (required for ongoing notifications)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const setupChannel = async () => {
      try {
        await Notifications.setNotificationChannelAsync(FOREGROUND_NOTIFICATION_CHANNEL, {
          name: 'Trip Tracking',
          description: 'Keeps GPS tracking alive while the app is minimised',
          importance: Notifications.AndroidImportance.HIGH,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: null,
          vibrationPattern: [0],
          enableVibrate: false,
        });
      } catch {
        // Channel setup failure is non-fatal
      }
    };
    setupChannel();
  }, []);

  const getNotificationBody = useCallback((): string => {
    const state = useAppStore.getState();
    const trip = state.activeTrip;
    const unit = state.settings.distanceUnit;

    if (trip) {
      const dist = formatDistance(trip.distance, unit);
      return `Trip in progress — ${dist} ${unit} logged`;
    }
    return 'MileageTrack is monitoring for trips';
  }, []);

  /**
   * Start the foreground service using expo-foreground-actions.
   * Falls back to ongoing notification if the native module is unavailable.
   */
  const startForegroundService = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (isRunningRef.current) return;

    try {
      // Attempt to use expo-foreground-actions
      const {
        runForegroundedAction,
        updateForegroundedAction,
      } = await import('expo-foreground-actions');

      isRunningRef.current = true;

      // runForegroundedAction runs an async task inside a native foreground service.
      // The promise only resolves when the task function's promise resolves.
      // We use an indefinitely pending promise that we resolve when stopping.
      runForegroundedAction(
        async (api) => {
          foregroundIdRef.current = api.identifier;

          // Keep the task alive indefinitely — it will be stopped externally
          await new Promise<void>((resolve) => {
            // Store resolver so we can stop from outside
            (globalThis as any).__mileagetrack_stop_fg = resolve;
          });
        },
        {
          headlessTaskName: 'MileageTrackForeground',
          notificationTitle: 'MileageTrack',
          notificationDesc: getNotificationBody(),
          notificationColor: '#10B981',
          notificationIconName: 'ic_launcher',
          notificationIconType: 'mipmap',
          notificationProgress: 0,
          notificationMaxProgress: 0,
          notificationIndeterminate: false,
          linkingURI: 'fastshot://',
        },
        {
          runInJS: false,
          events: {
            onIdentifier: (id) => {
              foregroundIdRef.current = id;
            },
          },
        }
      ).catch(() => {
        // Foreground action ended (either stopped or errored)
        isRunningRef.current = false;
        foregroundIdRef.current = null;
      });

      // Start periodic notification text updates
      updateIntervalRef.current = setInterval(async () => {
        if (foregroundIdRef.current !== null) {
          try {
            await updateForegroundedAction(foregroundIdRef.current, {
              headlessTaskName: 'MileageTrackForeground',
              notificationTitle: 'MileageTrack',
              notificationDesc: getNotificationBody(),
              notificationColor: '#10B981',
              notificationIconName: 'ic_launcher',
              notificationIconType: 'mipmap',
              notificationProgress: 0,
              notificationMaxProgress: 0,
              notificationIndeterminate: false,
              linkingURI: 'fastshot://',
            });
          } catch {
            // Update failure is non-fatal
          }
        }
      }, NOTIFICATION_UPDATE_INTERVAL_MS);
    } catch {
      // expo-foreground-actions not available at runtime — use fallback
      await startFallbackNotification();
    }
  }, [getNotificationBody]);

  /**
   * Fallback: Post an ongoing notification via expo-notifications.
   * Android treats apps with ongoing high-importance notifications as
   * higher priority and is less likely to kill them.
   */
  const startFallbackNotification = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (isRunningRef.current) return;

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: FOREGROUND_NOTIFICATION_ID,
        content: {
          title: 'MileageTrack',
          body: getNotificationBody(),
          sticky: true,
          autoDismiss: false,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && {
            channelId: FOREGROUND_NOTIFICATION_CHANNEL,
          }),
        },
        trigger: null,
      });

      isRunningRef.current = true;
      usedFallbackRef.current = true;

      // Update notification body periodically
      updateIntervalRef.current = setInterval(async () => {
        try {
          await Notifications.scheduleNotificationAsync({
            identifier: FOREGROUND_NOTIFICATION_ID,
            content: {
              title: 'MileageTrack',
              body: getNotificationBody(),
              sticky: true,
              autoDismiss: false,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              ...(Platform.OS === 'android' && {
                channelId: FOREGROUND_NOTIFICATION_CHANNEL,
              }),
            },
            trigger: null,
          });
        } catch {
          // Non-fatal
        }
      }, NOTIFICATION_UPDATE_INTERVAL_MS);
    } catch {
      // Notifications unavailable — tracking will still work but may be killed
    }
  }, [getNotificationBody]);

  /**
   * Stop the foreground service (or fallback notification).
   */
  const stopForegroundService = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    if (!isRunningRef.current) return;

    // Clear update interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (usedFallbackRef.current) {
      // Stop fallback notification
      try {
        await Notifications.dismissNotificationAsync(FOREGROUND_NOTIFICATION_ID);
      } catch {
        // Non-fatal
      }
    } else {
      // Stop expo-foreground-actions
      try {
        // Resolve the indefinite promise to let the task complete
        const stopFn = (globalThis as any).__mileagetrack_stop_fg;
        if (stopFn) {
          stopFn();
          (globalThis as any).__mileagetrack_stop_fg = undefined;
        }

        // Force stop as backup
        const { forceStopAllForegroundActions } = await import('expo-foreground-actions');
        await forceStopAllForegroundActions();
      } catch {
        // Non-fatal
      }
    }

    isRunningRef.current = false;
    foregroundIdRef.current = null;
    usedFallbackRef.current = false;
  }, []);

  // Main effect: start/stop based on tracking state
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (shouldBeActive && !isRunningRef.current) {
      startForegroundService();
    } else if (!shouldBeActive && isRunningRef.current) {
      stopForegroundService();
    }
  }, [shouldBeActive, startForegroundService, stopForegroundService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    isForegroundServiceActive: isRunningRef.current,
  };
}
