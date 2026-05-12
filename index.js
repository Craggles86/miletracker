/**
 * MileageTrack — top-level entry.
 *
 * Responsibilities (run BEFORE the React tree mounts):
 *   1. Install a global error handler so unhandled JS exceptions during
 *      startup are logged instead of silently crashing the app.
 *   2. Clear any stale TaskManager data from SharedPreferences so the native
 *      expo-task-manager module doesn't crash trying to restore dead tasks.
 *   3. Hand off to the normal expo-router entry.
 *
 * IMPORTANT: We deliberately do NOT register any TaskManager background task
 * here. Background GPS tracking is implemented as a foreground service driven
 * by `expo-location`'s `watchPositionAsync` plus a sticky notification — see
 * `utils/background-tracking.ts`. The service is started from the home screen
 * only AFTER permissions are granted, never at app launch.
 */

// eslint-disable-next-line no-console
console.log('[startup] index.js executing');

// ── 1. Global error handler ─────────────────────────────────────────────────
try {
  // ErrorUtils is a React Native global. It exists on native; on web it may
  // be undefined, which is fine — we just skip installation there.
  // eslint-disable-next-line no-undef
  const EU = typeof ErrorUtils !== 'undefined' ? ErrorUtils : global && global.ErrorUtils;
  if (EU && typeof EU.setGlobalHandler === 'function') {
    const prev = typeof EU.getGlobalHandler === 'function' ? EU.getGlobalHandler() : null;
    EU.setGlobalHandler((error, isFatal) => {
      try {
        // eslint-disable-next-line no-console
        console.error('[GlobalError]', isFatal ? 'FATAL' : 'non-fatal', error);
      } catch {
        // ignore
      }
      try {
        if (prev) prev(error, isFatal);
      } catch {
        // swallow — never allow the handler itself to throw
      }
    });
  }
  // eslint-disable-next-line no-console
  console.log('[startup] global error handler installed');
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[startup] failed to install global error handler', err);
}

// ── 2. Neutralise expo-task-manager at module level ─────────────────────────
// expo-task-manager's native Android module auto-links a TaskService that calls
// restoreTasks() from SharedPreferences on instantiation. If there are stale
// tasks saved (e.g. from a previous build that used TaskManager), the native
// code tries to re-register them, which can crash the app before React mounts.
// By calling unregisterAllTasksAsync as soon as the module is available, we
// ensure no leftover tasks persist.
try {
  // eslint-disable-next-line no-undef
  const { Platform } = require('react-native');
  if (Platform.OS !== 'web') {
    // Fire-and-forget — we don't await this because it would block the JS
    // thread. The important thing is that it runs ASAP after native init.
    Promise.resolve().then(async () => {
      try {
        const TaskManager = require('expo-task-manager');
        const registered = await TaskManager.getRegisteredTasksAsync();
        if (registered && registered.length > 0) {
          // eslint-disable-next-line no-console
          console.warn('[startup] Found stale TaskManager tasks, unregistering:', registered.map(t => t.taskName));
          await TaskManager.unregisterAllTasksAsync();
        }
        // eslint-disable-next-line no-console
        console.log('[startup] TaskManager cleanup complete');
      } catch (err) {
        // If expo-task-manager is not properly linked or crashes, swallow it.
        // eslint-disable-next-line no-console
        console.warn('[startup] TaskManager cleanup failed (safe to ignore):', err?.message || err);
      }
    });
  }
} catch {
  // Platform import failed (unlikely) — ignore
}

// ── 3. Hand off to expo-router ──────────────────────────────────────────────
// eslint-disable-next-line no-console
console.log('[startup] requiring expo-router/entry');
require('expo-router/entry');
