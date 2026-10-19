import type { Db } from './db.js';

export type Pollutant = { key: string; label: string; value: number; unit: string };

export type HourlyPoint = { time: string; aqi: number };

export type DayForecast = { day: string; avg: number; max: number; min: number };

export type CurrentReading = {
  observedAt: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  wind: number;
  /** WMO weather code, decoded by the app */
  weatherCode: number;
  pollutants: Pollutant[];
};

export type AirSnapshot = CurrentReading & {
  hourly: HourlyPoint[];
  forecast: DayForecast[];
  fetchedAt: number;
};

export type DayAqi = { day: string; avg: number; max: number; min: number };

export interface UpstreamClient {
  getSnapshot(latitude: number, longitude: number, timezone: string): Promise<AirSnapshot>;
  getHistory(
    latitude: number,
    longitude: number,
    timezone: string,
    pastDays: number,
  ): Promise<DayAqi[]>;
}

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const SNAPSHOT_TTL_MS = 10 * 60_000;
const HISTORY_TTL_MS = 15 * 60_000;

type AirResponse = {
  current?: Record<string, string | number | null>;
  hourly?: { time?: (string | null)[]; us_aqi?: (number | null)[]; pm2_5?: (number | null)[] };
};

function numberOr(value: number | string | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Groups hourly samples into daily aggregates. */
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
    const samples = buckets.get(day);
    if (samples) samples.push(value);
    else buckets.set(day, [value]);
  }
  const days: DayAqi[] = [];
  for (const [day, samples] of buckets) {
    const sum = samples.reduce((total, sample) => total + sample, 0);
    days.push({
      day,
      avg: round1(sum / samples.length),
      max: Math.round(Math.max(...samples)),
      min: Math.round(Math.min(...samples)),
    });
  }
  days.sort((a, b) => a.day.localeCompare(b.day));
  return days;
}

