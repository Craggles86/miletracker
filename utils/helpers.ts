import type { BusinessHoursPerDay, Settings, FavouriteLocation, LatLng } from '@/store/types';

// Generate a simple UUID v4
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Haversine distance formula (returns metres)
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Format seconds into "Xh Ym" or "Y min"
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
}

// Format distance with unit
export function formatDistance(km: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    return `${(km * 0.621371).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

// Format distance number only (no unit suffix)
export function formatDistanceValue(km: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    return (km * 0.621371).toFixed(1);
  }
  return km.toFixed(1);
}

// Unit label
export function getUnitLabel(unit: 'km' | 'miles'): string {
  return unit === 'miles' ? 'mi' : 'km';
}

// Format speed
export function formatSpeed(kmh: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

// Check if current time is within per-day business hours
export function isWithinBusinessHours(businessHoursPerDay: BusinessHoursPerDay): boolean {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[now.getDay()];

  const schedule = businessHoursPerDay[currentDay];
  if (!schedule || !schedule.enabled) return false;

  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= startH * 60 + startM && currentMinutes <= endH * 60 + endM;
}

// Format date for trip card display
export function formatTripDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format time
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Get ISO week id string, e.g. "2026-W14"
export function getWeekId(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(
    ((d.getTime() - yearStart.getTime()) / 86400000 - 3 + ((yearStart.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Format display time from "HH:mm"
export function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

// Check if a lat/lng is within ~200m of any favourite
export function matchFavourite(
  lat: number,
  lng: number,
  favourites: FavouriteLocation[]
): FavouriteLocation | null {
  for (const fav of favourites) {
    const dist = haversineDistance(lat, lng, fav.lat, fav.lng);
    if (dist <= 200) return fav;
  }
  return null;
}

// Get the label for a trip endpoint using favourites or suburb
export function getLocationLabel(
  suburb: string,
  lat: number | undefined,
  lng: number | undefined,
  favourites: FavouriteLocation[]
): string {
  if (lat !== undefined && lng !== undefined) {
    const match = matchFavourite(lat, lng, favourites);
    if (match) return match.label;
  }
  return suburb || 'Unknown';
}

// Get default settings
export function getDefaultSettings(): Settings {
  return {
    userName: '',
    vehicleMake: '',
    vehicleModel: '',
    distanceUnit: 'km',
    businessHoursPerDay: {
      Mon: { enabled: true, startTime: '09:00', endTime: '17:00' },
      Tue: { enabled: true, startTime: '09:00', endTime: '17:00' },
      Wed: { enabled: true, startTime: '09:00', endTime: '17:00' },
      Thu: { enabled: true, startTime: '09:00', endTime: '17:00' },
      Fri: { enabled: true, startTime: '09:00', endTime: '17:00' },
      Sat: { enabled: false, startTime: '09:00', endTime: '17:00' },
      Sun: { enabled: false, startTime: '09:00', endTime: '17:00' },
    },
    logAllAsBusiness: false,
    weeklyOdometerPromptEnabled: true,
    lastOdometerReading: null,
    lastOdometerWeekId: null,
    startingOdometer: null,
    exportEmail: '',
    autoExportEnabled: false,
    financialYearType: 'AU',
  };
}

// Normalize route points to SVG coordinates for the mini map preview
export function normalizeRouteToSvg(
  points: LatLng[],
  width: number,
  height: number,
  padding: number = 20
): { x: number; y: number }[] {
  if (points.length === 0) return [];

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  return points.map((p) => ({
    x: padding + ((p.lng - minLng) / lngRange) * usableW,
    // Invert Y since lat increases upward but SVG Y increases downward
    y: padding + ((maxLat - p.lat) / latRange) * usableH,
  }));
}
