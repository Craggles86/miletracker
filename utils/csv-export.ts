import type { Trip, Settings } from '@/store/types';

// Build the CSV string for export
export function generateCSV(
  trips: Trip[],
  settings: Settings
): string {
  const sortedTrips = [...trips].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const totalDistance = sortedTrips.reduce((sum, t) => sum + t.distance, 0);
  const businessDistance = sortedTrips
    .filter((t) => t.purpose === 'Business')
    .reduce((sum, t) => sum + t.distance, 0);
  const businessPct = totalDistance > 0 ? ((businessDistance / totalDistance) * 100).toFixed(1) : '0.0';

  const startOdo = settings.startingOdometer ?? 0;
  const endOdo = startOdo + totalDistance;
  const unitLabel = settings.distanceUnit === 'miles' ? 'mi' : 'km';

  const lines: string[] = [];

  // Header section
  lines.push('MileageTrack — Mileage Log Export');
  lines.push(`Name,${csvEscape(settings.userName || 'Not set')}`);
  lines.push(`Vehicle,${csvEscape([settings.vehicleMake, settings.vehicleModel].filter(Boolean).join(' ') || 'Not set')}`);
  lines.push(`Starting Odometer (${unitLabel}),${startOdo.toFixed(1)}`);
  lines.push(`Ending Odometer (${unitLabel}),${endOdo.toFixed(1)}`);
  lines.push(`Business Mileage %,${businessPct}%`);
  lines.push(`Total Distance (${unitLabel}),${convert(totalDistance, settings.distanceUnit)}`);
  lines.push(`Business Distance (${unitLabel}),${convert(businessDistance, settings.distanceUnit)}`);
  lines.push('');

  // Column headers
  lines.push('Date,Time,Start Odometer,Start Suburb,End Suburb,End Odometer,Distance,Classification');

  // Trip rows
  let runningOdo = startOdo;
  for (const trip of sortedTrips) {
    const d = new Date(trip.startTime);
    const dateStr = d.toLocaleDateString('en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
    const tripStartOdo = runningOdo;
    const tripDist = convertNum(trip.distance, settings.distanceUnit);
    runningOdo += tripDist;

    lines.push([
      dateStr,
      timeStr,
      tripStartOdo.toFixed(1),
      csvEscape(trip.startSuburb),
      csvEscape(trip.endSuburb),
      runningOdo.toFixed(1),
      tripDist.toFixed(1),
      trip.purpose,
    ].join(','));
  }

  return lines.join('\n');
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function convertNum(km: number, unit: 'km' | 'miles'): number {
  return unit === 'miles' ? km * 0.621371 : km;
}

function convert(km: number, unit: 'km' | 'miles'): string {
  return convertNum(km, unit).toFixed(1);
}

// Trigger the CSV share/save using expo APIs
export async function exportCSV(csvContent: string): Promise<void> {
  try {
    // Use legacy API which is re-exported for backwards compat
    const fsModule = await import('expo-file-system');
    const sharingModule = await import('expo-sharing');

    // Access the legacy compat layer
    const docDir =
      ('documentDirectory' in fsModule ? (fsModule as Record<string, unknown>).documentDirectory : null) as string | null;
    const writeAsync =
      ('writeAsStringAsync' in fsModule ? (fsModule as Record<string, unknown>).writeAsStringAsync : null) as
        ((uri: string, contents: string, options?: { encoding?: string }) => Promise<void>) | null;

    if (!docDir || !writeAsync) {
      console.warn('File system API not available');
      return;
    }

    const fileUri = docDir + 'mileagetrack-export.csv';
    await writeAsync(fileUri, csvContent, { encoding: 'utf8' });

    const isAvailable = await sharingModule.isAvailableAsync();
    if (isAvailable) {
      await sharingModule.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export MileageTrack Data',
        UTI: 'public.comma-separated-values-text',
      });
    }
  } catch (err) {
    // Silently fail on platforms without file system or sharing
    console.warn('CSV export not available:', err);
  }
}
