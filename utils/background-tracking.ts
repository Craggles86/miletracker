/**
 * Persistent foreground-service GPS trip tracking.
 *
 * Approach — NOT based on TaskManager:
 *  • Uses `expo-location`'s `watchPositionAsync` in foreground mode to stream
 *    GPS updates while the service is active.
 *  • Posts a sticky "ongoing" notification via `expo-notifications` that keeps
 *    the app process alive in the background on Android, the same way Google
 *    Maps / navigation apps stay running. On iOS the combination of
 *    `UIBackgroundModes: ['location']` + `showsBackgroundLocationIndicator`
 *    keeps the watcher receiving updates while backgrounded.
 *  • Auto-detects trips on the JS side from the stream of location updates:
 *       • trip starts when speed > 10 km/h
 *       • trip ends when stationary (< 3 km/h) within 20m for 5 minutes
 *  • Pushes a notification on trip start / trip end and writes the finalised
 *    trip straight into the Zustand store.
 *
 * The service must NEVER be started at app launch. It is started from the
 * home screen only after the user has granted the required permissions.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LatLng, Trip } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { getWeekId, isWithinBusinessHours } from '@/utils/helpers';
import { t } from '@/i18n/useTranslation';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY_ENABLED = 'mileagetrack.bgEnabled.v2';

const PERSISTENT_NOTIFICATION_ID = 'mileagetrack-bg-service';
const PERSISTENT_CHANNEL_ID = 'mileagetrack-bg-service';

const MOVING_SPEED_KMH = 10;
const STATIONARY_SPEED_KMH = 3;
const STATIONARY_RADIUS_M = 20;
const STATIONARY_DURATION_MS = 5 * 60 * 1000;
const ROUTE_POINT_MIN_DISTANCE_M = 15;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface BackgroundPermissionResult {
  foreground: 'granted' | 'denied' | 'undetermined';
  background: 'granted' | 'denied' | 'undetermined';
  notifications: 'granted' | 'denied' | 'undetermined';
}

type LocationModule = typeof import('expo-location');
type NotificationsModule = typeof import('expo-notifications');

interface ActiveTripState {
  id: string;
  startTime: string;
  startLat: number;
  startLng: number;
  lastLat: number;
  lastLng: number;
  lastTimestamp: number;
  distanceKm: number;
  maxSpeedKmh: number;
  routePoints: LatLng[];
  stationarySince: number | null;
  stationaryAnchor: LatLng | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Lazy module loaders (so web / missing modules never crash the app)
// ────────────────────────────────────────────────────────────────────────────

async function loadLocation(): Promise<LocationModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-location');
  } catch (err) {
    console.warn('[bgTracking] expo-location unavailable', err);
    return null;
  }
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-notifications');
  } catch (err) {
    console.warn('[bgTracking] expo-notifications unavailable', err);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Module-level service state (single instance per JS context)
// ────────────────────────────────────────────────────────────────────────────

let watchSubscription: { remove: () => void } | null = null;
let activeTrip: ActiveTripState | null = null;
let starting = false;

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function genId(): string {
  return (
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  );
}

async function reverseGeocodeSuburb(lat: number, lng: number): Promise<string> {
  const Location = await loadLocation();
  if (!Location) return 'Unknown';
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    if (results.length > 0) {
      return (
        results[0].subregion ||
        results[0].city ||
        results[0].district ||
        results[0].region ||
        'Unknown'
      );
    }
  } catch {
    // fall through
  }
  return 'Unknown';
}

async function fireNotification(title: string, body: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // ignore — notifications may not be granted
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Persistent foreground-service notification
// ────────────────────────────────────────────────────────────────────────────

async function ensurePersistentChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.setNotificationChannelAsync(PERSISTENT_CHANNEL_ID, {
      name: t('notifications.persistentChannelName'),
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      sound: null,
      lightColor: '#4F46E5',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
      enableVibrate: false,
      bypassDnd: false,
    });
  } catch (err) {
    console.warn('[bgTracking] failed to create persistent channel', err);
  }
}

async function showPersistentNotification(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await ensurePersistentChannel();
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: PERSISTENT_NOTIFICATION_ID,
      content: {
        title: t('notifications.persistentTitle'),
        body: t('notifications.persistentBody'),
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android'
          ? { color: '#4F46E5', priority: 'low' as const }
          : {}),
      },
      trigger:
        Platform.OS === 'android'
          ? { channelId: PERSISTENT_CHANNEL_ID }
          : null,
    });
  } catch (err) {
    console.warn('[bgTracking] failed to show persistent notification', err);
  }
}

async function hidePersistentNotification(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.dismissNotificationAsync(PERSISTENT_NOTIFICATION_ID);
  } catch {
    // ignore
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(
      PERSISTENT_NOTIFICATION_ID
    );
  } catch {
    // ignore
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Permissions
// ────────────────────────────────────────────────────────────────────────────

export async function checkBackgroundPermissions(): Promise<BackgroundPermissionResult> {
  const result: BackgroundPermissionResult = {
    foreground: 'undetermined',
    background: 'undetermined',
    notifications: 'undetermined',
  };

  const Location = await loadLocation();
  if (Location) {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      result.foreground = fg.status as BackgroundPermissionResult['foreground'];
    } catch {
      // ignore
    }
    try {
      const bg = await Location.getBackgroundPermissionsAsync();
      result.background = bg.status as BackgroundPermissionResult['background'];
    } catch {
      // ignore
    }
  }

  const Notifications = await loadNotifications();
  if (Notifications) {
    try {
      const n = await Notifications.getPermissionsAsync();
      result.notifications =
        n.status as BackgroundPermissionResult['notifications'];
    } catch {
      // ignore
    }
  }

  return result;
}

export async function requestBackgroundPermissions(): Promise<BackgroundPermissionResult> {
  const result: BackgroundPermissionResult = {
    foreground: 'undetermined',
    background: 'undetermined',
    notifications: 'undetermined',
  };

  const Location = await loadLocation();
  if (!Location) return result;

  // Step 1: foreground first
  try {
    const fg = await Location.requestForegroundPermissionsAsync();
    result.foreground = fg.status as BackgroundPermissionResult['foreground'];
  } catch (err) {
    console.warn('[bgTracking] foreground permission request failed', err);
    result.foreground = 'denied';
  }

  // Step 2: background (only meaningful after foreground granted)
  if (result.foreground === 'granted') {
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      result.background = bg.status as BackgroundPermissionResult['background'];
    } catch (err) {
      console.warn('[bgTracking] background permission request failed', err);
      result.background = 'denied';
    }
  }

  // Step 3: notifications (needed for the persistent service notification)
  const Notifications = await loadNotifications();
  if (Notifications) {
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === 'granted') {
        result.notifications = 'granted';
      } else {
        const req = await Notifications.requestPermissionsAsync();
        result.notifications =
          req.status as BackgroundPermissionResult['notifications'];
      }
    } catch (err) {
      console.warn('[bgTracking] notifications perm request failed', err);
      result.notifications = 'denied';
    }
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// Trip state (in-memory) → pushes finalised trips into the store
// ────────────────────────────────────────────────────────────────────────────

async function finaliseTrip(trip: ActiveTripState, endTimestamp: number) {
  if (trip.distanceKm < 0.1) return; // noise

  const endTimeIso = new Date(endTimestamp).toISOString();
  const durationSec = Math.max(
    1,
    Math.round(
      (new Date(endTimeIso).getTime() - new Date(trip.startTime).getTime()) /
        1000
    )
  );

  const [startSuburb, endSuburb] = await Promise.all([
    reverseGeocodeSuburb(trip.startLat, trip.startLng),
    reverseGeocodeSuburb(trip.lastLat, trip.lastLng),
  ]);

  const state = useAppStore.getState();
  const isBusiness =
    state.settings.logAllAsBusiness ||
    isWithinBusinessHours(state.settings.businessHoursPerDay);

  const finalised: Omit<Trip, 'id' | 'createdAt'> = {
    startTime: trip.startTime,
    endTime: endTimeIso,
    startSuburb,
    endSuburb,
    distance: trip.distanceKm,
    rawDistance: trip.distanceKm,
    duration: durationSec,
    purpose: isBusiness ? 'Business' : 'Personal',
    routePoints: trip.routePoints,
    weekId: getWeekId(new Date(trip.startTime)),
    scalingFactor: 1.0,
  };

  state.addTrip(finalised);
}

function handleLocationUpdate(
  latitude: number,
  longitude: number,
  speedMps: number | null | undefined,
  timestamp: number
): void {
  const speedKmh = Math.max(0, (typeof speedMps === 'number' ? speedMps : 0) * 3.6);

  if (!activeTrip) {
    // Not in a trip — start one when moving fast enough
    if (speedKmh >= MOVING_SPEED_KMH) {
      activeTrip = {
        id: genId(),
        startTime: new Date(timestamp).toISOString(),
        startLat: latitude,
        startLng: longitude,
        lastLat: latitude,
        lastLng: longitude,
        lastTimestamp: timestamp,
        distanceKm: 0,
        maxSpeedKmh: speedKmh,
        routePoints: [{ lat: latitude, lng: longitude }],
        stationarySince: null,
        stationaryAnchor: null,
      };
      fireNotification(
        t('notifications.tripStartedTitle'),
        t('notifications.autoTripStartBody')
      ).catch(() => {});
    }
    return;
  }

  // In an active trip — accumulate distance
  const segmentKm =
    haversineMeters(
      activeTrip.lastLat,
      activeTrip.lastLng,
      latitude,
      longitude
    ) / 1000;
  if (segmentKm < 2) {
    activeTrip.distanceKm += segmentKm;
  }
  if (speedKmh > activeTrip.maxSpeedKmh) activeTrip.maxSpeedKmh = speedKmh;
  activeTrip.lastLat = latitude;
  activeTrip.lastLng = longitude;
  activeTrip.lastTimestamp = timestamp;

  // Route point sampling
  const rp = activeTrip.routePoints;
  const prev = rp.length > 0 ? rp[rp.length - 1] : null;
  if (
    !prev ||
    haversineMeters(prev.lat, prev.lng, latitude, longitude) >=
      ROUTE_POINT_MIN_DISTANCE_M
  ) {
    rp.push({ lat: latitude, lng: longitude });
    if (rp.length > 2000) rp.splice(0, rp.length - 2000);
  }

  // Stationary detection (5 min within 20 m)
  if (speedKmh < STATIONARY_SPEED_KMH) {
    if (!activeTrip.stationaryAnchor) {
      activeTrip.stationaryAnchor = { lat: latitude, lng: longitude };
      activeTrip.stationarySince = timestamp;
    } else {
      const dist = haversineMeters(
        activeTrip.stationaryAnchor.lat,
        activeTrip.stationaryAnchor.lng,
        latitude,
        longitude
      );
      if (dist > STATIONARY_RADIUS_M) {
        activeTrip.stationaryAnchor = { lat: latitude, lng: longitude };
        activeTrip.stationarySince = timestamp;
      } else if (
        activeTrip.stationarySince &&
        timestamp - activeTrip.stationarySince >= STATIONARY_DURATION_MS
      ) {
        const toFinalise = activeTrip;
        const endTs = timestamp;
        activeTrip = null;
        finaliseTrip(toFinalise, endTs)
          .then(() =>
            fireNotification(
              t('notifications.tripEndedTitle'),
              t('notifications.autoTripEndBody')
            )
          )
          .catch((err) => console.warn('[bgTracking] finalise failed', err));
      }
    }
  } else {
    activeTrip.stationaryAnchor = null;
    activeTrip.stationarySince = null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Service lifecycle
// ────────────────────────────────────────────────────────────────────────────

export function isBackgroundTrackingActive(): boolean {
  return watchSubscription !== null;
}

export async function wasBackgroundTrackingEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_ENABLED);
    return val === '1';
  } catch {
    return false;
  }
}

export async function enableBackgroundTracking(): Promise<{
  ok: boolean;
  reason?: 'unsupported' | 'permission' | 'error';
}> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  if (starting) return { ok: true };
  if (watchSubscription) return { ok: true };
  starting = true;

  try {
    const Location = await loadLocation();
    if (!Location) return { ok: false, reason: 'unsupported' };

    const perms = await requestBackgroundPermissions();
    if (perms.foreground !== 'granted') {
      return { ok: false, reason: 'permission' };
    }
    // Background permission is strongly recommended but we can still track
    // while foregrounded with a persistent notification.
    if (perms.background !== 'granted') {
      return { ok: false, reason: 'permission' };
    }

    // Show the sticky notification FIRST — on Android this is what promotes
    // the app to a foreground service and keeps GPS alive in the background.
    await showPersistentNotification();

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 4000,
          distanceInterval: 10,
          mayShowUserSettingsDialog: true,
          // iOS-only hints: keep updates flowing while backgrounded and show
          // the blue status-bar indicator so users know we're still tracking.
          ...(Platform.OS === 'ios'
            ? {
                activityType: Location.ActivityType.AutomotiveNavigation,
                pausesUpdatesAutomatically: false,
                showsBackgroundLocationIndicator: true,
              }
            : {}),
        },
        (location) => {
          try {
            handleLocationUpdate(
              location.coords.latitude,
              location.coords.longitude,
              location.coords.speed,
              typeof location.timestamp === 'number'
                ? location.timestamp
                : Date.now()
            );
          } catch (err) {
            console.warn('[bgTracking] update handler threw', err);
          }
        }
      );
      watchSubscription = sub;
    } catch (err) {
      console.warn('[bgTracking] watchPositionAsync failed', err);
      await hidePersistentNotification();
      return { ok: false, reason: 'error' };
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ENABLED, '1');
    } catch {
      // ignore
    }
    return { ok: true };
  } finally {
    starting = false;
  }
}

export async function disableBackgroundTracking(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_ENABLED, '0');
  } catch {
    // ignore
  }

  if (watchSubscription) {
    try {
      watchSubscription.remove();
    } catch {
      // ignore
    }
    watchSubscription = null;
  }

  // If a trip was mid-flight when the service stopped, finalise it so we
  // don't lose mileage.
  if (activeTrip) {
    const toFinalise = activeTrip;
    activeTrip = null;
    try {
      await finaliseTrip(toFinalise, Date.now());
      await fireNotification(
        t('notifications.tripEndedTitle'),
        t('notifications.stoppedTripEndBody')
      );
    } catch (err) {
      console.warn('[bgTracking] finalise on disable failed', err);
    }
  }

  await hidePersistentNotification();
}

// Kept as a no-op for backwards compatibility — trips are now written
// directly into the store as they complete, so there is nothing to sync.
export async function syncPendingBackgroundTrips(): Promise<number> {
  return 0;
}
