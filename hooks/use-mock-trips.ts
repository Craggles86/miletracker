import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { generateId, getWeekId } from '@/utils/helpers';
import type { Trip, LatLng } from '@/store/types';

// Generate a synthetic route polyline between two points with some realistic wandering
function generateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  pointCount: number = 12
): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    // Sine-wave wobble for realism
    const wobble = Math.sin(t * Math.PI * 3) * 0.002;
    points.push({
      lat: startLat + (endLat - startLat) * t + wobble,
      lng: startLng + (endLng - startLng) * t + wobble * 0.7,
    });
  }
  return points;
}

// Sydney-area coordinates for realistic Australian demo data
const LOCATIONS: Record<string, { lat: number; lng: number; suburb: string }> = {
  home: { lat: -33.8536, lng: 151.2108, suburb: 'Surry Hills' },
  clientOffice: { lat: -33.8677, lng: 151.2073, suburb: 'Sydney CBD' },
  gym: { lat: -33.8614, lng: 151.2229, suburb: 'Darlinghurst' },
  airport: { lat: -33.9461, lng: 151.1772, suburb: 'Mascot' },
  warehouse: { lat: -33.8461, lng: 151.0548, suburb: 'Silverwater' },
  supplier: { lat: -33.8151, lng: 151.0011, suburb: 'Parramatta' },
  grocery: { lat: -33.8584, lng: 151.2197, suburb: 'Paddington' },
  park: { lat: -33.8722, lng: 151.2508, suburb: 'Bondi' },
  conference: { lat: -33.8756, lng: 151.2043, suburb: 'Darling Harbour' },
  dentist: { lat: -33.8843, lng: 151.2106, suburb: 'Redfern' },
};

function generateMockTrips(): Trip[] {
  const now = new Date();
  const trips: Trip[] = [];

  const routes = [
    { from: 'home', to: 'clientOffice', dist: 18.2, dur: 32 * 60, purpose: 'Business' as const },
    { from: 'clientOffice', to: 'warehouse', dist: 7.5, dur: 18 * 60, purpose: 'Business' as const },
    { from: 'gym', to: 'home', dist: 3.1, dur: 15 * 60, purpose: 'Personal' as const },
    { from: 'home', to: 'airport', dist: 42.3, dur: 48 * 60, purpose: 'Business' as const },
    { from: 'grocery', to: 'home', dist: 2.8, dur: 12 * 60, purpose: 'Personal' as const },
    { from: 'home', to: 'warehouse', dist: 25.6, dur: 35 * 60, purpose: 'Business' as const },
    { from: 'warehouse', to: 'supplier', dist: 12.9, dur: 22 * 60, purpose: 'Business' as const },
    { from: 'home', to: 'grocery', dist: 4.2, dur: 10 * 60, purpose: 'Personal' as const },
    { from: 'home', to: 'conference', dist: 15.7, dur: 28 * 60, purpose: 'Business' as const },
    { from: 'park', to: 'home', dist: 5.3, dur: 14 * 60, purpose: 'Personal' as const },
    { from: 'home', to: 'clientOffice', dist: 31.2, dur: 40 * 60, purpose: 'Business' as const },
    { from: 'home', to: 'dentist', dist: 6.4, dur: 16 * 60, purpose: 'Personal' as const },
  ];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const fromLoc = LOCATIONS[route.from];
    const toLoc = LOCATIONS[route.to];
    const dayOffset = Math.floor(i / 2);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - dayOffset);
    startDate.setHours(8 + (i % 4) * 2, Math.floor(Math.random() * 30), 0, 0);
    const endDate = new Date(startDate.getTime() + route.dur * 1000);

    trips.push({
      id: generateId(),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      startSuburb: fromLoc.suburb,
      endSuburb: toLoc.suburb,
      distance: route.dist,
      rawDistance: route.dist,
      duration: route.dur,
      purpose: route.purpose,
      routePoints: generateRoute(fromLoc.lat, fromLoc.lng, toLoc.lat, toLoc.lng),
      weekId: getWeekId(startDate),
      scalingFactor: 1.0,
      createdAt: startDate.toISOString(),
    });
  }

  return trips;
}

export function useMockTrips() {
  const trips = useAppStore((s) => s.trips);

  useEffect(() => {
    if (trips.length === 0) {
      const mockTrips = generateMockTrips();
      useAppStore.setState({ trips: mockTrips });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
