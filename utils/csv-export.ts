import { Trip, Settings } from '@/store/types';
import { formatDistance } from './geo';
import { formatDate, formatTime } from './time';

export function generateCSV(trips: Trip[], settings: Settings): string {
  const totalDistance = trips.reduce((sum, t) => sum + t.distance, 0);
  const businessTrips = trips.filter((t) => t.purpose === 'Business');
  const businessDistance = businessTrips.reduce((sum, t) => sum + t.distance, 0);
  const businessPct = totalDistance > 0 ? ((businessDistance / totalDistance) * 100).toFixed(1) : '0';

  const unit = settings.distanceUnit;
  const unitLabel = unit === 'km' ? 'km' : 'mi';

  // Header section
  const header = [
    `MileageTrack Export`,
    `Driver: ${settings.userName || 'Not set'}`,
    `Vehicle: ${settings.vehicleMake} ${settings.vehicleModel}`.trim(),
    `Starting Odometer: ${settings.startingOdometer} ${unitLabel}`,
    `Total Distance: ${formatDistance(totalDistance, unit)} ${unitLabel}`,
    `Business Mileage: ${businessPct}%`,
    ``,
    `Date,Start Time,End Time,Start Location,End Location,Distance (${unitLabel}),Duration,Purpose`,
  ];

  // Trip rows
  const rows = trips.map((trip) => {
    const date = formatDate(trip.startTime);
    const startTime = formatTime(trip.startTime);
    const endTime = formatTime(trip.endTime);
    const distance = formatDistance(trip.distance, unit);
    const durationMin = Math.round(trip.duration / 60000);
    const durationStr = `${durationMin} min`;

    return `${date},${startTime},${endTime},${trip.startSuburb},${trip.endSuburb},${distance},${durationStr},${trip.purpose}`;
  });

  return [...header, ...rows].join('\n');
}
