/**
 * MileageTrack — Data model types
 */

export type TripPurpose = 'Business' | 'Personal';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  startTime: string;
  endTime: string;
  startSuburb: string;
  endSuburb: string;
  distance: number; // km, may be scaled
  rawDistance: number; // original GPS distance
  duration: number; // seconds
  purpose: TripPurpose;
  routePoints: LatLng[];
  weekId: string; // e.g. "2026-W14"
  scalingFactor: number; // default 1.0
  createdAt: string;
}

export interface ActiveTrip {
  isTracking: boolean;
  startTime: string;
  currentDistance: number;
  currentSpeed: number;
  lastPosition: LatLng | null;
  routePoints: LatLng[];
  stationaryStartTime: string | null;
  stationaryPosition: LatLng | null;
}

export interface OdometerRecord {
  weekId: string;
  odometerReading: number;
  recordedAt: string;
  scalingApplied: boolean;
}

export interface FavouriteLocation {
  id: string;
  label: string;
  address: string;
  suburb: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export type BusinessHoursPerDay = {
  [day: string]: DaySchedule;
};

export interface Settings {
  userName: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleRegistration: string;
  distanceUnit: 'km' | 'miles';
  businessHoursPerDay: BusinessHoursPerDay;
  logAllAsBusiness: boolean;
  weeklyOdometerPromptEnabled: boolean;
  lastOdometerReading: number | null;
  lastOdometerWeekId: string | null;
  startingOdometer: number | null;
  exportEmail: string;
  autoExportEnabled: boolean;
  financialYearType: 'AU' | 'calendar';
  // True once the app has applied a locale-derived default distance unit. This
  // prevents the auto-detect logic from ever overriding a manual user choice.
  distanceUnitAutoDetected: boolean;
}
