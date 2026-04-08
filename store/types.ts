/**
 * MileTrack — Data model types
 */

export type TripPurpose = 'Business' | 'Personal';

export interface Trip {
  id: string;
  startTime: string;
  endTime: string;
  startLocation?: string;
  endLocation?: string;
  distance: number; // in km
  duration: number; // in seconds
  purpose: TripPurpose;
  notes?: string;
  autoClassified: boolean;
  createdAt: string;
}

export interface ActiveTrip {
  isTracking: boolean;
  startTime: string;
  currentDistance: number;
  currentSpeed: number;
  lastPosition: { lat: number; lng: number } | null;
  stationaryStartTime: string | null;
}

export interface BusinessHours {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface Preferences {
  distanceUnit: 'km' | 'miles';
  mileageRate: number;
  vehicleName: string;
  businessHours: BusinessHours;
}
