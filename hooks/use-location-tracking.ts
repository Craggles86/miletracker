import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { haversineDistance } from '@/utils/helpers';

const SPEED_THRESHOLD_KMH = 10;
const STATIONARY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STATIONARY_RADIUS_M = 20;
const TRACKING_INTERVAL_MS = 3000;
const ROUTE_POINT_MIN_DISTANCE_M = 15; // minimum distance between route points

type LocationModule = typeof import('expo-location');

export function useLocationTracking() {
  const activeTrip = useAppStore((s) => s.activeTrip);
  const locationModuleRef = useRef<LocationModule | null>(null);
  const watchRef = useRef<{ remove: () => void } | null>(null);

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

  // Reverse geocode to suburb name only
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const Location = await getLocation();
        if (!Location) return 'Unknown';
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results.length > 0) {
          return results[0].subregion || results[0].city || results[0].district || 'Unknown';
        }
      } catch {
        // Geocoding can fail silently
      }
      return 'Unknown';
    },
    [getLocation]
  );

  const startMonitoring = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const Location = await getLocation();
    if (!Location) return;

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
          // Check if we should auto-start
          if (speedKmh >= SPEED_THRESHOLD_KMH) {
            state.startTrip(latitude, longitude);
          }
          return;
        }

        // Currently tracking — calculate distance increment
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

        const newDistance = trip.currentDistance + addedDistance;

        // Record route point if moved enough
        const lastRoutePoint =
          trip.routePoints.length > 0
            ? trip.routePoints[trip.routePoints.length - 1]
            : null;
        if (
          !lastRoutePoint ||
          haversineDistance(lastRoutePoint.lat, lastRoutePoint.lng, latitude, longitude) >=
            ROUTE_POINT_MIN_DISTANCE_M
        ) {
          state.addRoutePoint({ lat: latitude, lng: longitude });
        }

        // Stationary detection using the first stationary position
        const stationaryAnchor = trip.stationaryPosition ?? trip.lastPosition;
        const distToAnchor = stationaryAnchor
          ? haversineDistance(stationaryAnchor.lat, stationaryAnchor.lng, latitude, longitude)
          : Infinity;

        if (distToAnchor < STATIONARY_RADIUS_M) {
          const stationaryStart =
            trip.stationaryStartTime ?? new Date().toISOString();
          const stationaryPos =
            trip.stationaryPosition ?? { lat: latitude, lng: longitude };
          const elapsed = Date.now() - new Date(stationaryStart).getTime();

          if (elapsed >= STATIONARY_TIMEOUT_MS) {
            // End trip — geocode endpoints
            const routePts = trip.routePoints;
            const startPt = routePts.length > 0 ? routePts[0] : null;
            const endPt = routePts.length > 0 ? routePts[routePts.length - 1] : null;

            // Fire async geocoding then end trip
            (async () => {
              const startSuburb = startPt
                ? await reverseGeocode(startPt.lat, startPt.lng)
                : 'Unknown';
              const endSuburb = endPt
                ? await reverseGeocode(endPt.lat, endPt.lng)
                : 'Unknown';
              useAppStore.getState().endTrip(startSuburb, endSuburb);
            })();
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
    );

    watchRef.current = subscription;
  }, [getLocation, requestPermissions, reverseGeocode]);

  const stopMonitoring = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
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
