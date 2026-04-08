import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Trip,
  ActiveTrip,
  Settings,
  FavouriteLocation,
  OdometerRecord,
  LatLng,
} from './types';
import {
  generateId,
  getDefaultSettings,
  isWithinBusinessHours,
  getWeekId,
} from '@/utils/helpers';

interface TripsSlice {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
  deleteTrip: (id: string) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  applyOdometerScaling: (weekId: string, scalingFactor: number) => void;
}

interface ActiveTripSlice {
  activeTrip: ActiveTrip;
  startTrip: (lat: number, lng: number) => void;
  updateActiveTrip: (updates: Partial<ActiveTrip>) => void;
  addRoutePoint: (point: LatLng) => void;
  endTrip: (startSuburb: string, endSuburb: string) => void;
}

interface SettingsSlice {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

interface FavouritesSlice {
  favourites: FavouriteLocation[];
  addFavourite: (fav: Omit<FavouriteLocation, 'id' | 'createdAt'>) => void;
  deleteFavourite: (id: string) => void;
}

interface OdometerSlice {
  odometerRecords: OdometerRecord[];
  addOdometerRecord: (record: OdometerRecord) => void;
}

export type AppStore = TripsSlice &
  ActiveTripSlice &
  SettingsSlice &
  FavouritesSlice &
  OdometerSlice;

const defaultActiveTrip: ActiveTrip = {
  isTracking: false,
  startTime: '',
  currentDistance: 0,
  currentSpeed: 0,
  lastPosition: null,
  routePoints: [],
  stationaryStartTime: null,
  stationaryPosition: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Settings ──────────────────────────────────────
      settings: getDefaultSettings(),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      // ── Trips ─────────────────────────────────────────
      trips: [],
      addTrip: (tripData) =>
        set((state) => ({
          trips: [
            {
              ...tripData,
              id: generateId(),
              createdAt: new Date().toISOString(),
            },
            ...state.trips,
          ],
        })),
      deleteTrip: (id) =>
        set((state) => ({
          trips: state.trips.filter((t) => t.id !== id),
        })),
      updateTrip: (id, updates) =>
        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      applyOdometerScaling: (weekId, scalingFactor) =>
        set((state) => ({
          trips: state.trips.map((t) =>
            t.weekId === weekId
              ? {
                  ...t,
                  scalingFactor,
                  distance: t.rawDistance * scalingFactor,
                }
              : t
          ),
        })),

      // ── Active Trip ───────────────────────────────────
      activeTrip: defaultActiveTrip,
      startTrip: (lat, lng) => {
        set({
          activeTrip: {
            isTracking: true,
            startTime: new Date().toISOString(),
            currentDistance: 0,
            currentSpeed: 0,
            lastPosition: { lat, lng },
            routePoints: [{ lat, lng }],
            stationaryStartTime: null,
            stationaryPosition: null,
          },
        });
      },
      updateActiveTrip: (updates) =>
        set((state) => ({
          activeTrip: { ...state.activeTrip, ...updates },
        })),
      addRoutePoint: (point) =>
        set((state) => ({
          activeTrip: {
            ...state.activeTrip,
            routePoints: [...state.activeTrip.routePoints, point],
          },
        })),
      endTrip: (startSuburb, endSuburb) => {
        const { activeTrip, settings, addTrip } = get();
        if (!activeTrip.isTracking || !activeTrip.startTime) return;

        const endTime = new Date().toISOString();
        const durationMs =
          new Date(endTime).getTime() -
          new Date(activeTrip.startTime).getTime();
        const durationSec = Math.round(durationMs / 1000);

        const isBusiness =
          settings.logAllAsBusiness ||
          isWithinBusinessHours(settings.businessHoursPerDay);

        addTrip({
          startTime: activeTrip.startTime,
          endTime,
          startSuburb,
          endSuburb,
          distance: activeTrip.currentDistance,
          rawDistance: activeTrip.currentDistance,
          duration: durationSec,
          purpose: isBusiness ? 'Business' : 'Personal',
          routePoints: activeTrip.routePoints,
          weekId: getWeekId(new Date(activeTrip.startTime)),
          scalingFactor: 1.0,
        });

        set({ activeTrip: defaultActiveTrip });
      },

      // ── Favourites ────────────────────────────────────
      favourites: [],
      addFavourite: (fav) =>
        set((state) => ({
          favourites: [
            ...state.favourites,
            { ...fav, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),
      deleteFavourite: (id) =>
        set((state) => ({
          favourites: state.favourites.filter((f) => f.id !== id),
        })),

      // ── Odometer ──────────────────────────────────────
      odometerRecords: [],
      addOdometerRecord: (record) =>
        set((state) => ({
          odometerRecords: [...state.odometerRecords, record],
        })),
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
