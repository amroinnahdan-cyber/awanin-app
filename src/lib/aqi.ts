/** US AQI breakpoints and Indonesian copy. */

import { color } from '@/theme/tokens';

export type AqiCategory = {
  /** Lower bound, inclusive */
  min: number;
  label: string;
  color: string;
  message: string;
  /** Short label for legend / chips */
  short: string;
};

export const AQI_CATEGORIES: AqiCategory[] = [
  {
    min: 0,
    label: 'Baik',
    short: 'Baik',
    color: '#4abc78',
    message: 'Udara baik, nikmati harimu!',
  },
  {
    min: 51,
    label: 'Sedang',
    short: 'Sedang',
    color: '#f5bb42',
    message: 'Udara sedang, tetap jaga kondisi tubuhmu.',
  },
  {
    min: 101,
    label: 'Tidak Sehat untuk Sensitif',
    short: 'Sensitif',
    color: '#f0863c',
    message: 'Kelompok sensitif sebaiknya batasi aktivitas luar.',
  },
  {
    min: 151,
    label: 'Tidak Sehat',
    short: 'Tidak Sehat',
    color: '#ef6b56',
    message: 'Udara tidak sehat, kurangi aktivitas di luar ruang.',
  },
  {
    min: 201,
    label: 'Sangat Tidak Sehat',
    short: 'Sangat Tidak Sehat',
    color: '#9b5de5',
    message: 'Hindari aktivitas luar ruang dan gunakan masker.',
  },
  {
    min: 301,
    label: 'Berbahaya',
    short: 'Berbahaya',
    color: '#b3453f',
    message: 'Udara berbahaya, sebaiknya tetap di dalam rumah.',
  },
];

export const AQI_SCALE_MAX = 500;

export function categoryFor(aqi: number): AqiCategory {
  const clamped = Number.isFinite(aqi) ? Math.max(0, aqi) : 0;
  let found = AQI_CATEGORIES[0];
  for (const category of AQI_CATEGORIES) {
    if (clamped >= category.min) found = category;
  }
  return found;
}

/**
 * Ring fill over the AQI scale — piecewise, not linear.
 *
 * A straight 0-500 mapping buries everyday readings: AQI 50 fills 10% of the
 * arc and Jakarta rarely exceeds 100, so the ring looked permanently empty.
 * The stops below keep every category boundary at a fixed arc position (50 →
 * 30%, 100 → 50%, 150 → 66%, 200 → 78%, 300 → 90%, 500 → 100%) while giving
 * the common 0-100 band two thirds of the visual range. Monotonic and clamped.
 */
const GAUGE_STOPS: [number, number][] = [
  [0, 0],
  [50, 0.3],
  [100, 0.5],
  [150, 0.66],
  [200, 0.78],
  [300, 0.9],
  [500, 1],
];

export function gaugeProgress(aqi: number): number {
  if (!Number.isFinite(aqi)) return 0;
  const clamped = Math.min(Math.max(aqi, 0), AQI_SCALE_MAX);
  for (let i = 1; i < GAUGE_STOPS.length; i += 1) {
    const [x0, y0] = GAUGE_STOPS[i - 1];
    const [x1, y1] = GAUGE_STOPS[i];
    if (clamped <= x1) return y0 + ((clamped - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 1;
}

/**
 * WHO reference bands per pollutant, in μg/m³ (24h guideline, 1st interim,
 * 2nd interim, 3rd interim). Used to colour the pollutant bars honestly instead
 * of projecting everything onto the overall AQI scale.
 */
const POLLUTANT_BANDS: Record<string, [number, number, number, number]> = {
  pm2_5: [15, 35, 55, 150],
  pm10: [45, 100, 150, 250],
  no2: [25, 50, 120, 230],
  o3: [100, 160, 200, 300],
};

export function pollutantBand(
  key: string,
  value: number,
): { color: string; progress: number } {
  const bands = POLLUTANT_BANDS[key] ?? [50, 100, 150, 300];
  let index = 0;
  bands.forEach((threshold, bandIndex) => {
    if (value >= threshold) index = bandIndex + 1;
  });
  const color = AQI_CATEGORIES[Math.min(index, AQI_CATEGORIES.length - 1)].color;
  const progress = Math.min(value / (bands[3] * 1.25), 1);
  return { color, progress };
}

/** WCAG relative luminance of an #rrggbb colour. */
function luminance(hex: string): number {
  const int = parseInt(hex.slice(1), 16);
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((value) => {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Label colour for a solid category chip. The category palette runs from pale
 * yellow (#f5bb42) to dark red (#b3453f), so plain white text is unreadable on
 * the light half; this returns whichever of white / ink contrasts better.
 */
export function readableOn(background: string): string {
  const backgroundLuminance = luminance(background);
  const white = 1.05 / (backgroundLuminance + 0.05);
  const ink = (backgroundLuminance + 0.05) / (luminance(color.ink) + 0.05);
  return white >= ink ? '#ffffff' : color.ink;
}

/**
 * Formats a "YYYY-MM-DDTHH:mm" value returned by the API already localised to
 * Asia/Jakarta into Indonesian time copy, e.g. "14.00 WIB".
 */
export function formatWib(isoLocal: string | undefined): string {
  if (!isoLocal) return '—';
  const match = /T(\d{2}):(\d{2})/.exec(isoLocal);
  if (!match) return '—';
  return `${match[1]}.${match[2]} WIB`;
}

/** Weekday initial for a "YYYY-MM-DD" date (Indonesian). */
export function dayLabel(isoDay: string): string {
  const days = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];
  const day = new Date(`${isoDay}T00:00:00`).getDay();
  return days[day] ?? '';
}

/** "YYYY-MM-DD" -> "17 Okt" */
export function shortDate(isoDay: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  if (!match) return isoDay;
  return `${Number(match[3])} ${months[Number(match[2]) - 1] ?? ''}`;
}