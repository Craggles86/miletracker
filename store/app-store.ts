import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Trip,
  Settings,
  FavouriteLocation,
  OdometerRecord,
  ActiveTrip,
  BusinessHoursPerDay,
  RoutePoint,
  DayOfWeek,
} from './types';
import { haversineDistance, getWeekId } from '@/utils/geo';
import { classifyTrip, generateId } from '@/utils/time';

const DEFAULT_BUSINESS_HOURS: BusinessHoursPerDay = {
  Mon: { enabled: true, startTime: '08:00', endTime: '17:00' },
  Tue: { enabled: true, startTime: '08:00', endTime: '17:00' },
  Wed: { enabled: true, startTime: '08:00', endTime: '17:00' },
  Thu: { enabled: true, startTime: '08:00', endTime: '17:00' },
  Fri: { enabled: true, startTime: '08:00', endTime: '17:00' },
  Sat: { enabled: false, startTime: '09:00', endTime: '12:00' },
  Sun: { enabled: false, startTime: '09:00', endTime: '12:00' },
};

const DEFAULT_SETTINGS: Settings = {
  userName: '',
  vehicleMake: '',
  vehicleModel: '',
  distanceUnit: 'km',
  businessHoursPerDay: DEFAULT_BUSINESS_HOURS,
  logAllAsBusiness: false,
  weeklyOdometerPromptEnabled: true,
  lastOdometerReading: 0,
  lastOdometerWeekId: '',
  startingOdometer: 0,
  exportEmail: '',
  autoExportEnabled: false,
  autoDetectEnabled: false,
};

// Thresholds for trip detection
const SPEED_THRESHOLD_MS = 10 / 3.6; // 10 km/h in m/s
const STATIONARY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const STATIONARY_RADIUS_M = 20; // 20 meters

interface AppState {
  // Trips
  trips: Trip[];
  activeTrip: ActiveTrip | null;
  isTracking: boolean;

  // Settings
  settings: Settings;

  // Favourites
  favourites: FavouriteLocation[];

  // Odometer
  odometerRecords: OdometerRecord[];
  showOdometerModal: boolean;

  // Current speed (live data)
  currentSpeed: number;

