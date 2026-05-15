import { useEffect, useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useAppStore } from '@/store/app-store';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export function useLocationTracking() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [isStarting, setIsStarting] = useState(false);
  const isTracking = useAppStore((s) => s.isTracking);
  const setIsTracking = useAppStore((s) => s.setIsTracking);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const checkPermissions = useCallback(async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.granted) {
        setPermissionStatus('granted');
      } else {
        setPermissionStatus('undetermined');
      }
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
      if (permissionStatus !== 'granted') {
        const granted = await requestPermissions();
        if (!granted) {
          setIsStarting(false);
          return;
        }
      }

      if (Platform.OS !== 'web') {
        // Foreground-only location watcher
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

      setIsTracking(true);
    } catch (err) {
      console.warn('[Tracking] Failed to start:', err);
    } finally {
      setIsStarting(false);
    }
  }, [isTracking, isStarting, permissionStatus, requestPermissions, setIsTracking]);

  const stopTracking = useCallback(async () => {
    try {
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

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, []);

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
