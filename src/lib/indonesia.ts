/**
 * Pure helpers behind the nationwide "Indonesia" screen.
 *
 * The screen is fed by one Open-Meteo call that returns an array of results in
 * the same order as the coordinates it was given, so joining back to the city
 * list happens here — by index, never by the returned (grid-snapped) latitude
 * and longitude, which do not match the requested coordinates.
 */
import { ispuForConcentration, type IndexScale } from '@/lib/aqi';
import type { IndonesiaCity } from '@/data/indonesiaCities';

/** `pm25` stays optional: legacy callers pass US-only readings, which then
 * always display as US AQI. */
export type CityAqi = {
  slug: string;
  /** US AQI, always present — the anchor of every conversion */
  aqi: number;
  /** PM2.5 concentration μg/m³; unavailable when the batch did not report it */
  pm25?: number | null;
};

export type IndonesiaRow = { city: IndonesiaCity; aqi: number };

export type CityFilter = 'semua' | 'baik' | 'sedang' | 'tidak';

export type AqiBatchResponse = {
  current?: { us_aqi?: unknown; pm2_5?: unknown };
};

/** The number a screen shows: US AQI, or the ISPU estimate from PM2.5. */
export function displayedAqi(entry: CityAqi, scale: IndexScale = 'us'): number {
  if (scale !== 'ispu' || entry.pm25 == null) return entry.aqi;
  const ispu = ispuForConcentration('pm2_5', entry.pm25);
  return ispu ?? entry.aqi;
}

/**
 * Joins a batch response to the requested cities by position. Missing or
 * non-numeric readings are dropped, never turned into AQI 0.
 */
export function parseAqiBatch(payload: unknown, cities: IndonesiaCity[]): CityAqi[] {
  const list: unknown[] = Array.isArray(payload) ? payload : [payload];
  const readings: CityAqi[] = [];

  list.forEach((entry, index) => {
    const city = cities[index];
    if (!city) return;
    const current = (entry as AqiBatchResponse | null)?.current;
    const value = current?.us_aqi;
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    const pm25 = current?.pm2_5;
    // Absent, not null, when the field is missing: `toEqual` then leaves the
    // key out of the comparison, so older US-only tests keep passing.
    readings.push({
      slug: city.slug,
      aqi: Math.round(value),
      pm25: typeof pm25 === 'number' && Number.isFinite(pm25) ? pm25 : undefined,
    });
  });

  return readings;
}

/** Joins readings to their city, cleanest first, in the chosen index. */
export function buildRows(
  readings: CityAqi[],
  cities: IndonesiaCity[],
  scale: IndexScale = 'us',
): IndonesiaRow[] {
  const bySlug = new Map(
    readings.map((entry) => [entry.slug, displayedAqi(entry, scale)] as const),
  );
  const rows: IndonesiaRow[] = [];
  for (const city of cities) {
    const aqi = bySlug.get(city.slug);
    if (aqi === undefined) continue;
    rows.push({ city, aqi });
  }
  return rows.sort((a, b) => a.aqi - b.aqi || a.city.name.localeCompare(b.city.name));
}

export function matchesFilter(aqi: number, filter: CityFilter): boolean {
  if (filter === 'semua') return true;
  if (filter === 'baik') return aqi <= 50;
  if (filter === 'sedang') return aqi > 50 && aqi <= 100;
  return aqi > 100;
}

/** Search covers both the city and its province, so "Papua" finds all of them. */
export function filterRows(
  rows: IndonesiaRow[],
  options: { query?: string; filter?: CityFilter } = {},
): IndonesiaRow[] {
  const needle = (options.query ?? '').trim().toLowerCase();
  const filter = options.filter ?? 'semua';
  return rows.filter((row) => {
    if (!matchesFilter(row.aqi, filter)) return false;
    if (!needle) return true;
    return `${row.city.name} ${row.city.province}`.toLowerCase().includes(needle);
  });
}

export type AqiTrend = {
  slug: string;
  /** AQI now minus AQI 24 hours ago; positive means the air got dirtier */
  delta: number;
  /** AQI at the older sample */
  from: number;
  /** AQI at the latest sample at or before "now" */
  to: number;
  /** Real distance between the two samples, normally 24 */
  hours: number;
};

/** Anything the trend endpoint can be asked about — not just bundled cities. */
export type TrendPoint = { slug: string; latitude: number; longitude: number };

/** "naik 42 poin dalam 24 jam" — shared by the visual badge and screen readers. */
export function describeTrend(trend: AqiTrend): string {
  if (trend.delta === 0) return 'stabil dalam 24 jam';
  return `${trend.delta > 0 ? 'naik' : 'turun'} ${Math.abs(trend.delta)} poin dalam 24 jam`;
}

type HourlyPayload = {
  hourly?: { time?: unknown; us_aqi?: unknown; pm2_5?: unknown };
};

/**
 * Parses Open-Meteo's `2026-10-21T22:00` stamps as UTC. The trend request
 * deliberately omits `timezone`, so the API answers in GMT; `new Date()` on
 * the raw string would read it in the device's local zone instead.
 */
function parseGmt(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}

