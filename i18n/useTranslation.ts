import { useSyncExternalStore } from 'react';
import { i18n } from './index';

type Listener = () => void;
const listeners = new Set<Listener>();
let currentLocale = i18n.locale;

/**
 * Notify all React components that depend on the current locale so they
 * re-render. Call this whenever `i18n.locale` is programmatically changed.
 */
export function notifyLocaleChange() {
  currentLocale = i18n.locale;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore subscriber errors
    }
  });
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return currentLocale;
}

/**
 * `t` returns a translated string for the given key using i18n-js. Keys are
 * dot-notated (e.g. `home.startTrip`).
 *
 * `locale` is the currently-active locale; components subscribed via this
 * hook will re-render automatically if it changes.
 */
export function useTranslation() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const t = (key: string, options?: Record<string, unknown>): string => {
    return i18n.t(key, options);
  };
  return { t, locale };
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}
