/**
 * MileageTrack — top-level entry.
 *
 * Responsibilities (run BEFORE the React tree mounts):
 *   1. Install a global error handler so unhandled JS exceptions during
 *      startup are logged instead of silently crashing the app.
 *   2. Hand off to the normal expo-router entry.
 *
 * Background location tracking has been removed temporarily to isolate
 * a native crash on Android. Trips are now tracked manually via the UI
 * using foreground-only GPS while the app is open.
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
// eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
require('expo-router/entry');
