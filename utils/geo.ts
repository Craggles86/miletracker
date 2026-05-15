import { RoutePoint } from '@/store/types';

/** Haversine distance between two points in meters */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Calculate total distance from array of route points in meters */
export function calculateRouteDistance(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    );
  }
  return total;
}

/** Convert meters to km */
export function metersToKm(meters: number): number {
  return meters / 1000;
}

/** Convert meters to miles */
export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

/** Format distance based on unit preference */
export function formatDistance(meters: number, unit: 'km' | 'miles'): string {
  const value = unit === 'km' ? metersToKm(meters) : metersToMiles(meters);
  return value < 10 ? value.toFixed(2) : value.toFixed(1);
}

/** Format duration from milliseconds to human readable */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/** Speed in m/s to km/h */
export function msToKmh(ms: number): number {
  return ms * 3.6;
}

/** Get week ID string for a given date (ISO week) */
export function getWeekId(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Check if a point is within distance (meters) of another point */
export function isWithinRadius(
  point: RoutePoint,
  target: { lat: number; lng: number },
  radiusMeters: number
): boolean {
  return haversineDistance(point.lat, point.lng, target.lat, target.lng) <= radiusMeters;
}
