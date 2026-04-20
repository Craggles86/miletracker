/**
 * MileageTrack — top-level entry.
 *
 * Responsibilities (run BEFORE the React tree mounts):
 *   1. Install a global error handler so unhandled JS exceptions during
 *      startup are logged instead of silently crashing the app.
 *   2. Register the background location TaskManager task at the top level.
 *      `TaskManager.defineTask` MUST be called synchronously at module-load
 *      time so the task is registered before the OS can wake us with a
 *      background location delivery. Calling it inside a component, hook, or
 *      async effect leads to a native crash on Android when the app is woken
 *      in the background with no registered handler. The require is wrapped
 *      in try/catch so a missing/broken module can never block startup.
 *   3. Hand off to the normal expo-router entry.
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

// ── 2. Register background location task (synchronous, top-level) ───────────
// The require itself runs defineTask — see ./tasks/locationTask.js. This must
// happen *before* expo-router/entry so the task is known to the OS when the
// React tree mounts.
try {
  require('./tasks/locationTask');
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[startup] failed to register background location task', err);
}

// ── 3. Hand off to expo-router ──────────────────────────────────────────────
require('expo-router/entry');
