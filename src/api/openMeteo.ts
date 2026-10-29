/**
 * Open-Meteo client — https://open-meteo.com
 *
 * Chosen after comparing Open-Meteo / OpenAQ / WAQI / IQAir: it is the only option
 * that needs no API key or registration. Verified live before use:
 *   current air quality  -> pm2_5, pm10, us_aqi, co, no2, so2, o3   (200)
 *   hourly history       -> past_days<=92, hourly us_aqi/pm2_5      (200)
 *   weather              -> temperature_2m, relative_humidity_2m, wind_speed_10m (200)
 *
 * Limits: non-commercial, 10k calls/day. Requires attribution:
 * "Air quality and weather data by Open-Meteo".
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
  timezone: string;
};

/** Jakarta Pusat, the location mocked throughout the Figma file. */
export const JAKARTA_PUSAT: Coordinates = {
  latitude: -6.1754,
  longitude: 106.8272,
  timezone: 'Asia/Jakarta',
};

export type PollutantReading = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type CurrentReading = {
  /** API time already localised to Asia/Jakarta */
  observedAt: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  wind: number;
  /** WMO weather code from the forecast API */
  weatherCode: number;
  pollutants: PollutantReading[];
  /** Where this value came from; `cache` means offline fallback */
  source?: 'direct' | 'backend' | 'cache';
  stale?: boolean;
  /** ISO timestamp of the cached snapshot when `stale` is true */
  cachedAt?: string;
  forecast?: DayAqi[];
  hourly?: HourlyForecastPoint[];
};

export type DayAqi = {
  day: string;
  /** Daily mean */
  avg: number;
  /** Daily max */
  max: number;
  /** Daily min */
  min: number;
};

export type HourlyForecastPoint = { time: string; aqi: number };

export type ForecastBundle = { hourly: HourlyForecastPoint[]; daily: DayAqi[] };

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

/** The four locations shown in the showcase: Monas, Bundaran HI, GBK, Kota Tua. */
export const POPULAR_LOCATIONS: { name: string; location: Coordinates }[] = [
  { name: 'Monas', location: { latitude: -6.179, longitude: 106.8271, timezone: 'Asia/Jakarta' } },
  {
    name: 'Bundaran HI',
    location: { latitude: -6.1949, longitude: 106.823, timezone: 'Asia/Jakarta' },
  },
  { name: 'GBK', location: { latitude: -6.2185, longitude: 106.8022, timezone: 'Asia/Jakarta' } },
  {
    name: 'Kota Tua',
    location: { latitude: -6.135, longitude: 106.813, timezone: 'Asia/Jakarta' },
  },
];

type ApiResponse = {
  current?: Record<string, string | number | null>;
  hourly?: { time?: (string | null)[]; us_aqi?: (number | null)[]; pm2_5?: (number | null)[] };
  current_units?: Record<string, string>;
};

/** WMO weather interpretation codes → short Indonesian copy ("Cerah berawan", …). */
export function weatherLabel(code: number): string {
  if (code === 0) return 'Cerah';
  if (code === 1) return 'Cerah berawan';
  if (code === 2) return 'Berawan sebagian';
  if (code === 3) return 'Mendung';
  if (code === 45 || code === 48) return 'Berkabut';
  if (code >= 51 && code <= 57) return 'Gerimis';
  if (code >= 61 && code <= 67) return 'Hujan';
  if (code >= 71 && code <= 77) return 'Salju';
  if (code >= 80 && code <= 82) return 'Hujan lebat';
  if (code >= 85 && code <= 86) return 'Salju lebat';
  if (code >= 95) return 'Badai petir';
  return 'Tidak diketahui';
}

