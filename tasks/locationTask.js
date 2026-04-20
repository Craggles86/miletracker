/**
 * Background location task.
 *
 * ⚠️ This module is imported from `index.js` BEFORE the React tree mounts so
 * that `TaskManager.defineTask` runs at the top level, synchronously, exactly
 * once. That is an iOS/Android requirement — if we called defineTask from
 * inside a component (or an async effect) the OS could wake the app for a
 * background location delivery and find no registered handler, which
 * historically caused a native crash on Android on startup.
 *
 * Everything in this file is wrapped in try/catch: even if the native module
 * is missing or the task body throws, the app must never be prevented from
 * booting.
 */

const { Platform } = require('react-native');

// ────────────────────────────────────────────────────────────────────────────
// Constants (exported as plain strings so they stay importable from .ts files)
// ────────────────────────────────────────────────────────────────────────────

const LOCATION_TASK_NAME = 'mileagetrack-background-location';

// Trip auto-detection thresholds
const MOVING_SPEED_KMH = 10;           // trip starts above this
const STATIONARY_SPEED_KMH = 3;         // considered "stopped" below this
const STATIONARY_RADIUS_M = 20;         // must stay within this radius
const STATIONARY_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// AsyncStorage keys
const STORAGE_KEY_STATE = 'mileagetrack.bgTripState.v1';
const STORAGE_KEY_PENDING = 'mileagetrack.bgPendingTrips.v1';
const STORAGE_KEY_ENABLED = 'mileagetrack.bgEnabled.v1';

// ────────────────────────────────────────────────────────────────────────────
// Helpers — all defensive, all sync-safe
// ────────────────────────────────────────────────────────────────────────────

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function genId() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}

async function readJson(AsyncStorage, key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(AsyncStorage, key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — background storage failures shouldn't crash
  }
}

async function safeNotify(title, body) {
  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // notifications may not be configured; that's fine
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Task body — runs on every background location batch
// ────────────────────────────────────────────────────────────────────────────

async function handleLocationBatch(locations) {
  if (!Array.isArray(locations) || locations.length === 0) return;

  let AsyncStorage;
  try {
    AsyncStorage =
      require('@react-native-async-storage/async-storage').default;
  } catch {
    return; // nothing we can do without storage
  }

  const state = await readJson(AsyncStorage, STORAGE_KEY_STATE, null);
  let active = state && state.active ? state.active : null;

  for (const loc of locations) {
    if (!loc || !loc.coords) continue;
    const { latitude, longitude, speed } = loc.coords;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') continue;

    const speedKmh = Math.max(0, (typeof speed === 'number' ? speed : 0) * 3.6);
    const timestamp = typeof loc.timestamp === 'number' ? loc.timestamp : Date.now();

    if (!active) {
      // Not in a trip — start one when moving fast enough
      if (speedKmh >= MOVING_SPEED_KMH) {
        active = {
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
        await safeNotify(
          'Trip started',
          'MileageTrack is logging your journey automatically.'
        );
      }
      continue;
    }

    // In an active trip — accumulate distance
    const segment =
      haversineMeters(active.lastLat, active.lastLng, latitude, longitude) /
      1000;
    // Guard against GPS jitter teleports
    if (segment < 2) {
      active.distanceKm += segment;
    }
    if (speedKmh > active.maxSpeedKmh) active.maxSpeedKmh = speedKmh;
    active.lastLat = latitude;
    active.lastLng = longitude;
    active.lastTimestamp = timestamp;

    // Append route point if sufficiently far from the last one
    const rp = active.routePoints;
    const prev = rp.length > 0 ? rp[rp.length - 1] : null;
    if (!prev || haversineMeters(prev.lat, prev.lng, latitude, longitude) >= 15) {
      rp.push({ lat: latitude, lng: longitude });
      if (rp.length > 2000) rp.splice(0, rp.length - 2000); // cap memory
    }

    // Stationary detection (5 min within 20m radius)
    if (speedKmh < STATIONARY_SPEED_KMH) {
      if (!active.stationaryAnchor) {
        active.stationaryAnchor = { lat: latitude, lng: longitude };
        active.stationarySince = timestamp;
      } else {
        const dist = haversineMeters(
          active.stationaryAnchor.lat,
          active.stationaryAnchor.lng,
          latitude,
          longitude
        );
        if (dist > STATIONARY_RADIUS_M) {
          // moved outside anchor — reset
          active.stationaryAnchor = { lat: latitude, lng: longitude };
          active.stationarySince = timestamp;
        } else if (
          active.stationarySince &&
          timestamp - active.stationarySince >= STATIONARY_DURATION_MS
        ) {
          // Trip ends
          const pending = await readJson(AsyncStorage, STORAGE_KEY_PENDING, []);
          const endTime = new Date(timestamp).toISOString();
          const durationSec = Math.max(
            1,
            Math.round(
              (new Date(endTime).getTime() -
                new Date(active.startTime).getTime()) /
                1000
            )
          );
          pending.push({
            id: active.id,
            startTime: active.startTime,
            endTime,
            startLat: active.startLat,
            startLng: active.startLng,
            endLat: latitude,
            endLng: longitude,
            distanceKm: active.distanceKm,
            duration: durationSec,
            routePoints: active.routePoints,
            source: 'background',
          });
          await writeJson(AsyncStorage, STORAGE_KEY_PENDING, pending);
          active = null;
          await safeNotify(
            'Trip ended',
            'Your trip was saved. Open MileageTrack to review it.'
          );
          continue;
        }
      }
    } else {
      // moving — clear any stationary anchor
      active.stationaryAnchor = null;
      active.stationarySince = null;
    }
  }

  await writeJson(AsyncStorage, STORAGE_KEY_STATE, { active });
}

// ────────────────────────────────────────────────────────────────────────────
// Register the task at module load — TOP-LEVEL, synchronous, once.
// ────────────────────────────────────────────────────────────────────────────

let registered = false;
try {
  // Skip on web — expo-task-manager is native-only
  if (Platform.OS !== 'web') {
    const TaskManager = require('expo-task-manager');
    if (TaskManager && typeof TaskManager.defineTask === 'function') {
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
        try {
          if (error) {
            console.warn('[bgLocationTask] error event', error);
            return;
          }
          if (!data) return;
          const locations = data.locations || [];
          await handleLocationBatch(locations);
        } catch (err) {
          console.warn('[bgLocationTask] task body threw', err);
        }
      });
      registered = true;
    }
  }
} catch (err) {
  console.warn('[bgLocationTask] failed to register task', err);
}

module.exports = {
  LOCATION_TASK_NAME,
  STORAGE_KEY_STATE,
  STORAGE_KEY_PENDING,
  STORAGE_KEY_ENABLED,
  MOVING_SPEED_KMH,
  STATIONARY_SPEED_KMH,
  STATIONARY_RADIUS_M,
  STATIONARY_DURATION_MS,
  isRegistered: () => registered,
};
