/**
 * MileageTrack — top-level entry.
 *
 * Responsibilities (run BEFORE the React tree mounts):
 *   1. Install a global error handler so unhandled JS exceptions during
 *      startup are logged instead of silently crashing the app.
 *   2. Hand off to the normal expo-router entry.
 *
 * IMPORTANT: We deliberately do NOT register any TaskManager background task
 * here. Background GPS tracking is implemented as a foreground service driven
 * by `expo-location`'s `watchPositionAsync` plus a sticky notification — see
 * `utils/background-tracking.ts`. The service is started from the home screen
 * only AFTER permissions are granted, never at app launch.
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

// ── 2. Hand off to expo-router ──────────────────────────────────────────────
require('expo-router/entry');