  // Actions
  processLocationUpdate: (
    locations: Array<{
      coords: { latitude: number; longitude: number; speed: number | null };
      timestamp: number;
    }>
  ) => void;
  startTrip: (lat: number, lng: number, suburb: string) => void;
  endTrip: (endSuburb: string) => void;
  deleteTrip: (id: string) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  updateBusinessHours: (day: DayOfWeek, hours: Partial<BusinessHoursPerDay[DayOfWeek]>) => void;
  addFavourite: (fav: Omit<FavouriteLocation, 'id' | 'createdAt'>) => void;
  deleteFavourite: (id: string) => void;
  recordOdometer: (reading: number) => void;
  skipOdometerPrompt: () => void;
  setShowOdometerModal: (show: boolean) => void;
  setIsTracking: (tracking: boolean) => void;
  getMatchingFavourite: (lat: number, lng: number) => FavouriteLocation | null;
  updateTripSuburbs: (id: string, startSuburb: string, endSuburb: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      trips: [],
      activeTrip: null,
      isTracking: false,
      settings: DEFAULT_SETTINGS,
      favourites: [],
      odometerRecords: [],
      showOdometerModal: false,
      currentSpeed: 0,

      processLocationUpdate: (locations) => {
        const state = get();
        const { activeTrip, settings } = state;

        for (const location of locations) {
          const { latitude, longitude, speed } = location.coords;
          const currentSpeed = speed ?? 0;
          const point: RoutePoint = { lat: latitude, lng: longitude };

          set({ currentSpeed: Math.max(0, currentSpeed) });

          if (!activeTrip) {
            // Check if we should start a trip
            if (currentSpeed >= SPEED_THRESHOLD_MS) {
              const suburb = ''; // Will be resolved async
              set({
                activeTrip: {
                  startTime: location.timestamp,
                  routePoints: [point],
                  distance: 0,
                  lastMovementTime: location.timestamp,
                  startSuburb: suburb,
                },
              });
            }
          } else {
            // Trip is active — add point and check for end
            const lastPoint = activeTrip.routePoints[activeTrip.routePoints.length - 1];
            const distFromLast = haversineDistance(
              lastPoint.lat,
              lastPoint.lng,
              latitude,
              longitude
            );

            // Only add point if moved more than 5m (noise filter)
            if (distFromLast > 5) {
              const newPoints = [...activeTrip.routePoints, point];
              const newDistance = activeTrip.distance + distFromLast;

              if (currentSpeed >= SPEED_THRESHOLD_MS || distFromLast > STATIONARY_RADIUS_M) {
                set({
                  activeTrip: {
                    ...activeTrip,
                    routePoints: newPoints,
                    distance: newDistance,
                    lastMovementTime: location.timestamp,
                  },
                });
              } else {
                // Moving slowly — check if stationary long enough to end trip
                const stationaryDuration = location.timestamp - activeTrip.lastMovementTime;
                if (stationaryDuration >= STATIONARY_TIMEOUT_MS) {
                  // End the trip
                  const endTime = activeTrip.lastMovementTime;
                  const duration = endTime - activeTrip.startTime;
                  const weekId = getWeekId(new Date(activeTrip.startTime));
                  const purpose = classifyTrip(
                    activeTrip.startTime,
                    settings.businessHoursPerDay,
                    settings.logAllAsBusiness
                  );

                  const trip: Trip = {
                    id: generateId(),
                    startTime: activeTrip.startTime,
                    endTime,
                    startSuburb: activeTrip.startSuburb || 'Unknown',
                    endSuburb: '', // Will be resolved
                    distance: newDistance,
                    rawDistance: newDistance,
                    duration,
                    purpose,
                    routePoints: newPoints,
                    weekId,
                    scalingFactor: 1,
                    createdAt: Date.now(),
                  };

                  set({
                    trips: [trip, ...state.trips],
                    activeTrip: null,
                  });
                } else {
                  set({
                    activeTrip: {
                      ...activeTrip,
                      routePoints: newPoints,
                      distance: newDistance,
                    },
                  });
                }
              }
            }
          }
        }
      },

      startTrip: (lat, lng, suburb) => {
        set({
          activeTrip: {
            startTime: Date.now(),
            routePoints: [{ lat, lng }],
            distance: 0,
            lastMovementTime: Date.now(),
            startSuburb: suburb,
          },
        });
      },

      endTrip: (endSuburb) => {
        const state = get();
        const { activeTrip, settings } = state;
        if (!activeTrip) return;

        const endTime = Date.now();
        const duration = endTime - activeTrip.startTime;
        const weekId = getWeekId(new Date(activeTrip.startTime));
        const purpose = classifyTrip(
          activeTrip.startTime,
          settings.businessHoursPerDay,
          settings.logAllAsBusiness
        );

        const trip: Trip = {
          id: generateId(),
          startTime: activeTrip.startTime,
          endTime,
          startSuburb: activeTrip.startSuburb || 'Unknown',
          endSuburb: endSuburb || 'Unknown',
          distance: activeTrip.distance,
          rawDistance: activeTrip.distance,
          duration,
          purpose,
          routePoints: activeTrip.routePoints,
          weekId,
          scalingFactor: 1,
          createdAt: Date.now(),
        };

        set({
          trips: [trip, ...state.trips],
          activeTrip: null,
        });
      },

      deleteTrip: (id) => {
        set({ trips: get().trips.filter((t) => t.id !== id) });
      },

      updateSettings: (partial) => {
        set({ settings: { ...get().settings, ...partial } });
      },

      updateBusinessHours: (day, hours) => {
        const current = get().settings.businessHoursPerDay;
        set({
          settings: {
            ...get().settings,
            businessHoursPerDay: {
              ...current,
              [day]: { ...current[day], ...hours },
            },
          },
        });
      },

      addFavourite: (fav) => {
        const newFav: FavouriteLocation = {
          ...fav,
          id: generateId(),
          createdAt: Date.now(),
        };
        set({ favourites: [...get().favourites, newFav] });
      },

      deleteFavourite: (id) => {
        set({ favourites: get().favourites.filter((f) => f.id !== id) });
      },

      recordOdometer: (reading) => {
        const state = get();
        const weekId = getWeekId();
        const record: OdometerRecord = {
          weekId,
          odometerReading: reading,
          recordedAt: Date.now(),
          scalingApplied: false,
        };

        // Calculate scaling factor if we have a previous reading
        const prevRecord = state.odometerRecords[state.odometerRecords.length - 1];
        if (prevRecord) {
          const odometerDelta = reading - prevRecord.odometerReading;
          const weekTrips = state.trips.filter((t) => t.weekId === prevRecord.weekId);
          const gpsTotal = weekTrips.reduce((sum, t) => sum + t.rawDistance, 0);

          if (gpsTotal > 0 && odometerDelta > 0) {
            const scalingFactor = (odometerDelta * 1000) / gpsTotal; // odometerDelta in km, gpsTotal in meters
            const updatedTrips = state.trips.map((t) =>
              t.weekId === prevRecord.weekId
                ? { ...t, scalingFactor, distance: t.rawDistance * scalingFactor }
                : t
            );
            set({ trips: updatedTrips });
          }
        }

        set({
          odometerRecords: [...state.odometerRecords, record],
          settings: {
            ...state.settings,
            lastOdometerReading: reading,
            lastOdometerWeekId: weekId,
          },
          showOdometerModal: false,
        });
      },

      skipOdometerPrompt: () => {
        set({
          showOdometerModal: false,
          settings: {
            ...get().settings,
            lastOdometerWeekId: getWeekId(),
          },
        });
      },

      setShowOdometerModal: (show) => set({ showOdometerModal: show }),
      setIsTracking: (tracking) => set({ isTracking: tracking }),

      updateTripSuburbs: (id, startSuburb, endSuburb) => {
        const { trips } = get();
        set({
          trips: trips.map((t) =>
            t.id === id
              ? {
                  ...t,
                  startSuburb: startSuburb || t.startSuburb,
                  endSuburb: endSuburb || t.endSuburb,
                }
              : t
          ),
        });
      },


      getMatchingFavourite: (lat, lng) => {
        const { favourites } = get();
        for (const fav of favourites) {
          if (haversineDistance(lat, lng, fav.lat, fav.lng) <= 200) {
            return fav;
          }
        }
        return null;
      },
    }),
    {
      name: 'mileagetrack-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        trips: state.trips,
        settings: state.settings,
        favourites: state.favourites,
        odometerRecords: state.odometerRecords,
      }),
    }
  )
);
