import { BusinessHoursPerDay, DayOfWeek, TripPurpose } from '@/store/types';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Get the day of week as our DayOfWeek type */
export function getDayOfWeek(date: Date): DayOfWeek {
  const jsDay = date.getDay(); // 0=Sun, 1=Mon, ...
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return DAYS[idx];
}

/** Parse "HH:mm" into hours and minutes */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

/** Determine trip purpose based on business hours config */
export function classifyTrip(
  startTime: number,
  businessHours: BusinessHoursPerDay,
  logAllAsBusiness: boolean
): TripPurpose {
  if (logAllAsBusiness) return 'Business';

  const date = new Date(startTime);
  const day = getDayOfWeek(date);
  const config = businessHours[day];

  if (!config.enabled) return 'Personal';

  const start = parseTime(config.startTime);
  const end = parseTime(config.endTime);
  const tripMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  return tripMinutes >= startMinutes && tripMinutes <= endMinutes
    ? 'Business'
    : 'Personal';
}

/** Format a date for display */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format time for display */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Check if it's time for weekly odometer prompt (Sunday evening or Monday morning) */
export function shouldShowOdometerPrompt(lastWeekId: string): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Sunday after 6pm or Monday before noon
  const isPromptTime = (day === 0 && hour >= 18) || (day === 1 && hour < 12);
  if (!isPromptTime) return false;

  const { getWeekId } = require('./geo');
  const currentWeek = getWeekId(now);
  return currentWeek !== lastWeekId;
}

/** Generate a unique ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
