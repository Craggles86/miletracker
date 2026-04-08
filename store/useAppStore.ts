import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip, ActiveTrip, Preferences, TripPurpose } from './types';
import { generateId, getDefaultPreferences, isBusinessHours } from '@/utils/helpers';

interface TripsSlice {
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
  deleteTrip: (id: string) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
}

interface ActiveTripSlice {
  activeTrip: ActiveTrip;
  startTrip: (lat: number, lng: number) => void;
  updateActiveTrip: (updates: Partial<ActiveTrip>) => void;
  endTrip: () => void;
}

interface PreferencesSlice {
  preferences: Preferences;
  updatePreferences: (updates: Partial<Preferences>) => void;
}

export type AppStore = TripsSlice & ActiveTripSlice & PreferencesSlice;

const defaultActiveTrip: ActiveTrip = {
  isTracking: false,
  startTime: '',
  currentDistance: 0,
  currentSpeed: 0,
  lastPosition: null,
  stationaryStartTime: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Preferences
      preferences: getDefaultPreferences(),
      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      // Trips
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
          trips: state.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      // Active Trip
      activeTrip: defaultActiveTrip,
      startTrip: (lat, lng) => {
        set({
          activeTrip: {
            isTracking: true,
            startTime: new Date().toISOString(),
            currentDistance: 0,
            currentSpeed: 0,
            lastPosition: { lat, lng },
            stationaryStartTime: null,
          },
        });
      },
      updateActiveTrip: (updates) =>
        set((state) => ({
          activeTrip: { ...state.activeTrip, ...updates },
        })),
      endTrip: () => {
        const { activeTrip, preferences, addTrip } = get();
        if (!activeTrip.isTracking || !activeTrip.startTime) return;

        const endTime = new Date().toISOString();
        const durationMs =
          new Date(endTime).getTime() - new Date(activeTrip.startTime).getTime();
        const durationSec = Math.round(durationMs / 1000);

        const isBusiness = isBusinessHours(preferences.businessHours);

        addTrip({
          startTime: activeTrip.startTime,
          endTime,
          distance: activeTrip.currentDistance,
          duration: durationSec,
          purpose: isBusiness ? 'Business' : 'Personal',
          autoClassified: true,
        });

        set({ activeTrip: defaultActiveTrip });
      },
    }),
    {
      name: 'miletrack-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        trips: state.trips,
        preferences: state.preferences,
      }),
    }
  )
);