export function buildForecast(hourly: HourlyPoint[], now = new Date()): DayForecast[] {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const future = hourly.filter((point) => point.time.slice(0, 10) >= today);
  return groupHourlyByDay(
    future.map((point) => point.time),
    future.map((point) => point.aqi),
  ).slice(0, 7);
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(12_000),
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Open-Meteo ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

type CachedPayload<T> = { value: T; fetchedAt: number };

function readCache<T>(db: Db, key: string, ttlMs: number): T | null {
  const row = db
    .prepare('SELECT payload, fetched_at FROM api_cache WHERE cache_key = ?')
    .get(key) as { payload: string; fetched_at: number } | undefined;
  if (!row) return null;
  if (Date.now() - row.fetched_at > ttlMs) return null;
  try {
    return (JSON.parse(row.payload) as CachedPayload<T>).value;
  } catch {
    return null;
  }
}

function writeCache(db: Db, key: string, value: unknown): void {
  db.prepare(
    'INSERT OR REPLACE INTO api_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)',
  ).run(key, JSON.stringify({ value, fetchedAt: Date.now() }), Date.now());
}

/**
 * Last snapshot for a point, ignoring the TTL. Used only when Open-Meteo is
 * unreachable, so the app can label the reading as stale instead of empty.
 */
export function readCachedSnapshot(
  db: Db,
  latitude: number,
  longitude: number,
): AirSnapshot | null {
  const row = db
    .prepare('SELECT payload FROM api_cache WHERE cache_key = ?')
    .get(`snapshot:${latitude},${longitude}`) as { payload: string } | undefined;
  if (!row) return null;
  try {
    return (JSON.parse(row.payload) as CachedPayload<AirSnapshot>).value;
  } catch {
    return null;
  }
}

/**
 * Open-Meteo adapter.
 *
 * The upstream is intentionally the only place that talks to the third party:
 * every endpoint and the scheduler share this cache, so 10 minutes of traffic
 * costs one request per point instead of one per screen mount.
 */
export function createUpstream(db: Db): UpstreamClient {
  async function getSnapshot(
    latitude: number,
    longitude: number,
    timezone: string,
  ): Promise<AirSnapshot> {
    const key = `snapshot:${latitude},${longitude}`;
    const cached = readCache<AirSnapshot>(db, key, SNAPSHOT_TTL_MS);
    if (cached) return cached;

    const common = {
      latitude: String(latitude),
      longitude: String(longitude),
      timezone,
    };
    const airQuery = new URLSearchParams({
      ...common,
      current: 'us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
      hourly: 'us_aqi,pm2_5',
      forecast_days: '7',
    });
    const weatherQuery = new URLSearchParams({
      ...common,
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    });

    const [air, weather] = await Promise.all([
      requestJson<AirResponse>(`${AIR_QUALITY_URL}?${airQuery.toString()}`),
      requestJson<AirResponse>(`${FORECAST_URL}?${weatherQuery.toString()}`),
    ]);

    const current = air.current ?? {};
    const wx = weather.current ?? {};
    // Open-Meteo pads `time` to the full range it was asked for but leaves the
    // AQI of the last forecast days as `null`. Mapping those to 0 painted two
    // "AQI 0" days at the end of every forecast, so gaps are dropped instead.
    const hourly: HourlyPoint[] = [];
    const hourlyTimes = air.hourly?.time ?? [];
    const hourlyAqi = air.hourly?.us_aqi ?? [];
    for (let index = 0; index < hourlyTimes.length; index += 1) {
      const time = hourlyTimes[index];
      const value = hourlyAqi[index];
      if (!time || typeof value !== 'number' || !Number.isFinite(value)) continue;
      hourly.push({ time, aqi: value });
    }
    const futureHourly = hourly;

    if (typeof current.us_aqi !== 'number' || !Number.isFinite(current.us_aqi)) {
      throw new Error('Open-Meteo returned no current AQI');
    }

    const snapshot: AirSnapshot = {
      observedAt: typeof current.time === 'string' ? current.time : '',
      aqi: numberOr(current.us_aqi),
      pm25: numberOr(current.pm2_5),
      pm10: numberOr(current.pm10),
      temperature: numberOr(wx.temperature_2m),
      humidity: numberOr(wx.relative_humidity_2m),
      wind: numberOr(wx.wind_speed_10m),
      weatherCode: numberOr(wx.weather_code),
      pollutants: [
        { key: 'pm2_5', label: 'PM2.5', value: numberOr(current.pm2_5), unit: 'μg/m³' },
        { key: 'pm10', label: 'PM10', value: numberOr(current.pm10), unit: 'μg/m³' },
        { key: 'o3', label: 'O₃', value: numberOr(current.ozone), unit: 'μg/m³' },
        { key: 'no2', label: 'NO₂', value: numberOr(current.nitrogen_dioxide), unit: 'μg/m³' },
        { key: 'so2', label: 'SO₂', value: numberOr(current.sulphur_dioxide), unit: 'μg/m³' },
      ],
      hourly: futureHourly.slice(0, 48),
      forecast: buildForecast(futureHourly),
      fetchedAt: Date.now(),
    };

    writeCache(db, key, snapshot);
    return snapshot;
  }

  async function getHistory(
    latitude: number,
    longitude: number,
    timezone: string,
    pastDays: number,
  ): Promise<DayAqi[]> {
    const key = `history:${latitude},${longitude}:${pastDays}`;
    const cached = readCache<DayAqi[]>(db, key, HISTORY_TTL_MS);
    if (cached) return cached;

    // `past_days` does not include today and `forecast_days=1` adds it back, so
    // asking for 7 past days returned 8. Shift the window by one to keep the
    // "7 Hari" / "30 Hari" tabs exactly as long as their label.
    const span = Math.max(1, Math.round(pastDays));
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone,
      hourly: 'us_aqi',
      past_days: String(span - 1),
      forecast_days: '1',
    });
    const air = await requestJson<AirResponse>(`${AIR_QUALITY_URL}?${query.toString()}`);
    const days = groupHourlyByDay(air.hourly?.time ?? [], air.hourly?.us_aqi ?? []);
    writeCache(db, key, days);
    return days;
  }

  return { getSnapshot, getHistory };
}

/** Attribution required by the Open-Meteo licence. */
export const ATTRIBUTION = 'Data kualitas udara & cuaca oleh Open-Meteo';