const HOUR_MS = 3_600_000;

/**
 * 24-hour change from an hourly block: the newest sample at or before
 * `nowMs` minus the sample closest to 24 hours earlier.
 *
 * `scale: 'ispu'` converts each hourly PM2.5 point to its ISPU sub-index first,
 * so the delta is measured on the same scale as the numbers shown.
 *
 * Returns null rather than a zero when either end is missing — a gap in the
 * model series must not read as "stable air".
 */
export function parseHourlyTrend(
  payload: unknown,
  slug: string,
  nowMs: number,
  scale: IndexScale = 'us',
): AqiTrend | null {
  const hourly = (payload as HourlyPayload | null)?.hourly;
  const times = Array.isArray(hourly?.time) ? (hourly.time as unknown[]) : null;
  const rawValues = Array.isArray(hourly?.us_aqi) ? (hourly.us_aqi as unknown[]) : null;
  const pmValues = Array.isArray(hourly?.pm2_5) ? (hourly.pm2_5 as unknown[]) : null;
  const values: unknown[] | null =
    scale === 'ispu' && pmValues
      ? pmValues.map((value) =>
          typeof value === 'number' && Number.isFinite(value)
            ? ispuForConcentration('pm2_5', value)
            : null,
        )
      : rawValues;
  if (!times || !values) return null;

  let nowIndex = -1;
  let nowAt = 0;
  for (let index = 0; index < times.length; index += 1) {
    const stamp = times[index];
    if (typeof stamp !== 'string') continue;
    const at = parseGmt(stamp);
    if (at === null || at > nowMs || at <= nowAt) continue;
    nowAt = at;
    nowIndex = index;
  }
  if (nowIndex < 0) return null;

  const nowValue = values[nowIndex];
  if (typeof nowValue !== 'number' || !Number.isFinite(nowValue)) return null;

  let fromIndex = -1;
  let fromAt = 0;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let index = 0; index < times.length; index += 1) {
    if (index === nowIndex) continue;
    const stamp = times[index];
    if (typeof stamp !== 'string') continue;
    const at = parseGmt(stamp);
    if (at === null) continue;
    const gap = Math.abs(nowAt - 24 * HOUR_MS - at);
    if (gap < bestGap) {
      bestGap = gap;
      fromAt = at;
      fromIndex = index;
    }
  }
  // The series is hourly; anything more than 90 minutes off means the 24-hour
  // sample is missing, not merely shifted.
  if (fromIndex < 0 || bestGap > 90 * 60_000) return null;

  const fromValue = values[fromIndex];
  if (typeof fromValue !== 'number' || !Number.isFinite(fromValue)) return null;

  return {
    slug,
    delta: Math.round(nowValue) - Math.round(fromValue),
    from: Math.round(fromValue),
    to: Math.round(nowValue),
    hours: Math.round((nowAt - fromAt) / HOUR_MS),
  };
}

export type Extremes = {
  /** Cleanest first */
  best: IndonesiaRow[];
  /** Most polluted first */
  worst: IndonesiaRow[];
  /** AQI gap between the cleanest and the most polluted city in the batch */
  spread: number;
};

/**
 * Both ends of the national ranking, for the Beranda card.
 *
 * `count` is capped at half the batch so a short list never names the same city
 * as both the best and the worst — with three readings, that cap is one per
 * side and the middle city stays out of both lists.
 */
export function pickExtremes(rows: IndonesiaRow[], count = 3): Extremes {
  if (rows.length === 0) return { best: [], worst: [], spread: 0 };
  const sorted = [...rows].sort(
    (a, b) => a.aqi - b.aqi || a.city.name.localeCompare(b.city.name),
  );
  const perSide = Math.max(0, Math.min(Math.floor(count), Math.floor(sorted.length / 2)));
  return {
    best: sorted.slice(0, perSide),
    // Reversed so the most polluted city leads its own list.
    worst: sorted.slice(sorted.length - perSide).reverse(),
    spread: sorted[sorted.length - 1].aqi - sorted[0].aqi,
  };
}

export type NationalSummary = {
  /** Number of cities with a reading in this batch */
  monitored: number;
  average: number;
  cleanest: IndonesiaRow | null;
  worst: IndonesiaRow | null;
  /** Cities at AQI <= 50 */
  clean: number;
  /** Cities above 100, i.e. unhealthy for sensitive groups and worse */
  unhealthy: number;
};

export function summarize(rows: IndonesiaRow[]): NationalSummary {
  if (rows.length === 0) {
    return { monitored: 0, average: 0, cleanest: null, worst: null, clean: 0, unhealthy: 0 };
  }
  const total = rows.reduce((sum, row) => sum + row.aqi, 0);
  let cleanest = rows[0];
  let worst = rows[0];
  for (const row of rows) {
    if (row.aqi < cleanest.aqi) cleanest = row;
    if (row.aqi > worst.aqi) worst = row;
  }
  return {
    monitored: rows.length,
    average: Math.round(total / rows.length),
    cleanest,
    worst,
    clean: rows.filter((row) => row.aqi <= 50).length,
    unhealthy: rows.filter((row) => row.aqi > 100).length,
  };
}
