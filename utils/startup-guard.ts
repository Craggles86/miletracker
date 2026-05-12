/**
 * Startup safety utilities.
 *
 * These helpers ensure that optional native module calls during app
 * initialisation can never crash the app. On Android, an unhandled native
 * exception during the first ~2 seconds of JS execution kills the process
 * before React can mount an error boundary.
 */

import { Platform } from 'react-native';

/**
 * Run an async initialisation step safely. If it throws or takes longer than
 * the timeout, log a warning and return null instead of crashing.
 */
export async function safeInit<T>(
  label: string,
  fn: () => Promise<T>,
  timeoutMs = 5000
): Promise<T | null> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<null>((resolve) =>
        setTimeout(() => {
          console.warn(`[safeInit] ${label} timed out after ${timeoutMs}ms`);
          resolve(null);
        }, timeoutMs)
      ),
    ]);
    return result;
  } catch (err) {
    console.warn(`[safeInit] ${label} failed:`, err);
    return null;
  }
}

/**
 * Checks whether we are on a real Android device (not web, not iOS).
 * Useful for gating Android-specific workarounds.
 */
export function isAndroid(): boolean {
  return Platform.OS === 'android';
}

/**
 * Checks whether we are running on a native platform (iOS or Android).
 */
export function isNative(): boolean {
  return Platform.OS !== 'web';
}
