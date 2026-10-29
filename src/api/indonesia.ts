/**
 * Nationwide AQI: one Open-Meteo request for every city in `INDONESIA_CITIES`.
 *
 * The endpoint accepts comma-separated coordinate lists and answers with an
 * array in the same order, so 100 cities cost one HTTP call. Two deliberate
 * choices keep the free tier safe:
 *
 * - The result is cached for ten minutes and shared in-flight requests are
 *   de-duplicated (ten screens mounting at once still make one call).
 * - `force` (pull-to-refresh) is ignored for the first minute, because each
 *   refresh is weighted by the number of locations and a held-down refresh
 *   control could otherwise burn the daily quota.
 *
 * This bypasses the backend on purpose: `awanin-server` exposes one point per
 * call, and adding a nationwide endpoint there would duplicate the same Open-
 * Meteo query on the server for no benefit.
 */
import { INDONESIA_CITIES } from '@/data/indonesiaCities';
import { OpenMeteoTimeoutError } from '@/api/openMeteo';
import {
  parseAqiBatch,
  parseHourlyTrend,
  type AqiTrend,
  type CityAqi,
  type TrendPoint,
} from '@/lib/indonesia';

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const CACHE_TTL_MS = 10 * 60_000;
const MIN_REFRESH_MS = 60_000;
const TREND_TTL_MS = 30 * 60_000;

export type IndonesiaReading = {
  readings: CityAqi[];
  /** Epoch ms of the response that produced these numbers */
  fetchedAt: number;
};

let cache: IndonesiaReading | null = null;
let cacheAt = 0;
let inFlight: Promise<IndonesiaReading> | null = null;

export async function fetchIndonesiaAqi(options: { force?: boolean } = {}): Promise<IndonesiaReading> {
  const age = Date.now() - cacheAt;
  if (cache) {
    if (!options.force && age < CACHE_TTL_MS) return cache;
    if (options.force && age < MIN_REFRESH_MS) return cache;
  }
  if (!inFlight) {
    inFlight = load().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function load(): Promise<IndonesiaReading> {
  const url = new URL(ENDPOINT);
  url.searchParams.set('latitude', INDONESIA_CITIES.map((city) => city.latitude).join(','));
  url.searchParams.set('longitude', INDONESIA_CITIES.map((city) => city.longitude).join(','));
  // Only the current AQI: no hourly series, so the response stays small even
  // for a hundred points.
  url.searchParams.set('current', 'us_aqi');

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo ${response.status} ${response.statusText}`);
  }

  const payload: unknown = await response.json();
  const readings = parseAqiBatch(payload, INDONESIA_CITIES);
  if (readings.length === 0) {
    throw new Error('Open-Meteo tidak mengembalikan data AQI');
  }

  const value: IndonesiaReading = { readings, fetchedAt: Date.now() };
  cache = value;
  cacheAt = Date.now();
  return value;
}

/**
 * Same 15-second deadline as the per-location reads: without it the nationwide
 * batch can hang a screen on its skeleton forever, with no error and no retry.
 * `fetchCityTrends` reuses it below.
 */
const BATCH_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenMeteoTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const trendCache = new Map<string, { trend: AqiTrend; at: number }>();

/**
 * 24-hour change for a list of points: the six on the Beranda card, one city on
 * a detail screen, or all hundred on the national ranking.
 *
 * A second request is needed because `current=us_aqi` carries no history. It
 * asks for `past_hours=25&forecast_hours=1` (26 samples) instead of two full
 * days: that is the smallest window that still contains "now" and the same
 * hour yesterday, so a hundred cities cost roughly the same weight as the
 * current-AQI batch rather than twice it.
 *
 * No `timezone` parameter on purpose — the response is then in GMT, and the
 * timestamps can be compared to `Date.now()` without a zone conversion.
 */
export async function fetchCityTrends(
  cities: TrendPoint[],
  options: { now?: number } = {},
): Promise<Record<string, AqiTrend>> {
  const now = options.now ?? Date.now();
  const stale = cities.filter((city) => {
    const entry = trendCache.get(city.slug);
    return !entry || now - entry.at > TREND_TTL_MS;
  });

  if (stale.length > 0) {
    const url = new URL(ENDPOINT);
    url.searchParams.set('latitude', stale.map((city) => city.latitude).join(','));
    url.searchParams.set('longitude', stale.map((city) => city.longitude).join(','));
    url.searchParams.set('hourly', 'us_aqi');
    // 25 hours back keeps the comparison point available just after the hour
    // rolls over; one forecast hour keeps the newest sample current.
    url.searchParams.set('past_hours', '25');
    url.searchParams.set('forecast_hours', '1');

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) {
      throw new Error(`Open-Meteo ${response.status} ${response.statusText}`);
    }

    const payload: unknown = await response.json();
    const list: unknown[] = Array.isArray(payload) ? payload : [payload];
    stale.forEach((city, index) => {
      const trend = parseHourlyTrend(list[index], city.slug, now);
      if (trend) trendCache.set(city.slug, { trend, at: now });
    });
  }

  const result: Record<string, AqiTrend> = {};
  for (const city of cities) {
    const entry = trendCache.get(city.slug);
    if (entry) result[city.slug] = entry.trend;
  }
  return result;
}

/** Exposed for tests / a future "clear cache" setting. */
export function clearIndonesiaCache(): void {
  cache = null;
  cacheAt = 0;
  trendCache.clear();
}
