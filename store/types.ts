export interface RoutePoint {
  lat: number;
  lng: number;
}

export type TripPurpose = 'Business' | 'Personal';

export interface Trip {
  id: string;
  startTime: number;
  endTime: number;
  startSuburb: string;
  endSuburb: string;
  distance: number;
  rawDistance: number;
  duration: number;
  purpose: TripPurpose;
  routePoints: RoutePoint[];
  weekId: string;
  scalingFactor: number;
  createdAt: number;
}

export interface BusinessHours {
  enabled: boolean;
  startTime: string; // "HH:mm" format
  endTime: string;
}

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type BusinessHoursPerDay = Record<DayOfWeek, BusinessHours>;

export type DistanceUnit = 'km' | 'miles';

export interface Settings {
  userName: string;
  vehicleMake: string;
  vehicleModel: string;
  distanceUnit: DistanceUnit;
  businessHoursPerDay: BusinessHoursPerDay;
  logAllAsBusiness: boolean;
  weeklyOdometerPromptEnabled: boolean;
  lastOdometerReading: number;
  lastOdometerWeekId: string;
  startingOdometer: number;
  exportEmail: string;
  autoExportEnabled: boolean;
  autoDetectEnabled: boolean;
  hasAcceptedTerms: boolean;
}

export interface FavouriteLocation {
  id: string;
  label: string;
  address: string;
  suburb: string;
  lat: number;
  lng: number;
  createdAt: number;
}

export interface OdometerRecord {
  weekId: string;
  odometerReading: number;
  recordedAt: number;
  scalingApplied: boolean;
}

export interface ActiveTrip {
  startTime: number;
  routePoints: RoutePoint[];
  distance: number;
  lastMovementTime: number;
  startSuburb: string;
}
