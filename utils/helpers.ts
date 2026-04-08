import type { BusinessHours, Preferences } from '@/store/types';

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

// Format seconds into "Xh Ym" or "Ym"
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
}

// Format distance based on unit preference
export function formatDistance(km: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    return `${(km * 0.621371).toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

// Format distance number only (no unit)
export function formatDistanceValue(km: number, unit: 'km' | 'miles'): string {
  if (unit === 'miles') {
    return (km * 0.621371).toFixed(1);
  }
  return km.toFixed(1);
}

// Get the unit label
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

// Check if current time is within business hours
export function isBusinessHours(businessHours: BusinessHours): boolean {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[now.getDay()];

  if (!businessHours.days.includes(currentDay)) return false;

  const [startH, startM] = businessHours.startTime.split(':').map(Number);
  const [endH, endM] = businessHours.endTime.split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
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

// Get default preferences
export function getDefaultPreferences(): Preferences {
  return {
    distanceUnit: 'km',
    mileageRate: 0.42,
    vehicleName: '',
    businessHours: {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '09:00',
      endTime: '17:00',
    },
  };
}

// Calculate total business mileage deduction
export function calculateDeduction(
  totalKm: number,
  rate: number,
  unit: 'km' | 'miles'
): string {
  const distance = unit === 'miles' ? totalKm * 0.621371 : totalKm;
  return (distance * rate).toFixed(2);
}
