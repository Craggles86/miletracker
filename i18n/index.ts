import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from './locales/en';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { nl } from './locales/nl';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
import { zhTW } from './locales/zh-TW';
import { ko } from './locales/ko';
import { ar } from './locales/ar';
import { ru } from './locales/ru';
import { hi } from './locales/hi';
import { tr } from './locales/tr';
import { pl } from './locales/pl';
import { sv } from './locales/sv';
import { no } from './locales/no';
import { da } from './locales/da';
import { fi } from './locales/fi';
import { th } from './locales/th';
import { id } from './locales/id';
import { ms } from './locales/ms';
import { vi } from './locales/vi';
import { el } from './locales/el';
import { cs } from './locales/cs';
import { hu } from './locales/hu';
import { ro } from './locales/ro';
import { uk } from './locales/uk';
import { he } from './locales/he';

export const translations = {
  en,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  ja,
  zh,
  'zh-TW': zhTW,
  ko,
  ar,
  ru,
  hi,
  tr,
  pl,
  sv,
  no,
  da,
  fi,
  th,
  id,
  ms,
  vi,
  el,
  cs,
  hu,
  ro,
  uk,
  he,
};

export const SUPPORTED_LOCALES = Object.keys(translations);

export const i18n = new I18n(translations, {
  enableFallback: true,
  defaultLocale: 'en',
});

/**
 * Given a device locale (e.g. "en-AU", "zh-Hant-TW"), return the matching key
 * from our translations dictionary. Falls back to English when unsupported.
 */
export function resolveLocale(deviceLocale: string | null | undefined): string {
  if (!deviceLocale) return 'en';
  const tag = deviceLocale.trim();
  if (!tag) return 'en';

  // Chinese: distinguish Traditional vs Simplified
  if (/^zh/i.test(tag)) {
    const lower = tag.toLowerCase();
    if (lower.includes('hant') || lower.includes('tw') || lower.includes('hk') || lower.includes('mo')) {
      return 'zh-TW';
    }
    return 'zh';
  }

  // Norwegian variants
  if (/^(nb|nn|no)/i.test(tag)) return 'no';

  // Exact match (e.g. "en", "de")
  const primary = tag.split('-')[0].toLowerCase();
  if (primary in translations) return primary;
  return 'en';
}

/**
 * Determine the user's device language and configure i18n accordingly.
 * Returns the resolved locale key so callers can also use it for other
 * locale-dependent logic (e.g. default distance unit).
 */
export function initialiseI18n(): string {
  let deviceLocale: string | null = null;
  try {
    const locales = Localization.getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      const first = locales[0];
      deviceLocale = first.languageTag || first.languageCode || null;
    }
  } catch (err) {
    console.warn('[i18n] failed to read device locale', err);
  }

  const resolved = resolveLocale(deviceLocale);
  i18n.locale = resolved;
  return resolved;
}

/**
 * Detect the device's region code so the app can pick a sensible default
 * distance unit. Returns the region (ISO 3166-1 alpha-2) or null if unknown.
 */
export function getDeviceRegionCode(): string | null {
  try {
    const locales = Localization.getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      return (locales[0].regionCode || '').toUpperCase() || null;
    }
  } catch (err) {
    console.warn('[i18n] failed to read region', err);
  }
  return null;
}

/**
 * Countries that use miles as the primary distance unit.
 * US, UK, and Myanmar — as per task requirements.
 */
const MILES_REGIONS = new Set(['US', 'GB', 'UK', 'MM']);

export function getDefaultDistanceUnitForRegion(region?: string | null): 'km' | 'miles' {
  if (region && MILES_REGIONS.has(region.toUpperCase())) return 'miles';
  return 'km';
}
