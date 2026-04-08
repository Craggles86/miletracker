import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { generateId } from '@/utils/helpers';
import type { Trip } from '@/store/types';

// Generate realistic demo trips for showcasing the app
function generateMockTrips(): Trip[] {
  const now = new Date();
  const trips: Trip[] = [];

  const routes = [
    { start: 'Home', end: 'Client Office', dist: 18.2, dur: 32 * 60, purpose: 'Business' as const },
    { start: 'Client Office', end: 'Downtown HQ', dist: 7.5, dur: 18 * 60, purpose: 'Business' as const },
    { start: 'Gym', end: 'Home', dist: 3.1, dur: 15 * 60, purpose: 'Personal' as const },
    { start: 'Home', end: 'Airport', dist: 42.3, dur: 48 * 60, purpose: 'Business' as const },
    { start: 'Coffee Shop', end: 'Home', dist: 2.8, dur: 12 * 60, purpose: 'Personal' as const },
    { start: 'Home', end: 'Warehouse', dist: 25.6, dur: 35 * 60, purpose: 'Business' as const },
    { start: 'Warehouse', end: 'Supplier', dist: 12.9, dur: 22 * 60, purpose: 'Business' as const },
    { start: 'Home', end: 'Grocery Store', dist: 4.2, dur: 10 * 60, purpose: 'Personal' as const },
    { start: 'Home', end: 'Client Meeting', dist: 15.7, dur: 28 * 60, purpose: 'Business' as const },
    { start: 'Park', end: 'Home', dist: 5.3, dur: 14 * 60, purpose: 'Personal' as const },
    { start: 'Home', end: 'Conference Center', dist: 31.2, dur: 40 * 60, purpose: 'Business' as const },
    { start: 'Home', end: 'Dentist', dist: 6.4, dur: 16 * 60, purpose: 'Personal' as const },
  ];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const dayOffset = Math.floor(i / 2);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dayOffset);
    startDate.setHours(8 + (i % 4) * 2, Math.floor(Math.random() * 30), 0, 0);

    const endDate = new Date(startDate.getTime() + route.dur * 1000);

    trips.push({
      id: generateId(),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      startLocation: route.start,
      endLocation: route.end,
      distance: route.dist,
      duration: route.dur,
      purpose: route.purpose,
      autoClassified: true,
      createdAt: startDate.toISOString(),
    });
  }

  return trips;
}

export function useMockTrips() {
  const trips = useAppStore((s) => s.trips);

  useEffect(() => {
    // Only seed if there are no trips
    if (trips.length === 0) {
      const mockTrips = generateMockTrips();
      useAppStore.setState({ trips: mockTrips });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