function numberOr(value: number | string | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Small TTL cache. Every screen mount used to fire six requests (current reading,
 * weather, four popular locations); opening a few tabs was enough to hit
 * Open-Meteo's rate limit with HTTP 429 during development.
 */
type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();

/**
 * `force` skips the TTL read (pull-to-refresh) but still refreshes the entry, so
 * it is a real refetch rather than a no-op that returns the identical object.
 */
async function withCache<T>(
  key: string,
  ttlMs: number,
  run: () => Promise<T>,
  force = false,
): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (!force && hit && now - hit.at < ttlMs) return hit.value as T;
  const value = await run();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Exposed for tests / manual refresh. */
export function clearRequestCache() {
  cache.clear();
}

/**
 * Every Open-Meteo read shares this deadline. Without it a request can stay
 * pending forever on a broken connection — the detail screen then sits on
 * "memuat" with a "—" ring and no error, which is exactly what the emulator
 * screenshot showed. The timeout turns that into a normal error the gateway
 * can fall back to cache with, or the screen can show with a retry button.
 */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Rejected when an Open-Meteo request takes longer than `REQUEST_TIMEOUT_MS`.
 */
export class OpenMeteoTimeoutError extends Error {
  constructor() {
    super('Open-Meteo tidak merespons dalam 15 detik. Periksa koneksi, lalu coba lagi.');
    this.name = 'OpenMeteoTimeoutError';
  }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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

async function requestJson(url: string): Promise<ApiResponse> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as ApiResponse;
}

export async function fetchCurrentReading(
  location: Coordinates = JAKARTA_PUSAT,
  force = false,
): Promise<CurrentReading> {
  return withCache(
    `current:${location.latitude},${location.longitude}`,
    5 * 60_000,
    () => loadCurrentReading(location),
    force,
  );
}

async function loadCurrentReading(location: Coordinates): Promise<CurrentReading> {
  const common = {
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
  };

  const airQuery = new URLSearchParams({
    ...common,
    current: 'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
  });
  const weatherQuery = new URLSearchParams({
    ...common,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
  });

  const [air, weather] = await Promise.all([
    requestJson(`${AIR_QUALITY_URL}?${airQuery.toString()}`),
    requestJson(`${FORECAST_URL}?${weatherQuery.toString()}`),
  ]);

  const aqi = air.current ?? {};
  const wx = weather.current ?? {};

  const pollutants: PollutantReading[] = [
    { key: 'pm2_5', label: 'PM2.5', value: numberOr(aqi.pm2_5), unit: 'μg/m³' },
    { key: 'pm10', label: 'PM10', value: numberOr(aqi.pm10), unit: 'μg/m³' },
    { key: 'o3', label: 'O₃', value: numberOr(aqi.ozone), unit: 'μg/m³' },
    {
      key: 'no2',
      label: 'NO₂',
      value: numberOr(aqi.nitrogen_dioxide),
      unit: 'μg/m³',
    },
    { key: 'so2', label: 'SO₂', value: numberOr(aqi.sulphur_dioxide), unit: 'μg/m³' },
  ];

  return {
    observedAt: typeof aqi.time === 'string' ? aqi.time : '',
    aqi: numberOr(aqi.us_aqi),
    pm25: numberOr(aqi.pm2_5),
    pm10: numberOr(aqi.pm10),
    temperature: numberOr(wx.temperature_2m),
    humidity: numberOr(wx.relative_humidity_2m),
    wind: numberOr(wx.wind_speed_10m),
    weatherCode: numberOr(wx.weather_code),
    pollutants,
  };
}

/** URL-safe slug for a popular location name: "Kota Tua" -> "kota-tua". */
export function locationSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function findPopularLocation(slug: string) {
  return POPULAR_LOCATIONS.find((entry) => locationSlug(entry.name) === slug) ?? null;
}

/** Light-weight single-location AQI read (no weather call). */
export async function fetchAqiAt(location: Coordinates, force = false): Promise<number> {
  return withCache(
    `aqi:${location.latitude},${location.longitude}`,
    5 * 60_000,
    () => loadAqiAt(location),
    force,
  );
}

async function loadAqiAt(location: Coordinates): Promise<number> {
  const query = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    current: 'us_aqi',
  });
  const response = await requestJson(`${AIR_QUALITY_URL}?${query.toString()}`);
  return numberOr(response.current?.us_aqi);
}


