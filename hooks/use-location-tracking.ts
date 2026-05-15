import { useEffect, useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useAppStore } from '@/store/app-store';
import { BACKGROUND_LOCATION_TASK } from '@/tasks/background-location';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'background_granted';

export function useLocationTracking() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [isStarting, setIsStarting] = useState(false);
  const isTracking = useAppStore((s) => s.isTracking);
  const setIsTracking = useAppStore((s) => s.setIsTracking);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (!fg.granted) {
        setPermissionStatus('undetermined');
        return;
      }
      const bg = await Location.getBackgroundPermissionsAsync();
      setPermissionStatus(bg.granted ? 'background_granted' : 'granted');
    } catch {
      setPermissionStatus('denied');
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (!fg.granted) {
        setPermissionStatus('denied');
        return false;
      }
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.granted) {
        setPermissionStatus('background_granted');
        return true;
      }
      setPermissionStatus('granted');
      return true;
    } catch {
      setPermissionStatus('denied');
      return false;
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (isTracking || isStarting) return;
    setIsStarting(true);

    try {
      const hasPermission = permissionStatus === 'background_granted' || permissionStatus === 'granted';
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          setIsStarting(false);
          return;
        }
      }

      if (Platform.OS !== 'web') {
        // Start background location updates
        const bgGranted = permissionStatus === 'background_granted';
        if (bgGranted) {
          const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
          if (!isTaskRunning) {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.High,
              timeInterval: 3000,
              distanceInterval: 10,
              showsBackgroundLocationIndicator: true,
              foregroundService: {
                notificationTitle: 'MileageTrack',
                notificationBody: 'MileageTrack is tracking your journey',
                notificationColor: '#3B82F6',
              },
            });
          }
        } else {
          // Foreground-only tracking
          watchRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 3000,
              distanceInterval: 10,
            },
            (location) => {
              useAppStore.getState().processLocationUpdate([location]);
            }
          );
        }
      }

      setIsTracking(true);
    } catch (err) {
      console.warn('[Tracking] Failed to start:', err);
    } finally {
      setIsStarting(false);
    }
  }, [isTracking, isStarting, permissionStatus, requestPermissions, setIsTracking]);

  const stopTracking = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).catch(() => false);
        if (isTaskRunning) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
      }
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      setIsTracking(false);
    } catch (err) {
      console.warn('[Tracking] Failed to stop:', err);
      setIsTracking(false);
    }
  }, [setIsTracking]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissionStatus,
    isTracking,
    isStarting,
    requestPermissions,
    startTracking,
    stopTracking,
    checkPermissions,
  };
}
