import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { useAppStore } from '@/store/app-store';

/**
 * Resolves suburb names for saved trips that are missing suburb data.
 *
 * This hook runs AFTER trips have been saved to the store. It watches for
 * trips where startSuburb or endSuburb is empty/Unknown and performs
 * reverse geocoding on their route endpoints.
 *
 * IMPORTANT: This does NOT interfere with GPS tracking, trip detection,
 * or any location watching logic. It only reads stored trip data and
 * calls reverseGeocodeAsync on already-saved coordinates.
 */
export function useReverseGeocoding() {
  const trips = useAppStore((s) => s.trips);
  const updateTripSuburbs = useAppStore((s) => s.updateTripSuburbs);
  // Track which trip IDs we've already attempted geocoding for to avoid repeated calls
  const resolvedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Find trips that need suburb resolution
    const tripsNeedingResolution = trips.filter((trip) => {
      // Skip if already attempted
      if (resolvedRef.current.has(trip.id)) return false;
      // Only resolve if either suburb is missing
      const needsStart = !trip.startSuburb || trip.startSuburb === 'Unknown' || trip.startSuburb === '';
      const needsEnd = !trip.endSuburb || trip.endSuburb === 'Unknown' || trip.endSuburb === '';
      return (needsStart || needsEnd) && trip.routePoints.length > 0;
    });

    if (tripsNeedingResolution.length === 0) return;

    // Process geocoding for each trip that needs it (non-blocking)
    for (const trip of tripsNeedingResolution) {
      // Mark as attempted immediately to prevent duplicate calls
      resolvedRef.current.add(trip.id);
      resolveSuburbsForTrip(trip.id, trip.routePoints, trip.startSuburb, trip.endSuburb, updateTripSuburbs);
    }
  }, [trips, updateTripSuburbs]);
}

/**
 * Extracts the suburb/locality from a geocoding result.
 * Tries multiple fields to find the most appropriate locality name.
 */
function extractSuburb(results: Location.LocationGeocodedAddress[]): string {
  if (!results || results.length === 0) return '';

  const address = results[0];
  // Prefer subregion (suburb/locality level) > city > district > region
  return address.subregion || address.city || address.district || address.region || '';
}

/**
 * Performs reverse geocoding for a single trip's start and end points.
 * Fully wrapped in try/catch — will never throw or crash.
 */
async function resolveSuburbsForTrip(
  tripId: string,
  routePoints: Array<{ lat: number; lng: number }>,
  currentStartSuburb: string,
  currentEndSuburb: string,
  updateTripSuburbs: (id: string, startSuburb: string, endSuburb: string) => void
) {
  try {
    const startPoint = routePoints[0];
    const endPoint = routePoints[routePoints.length - 1];

    let resolvedStart = '';
    let resolvedEnd = '';

    const needsStart = !currentStartSuburb || currentStartSuburb === 'Unknown' || currentStartSuburb === '';
    const needsEnd = !currentEndSuburb || currentEndSuburb === 'Unknown' || currentEndSuburb === '';

    // Resolve start suburb
    if (needsStart && startPoint) {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: startPoint.lat,
          longitude: startPoint.lng,
        });
        resolvedStart = extractSuburb(results);
      } catch {
        // Silently fail — will show fallback
      }
    }

    // Resolve end suburb
    if (needsEnd && endPoint) {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: endPoint.lat,
          longitude: endPoint.lng,
        });
        resolvedEnd = extractSuburb(results);
      } catch {
        // Silently fail — will show fallback
      }
    }

    // Only update if we got at least one result
    if (resolvedStart || resolvedEnd) {
      updateTripSuburbs(tripId, resolvedStart, resolvedEnd);
    }
  } catch {
    // Top-level catch — ensures this never crashes the app
    console.warn('[ReverseGeocode] Failed to resolve suburbs for trip:', tripId);
  }
}
