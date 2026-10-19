import {
  fetchAqiAt,
  fetchCurrentReading,
  fetchDailyAqi,
  fetchForecastBundle,
  type Coordinates,
  type CurrentReading,
  type DayAqi,
} from '@/api/openMeteo';
import {
  backendConfigured,
  fetchAirFromBackend,
  fetchHistoryFromBackend,
} from '@/api/backend';
import { loadReadingCache, saveReadingCache } from '@/lib/offline';

/**
 * Data gateway.
 *
 * Order of preference:
 *   1. `awanin-server` (shared cache, forecast, history, push subscriptions)
 *   2. Open-Meteo directly (so the app still works with no backend deployed)
 *   3. The last reading saved on the device, explicitly flagged as stale
 *
 * The screens never need to know which path answered; `reading.source` and
 * `reading.stale` are enough to label the card honestly.
 */

const KNOWN_SLUGS = new Set([
  'jakarta-pusat',
  'monas',
  'bundaran-hi',
  'gbk',
  'kota-tua',
]);

function cacheKeyFor(slug: string | undefined, location: Coordinates): string {
  if (slug && slug.length > 0) return slug;
  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
}

export async function fetchAirSmart(
  location: Coordinates,
  slug?: string,
): Promise<CurrentReading> {
  const cacheKey = cacheKeyFor(slug, location);

  if (backendConfigured()) {
    try {
      const { reading, hourly, forecast } = await fetchAirFromBackend(
        location.latitude,
        location.longitude,
      );
      const merged: CurrentReading = { ...reading, hourly, forecast };
      if (!merged.stale) saveReadingCache(cacheKey, merged);
      return merged;
    } catch {
      // Backend down or unreachable: direct Open-Meteo is the next best source.
    }
  }

  try {
    const [reading, bundle] = await Promise.all([
      fetchCurrentReading(location),
      fetchForecastBundle(location),
    ]);
    const merged: CurrentReading = {
      ...reading,
      source: 'direct',
      hourly: bundle.hourly.slice(0, 48),
      forecast: bundle.daily,
    };
    saveReadingCache(cacheKey, merged);
    return merged;
  } catch (error) {
    const cached = await loadReadingCache(cacheKey);
    if (cached) {
      return {
        ...cached.reading,
        source: 'cache',
        stale: true,
        cachedAt: cached.savedAt,
      };
    }
    throw error;
  }
}

/** AQI only — used by the map, the picker and the popular-location row. */
export async function fetchAqiSmart(
  location: Coordinates,
  slug?: string,
): Promise<number> {
  if (backendConfigured()) {
    try {
      const { reading } = await fetchAirFromBackend(location.latitude, location.longitude);
      return reading.aqi;
    } catch {
      // fall through
    }
  }
  return fetchAqiAt(location);
}

export async function fetchHistorySmart(
  pastDays: number,
  location: Coordinates,
  slug?: string,
): Promise<DayAqi[]> {
  if (backendConfigured() && slug && KNOWN_SLUGS.has(slug)) {
    try {
      return await fetchHistoryFromBackend(slug, pastDays);
    } catch {
      // fall through
    }
  }
  return fetchDailyAqi(pastDays, location);
}

/** Exposed for the location sheet / onboarding copy. */
export function isKnownLocationSlug(slug: string): boolean {
  return KNOWN_SLUGS.has(slug);
}