/** Groups raw hourly series into daily mean/max/min. Exported for testing. */
export function groupHourlyByDay(
  times: (string | null)[],
  values: (number | null)[],
): DayAqi[] {
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < times.length; i += 1) {
    const time = times[i];
    const value = values[i];
    if (!time || typeof value !== 'number' || !Number.isFinite(value)) continue;
    const day = time.slice(0, 10);
    const list = buckets.get(day);
    if (list) list.push(value);
    else buckets.set(day, [value]);
  }

  const days: DayAqi[] = [];
  for (const [day, samples] of buckets) {
    const sum = samples.reduce((total, sample) => total + sample, 0);
    days.push({
      day,
      avg: Math.round((sum / samples.length) * 10) / 10,
      max: Math.round(Math.max(...samples)),
      min: Math.round(Math.min(...samples)),
    });
  }
  days.sort((a, b) => a.day.localeCompare(b.day));
  return days;
}

export async function fetchDailyAqi(
  pastDays: number,
  location: Coordinates = JAKARTA_PUSAT,
  force = false,
): Promise<DayAqi[]> {
  return withCache(
    `daily:${location.latitude},${location.longitude}:${pastDays}`,
    15 * 60_000,
    () => loadDailyAqi(pastDays, location),
    force,
  );
}

async function loadDailyAqi(pastDays: number, location: Coordinates): Promise<DayAqi[]> {
  // `past_days` excludes today and `forecast_days=1` appends it, so 7 + 1 gave
  // eight bars under a "7 Hari" tab. Shift the window one day back.
  const span = Math.max(1, Math.round(pastDays));
  const query = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    hourly: 'us_aqi',
    past_days: String(span - 1),
    forecast_days: '1',
  });
  const response = await requestJson(`${AIR_QUALITY_URL}?${query.toString()}`);
  const hourly = response.hourly ?? {};
  return groupHourlyByDay(hourly.time ?? [], hourly.us_aqi ?? []);
}

/**
 * Future days only: keeps today and the following days, then aggregates the
 * hourly series with the same reducer used for history. Exported for tests.
 */
export function buildDailyForecast(
  hourly: HourlyForecastPoint[],
  now = new Date(),
): DayAqi[] {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const future = hourly.filter((point) => point.time.slice(0, 10) >= today);
  return groupHourlyByDay(
    future.map((point) => point.time),
    future.map((point) => point.aqi),
  ).slice(0, 7);
}

/**
 * Seven-day AQI outlook plus the next 48 hourly points, one cached request.
 * The air-quality API has no `daily` block, so the daily series is aggregated
 * from `hourly=us_aqi` exactly like the history endpoint.
 */
export async function fetchForecastBundle(
  location: Coordinates = JAKARTA_PUSAT,
  force = false,
): Promise<ForecastBundle> {
  return withCache(
    `forecast:${location.latitude},${location.longitude}`,
    10 * 60_000,
    () => loadForecastBundle(location),
    force,
  );
}

async function loadForecastBundle(location: Coordinates): Promise<ForecastBundle> {
  const query = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone,
    hourly: 'us_aqi',
    forecast_days: '7',
  });
  const response = await requestJson(`${AIR_QUALITY_URL}?${query.toString()}`);
  const times = response.hourly?.time ?? [];
  const values = response.hourly?.us_aqi ?? [];
  const hourly: HourlyForecastPoint[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const time = times[i];
    const value = values[i];
    if (!time || typeof value !== 'number' || !Number.isFinite(value)) continue;
    hourly.push({ time, aqi: value });
  }
  return { hourly, daily: buildDailyForecast(hourly) };
}

/** Attribution required by the Open-Meteo licence. */
export const ATTRIBUTION = 'Data kualitas udara & cuaca oleh Open-Meteo';