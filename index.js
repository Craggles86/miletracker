/**
 * MileageTrack — top-level entry.
 *
 * Responsibilities (run BEFORE the React tree mounts):
 *   1. Install a global error handler so unhandled JS exceptions during
 *      startup are logged instead of silently crashing the app.
 *   2. Define the background location task. expo-task-manager requires
 *      defineTask() to be called at the absolute top level of the JS
 *      bundle so the task is registered before the OS delivers any
 *      deferred background-location events.
 *   3. Hand off to the normal expo-router entry.
 *
 * Every step is wrapped in try/catch — the worst outcome of any startup
 * failure here is that background tracking is disabled. The app must
 * always render.
 */

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
        // Log loudly so the error surfaces in logcat / Metro / Sentry.
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
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[startup] failed to install global error handler', err);
}

// ── 2. Define background location task at top level ─────────────────────────
// Doing this in a plain try/catch means a failure (missing native module,
// mis-linked prebuild, etc.) cannot block the app from starting.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  const { defineBackgroundLocationTask } = require('./utils/background-location-task');
  if (typeof defineBackgroundLocationTask === 'function') {
    defineBackgroundLocationTask();
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[startup] defineBackgroundLocationTask failed', err);
}

// ── 3. Hand off to expo-router ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
require('expo-router/entry');
