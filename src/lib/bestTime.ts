/**
 * "Best time to exercise today" — a pure function over the hourly AQI series.
 *
 * The app has no notion of daylight or weather per hour, so the recommendation
 * is deliberately limited to what the data actually supports: the two-hour
 * window with the lowest average AQI among the hours still left today. When the
 * remaining hours are effectively identical it says so instead of crowning a
 * winner by noise.
 *
 * `observedAt` and the hourly `time` strings are both in the location's own
 * timezone (Open-Meteo is queried with `timezone=Asia/Jakarta`), so "today" and
 * "now" are read from that, never from the device clock.
 */
import type { HourlyForecastPoint } from '@/api/openMeteo';

export type HourlyAqi = { hour: number; aqi: number };

export type ExerciseWindow = {
  /** 0-23, the hour the window starts */
  startHour: number;
  /** Exclusive; 24 means "midnight at the end of today" */
  endHour: number;
  avgAqi: number;
  maxAqi: number;
  hours: number;
};

/** Each remaining hour must be within this many AQI points to count as flat. */
const FLAT_SPREAD = 4;

const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}/;

/**
 * The rest of today's hourly series, in order. Returns [] when the reading has
 * no usable timestamp, which is the signal for the UI to stay hidden rather
 * than invent a window.
 */
export function remainingHoursToday(
  hourly: HourlyForecastPoint[] | undefined,
  observedAt: string | undefined,
): HourlyAqi[] {
  if (!observedAt || !LOCAL_TIME.test(observedAt)) return [];
  const day = observedAt.slice(0, 10);
  const nowHour = Number(observedAt.slice(11, 13));
  if (!Number.isFinite(nowHour)) return [];

  const byHour = new Map<number, number>();
  for (const point of hourly ?? []) {
    if (!point || typeof point.time !== 'string') continue;
    if (point.time.slice(0, 10) !== day) continue;
    if (!Number.isFinite(point.aqi)) continue;
    const hour = Number(point.time.slice(11, 13));
    // The current hour is already partly gone; offering it as the best time
    // would tell someone to start a session that ends in a few minutes.
    if (!Number.isFinite(hour) || hour <= nowHour) continue;
    byHour.set(hour, point.aqi);
  }

  return [...byHour.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, aqi]) => ({ hour, aqi }));
}

/**
 * Lowest-average window of `span` consecutive hours. Ties go to the earliest
 * window: leaving sooner is better than waiting for an identical reading.
 */
export function bestExerciseWindow(hours: HourlyAqi[], span = 2): ExerciseWindow | null {
  if (hours.length === 0) return null;
  const size = Math.min(Math.max(1, span), hours.length);
  let best: ExerciseWindow | null = null;

  for (let index = 0; index + size <= hours.length; index += 1) {
    const slice = hours.slice(index, index + size);
    // A gap in the series (Open-Meteo drops null hours) means these hours are
    // not actually adjacent, so the window would be fiction.
    const consecutive = slice.every(
      (point, offset) => offset === 0 || point.hour === slice[offset - 1].hour + 1,
    );
    if (!consecutive) continue;

    const avgAqi = Math.round(slice.reduce((total, point) => total + point.aqi, 0) / size);
    const maxAqi = Math.round(Math.max(...slice.map((point) => point.aqi)));
    if (best === null || avgAqi < best.avgAqi) {
      best = {
        startHour: slice[0].hour,
        endHour: slice[slice.length - 1].hour + 1,
        avgAqi,
        maxAqi,
        hours: size,
      };
    }
  }

  return best;
}

/** True when the remaining hours barely differ, so "best" would be noise. */
export function isFlatDay(hours: HourlyAqi[]): boolean {
  if (hours.length < 2) return false;
  const values = hours.map((point) => point.aqi);
  return Math.max(...values) - Math.min(...values) <= FLAT_SPREAD;
}

/** Advice tied to the window's own AQI band, not to the day as a whole. */
export function exerciseAdvice(aqi: number): string {
  if (!Number.isFinite(aqi)) return '';
  if (aqi <= 50) return 'Udara bersih — waktu yang tepat untuk olahraga di luar ruangan.';
  if (aqi <= 100) return 'Masih aman untuk olahraga di luar; kurangi intensitas bila sensitif.';
  if (aqi <= 150) return 'Kelompok sensitif sebaiknya berolahraga di dalam ruangan.';
  return 'Sebaiknya olahraga di dalam ruangan hari ini.';
}
