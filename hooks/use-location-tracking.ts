import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { haversineDistance } from '@/utils/helpers';

const SPEED_THRESHOLD_KMH = 10;
const STATIONARY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STATIONARY_RADIUS_M = 20;
const TRACKING_INTERVAL_MS = 3000;

type LocationModule = typeof import('expo-location');

export function useLocationTracking() {
  const {
    activeTrip,
    startTrip,
    updateActiveTrip,
    endTrip,
  } = useAppStore();

  const locationModuleRef = useRef<LocationModule | null>(null);
  const watchRef = useRef<{ remove: () => void } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dynamically import expo-location to avoid web crashes
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

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const Location = await getLocation();
    if (!Location) return false;
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }, [getLocation]);

  const startMonitoring = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const Location = await getLocation();
    if (!Location) return;

    // Start watching position
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: TRACKING_INTERVAL_MS,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude, speed: rawSpeed } = location.coords;
        const speedKmh = Math.max(0, (rawSpeed ?? 0) * 3.6);
        const state = useAppStore.getState();
        const trip = state.activeTrip;

        if (!trip.isTracking) {
          // Not currently tracking — check if we should start
          if (speedKmh >= SPEED_THRESHOLD_KMH) {
            state.startTrip(latitude, longitude);
          }
          return;
        }

        // Currently tracking — update distance and speed
        let addedDistance = 0;
        if (trip.lastPosition) {
          addedDistance =
            haversineDistance(
              trip.lastPosition.lat,
              trip.lastPosition.lng,
              latitude,
              longitude
            ) / 1000; // convert metres to km
        }

        const newDistance = trip.currentDistance + addedDistance;

        // Check for stationary (within 20m radius for 5 minutes)
        if (
          trip.lastPosition &&
          haversineDistance(
            trip.lastPosition.lat,
            trip.lastPosition.lng,
            latitude,
            longitude
          ) < STATIONARY_RADIUS_M
        ) {
          const stationaryStart =
            trip.stationaryStartTime ?? new Date().toISOString();
          const elapsed =
            Date.now() - new Date(stationaryStart).getTime();

          if (elapsed >= STATIONARY_TIMEOUT_MS) {
            state.endTrip();
            return;
          }

          state.updateActiveTrip({
            currentSpeed: speedKmh,
            currentDistance: newDistance,
            stationaryStartTime: stationaryStart,
          });
        } else {
          state.updateActiveTrip({
            currentSpeed: speedKmh,
            currentDistance: newDistance,
            lastPosition: { lat: latitude, lng: longitude },
            stationaryStartTime: null,
          });
        }
      }
    );

    watchRef.current = subscription;
  }, [getLocation, requestPermissions]);

  const stopMonitoring = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);

  return {
    activeTrip,
    isTracking: activeTrip.isTracking,
    startMonitoring,
    stopMonitoring,
  };
}
