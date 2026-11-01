/**
 * Index scales and Indonesian copy.
 *
 * Two scales share one shape:
 * - `us`  — US AQI, the value Open-Meteo itself returns.
 * - `ispu` — ISPU (Indeks Standar Pencemar Udara, Permen LHK No. 14/2020),
 *   computed on-device from pollutant concentrations with the official
 *   breakpoint table below.
 */

import type { CurrentReading } from '@/api/openMeteo';

/** Ink used by the light palette; only a contrast reference for chip labels. */
const INK = '#153c70';

/** Which index the whole app displays. Default stays the native API value. */
export type IndexScale = 'us' | 'ispu';

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

/**
 * ISPU categories (Permen LHK No. 14/2020): five bands, 0–500. Colours follow
 * the official table (hijau/biru/kuning/merah/hitam); "Berbahaya" uses a near-
 * black that still carries `readableOn` white text in both palettes.
 */
export const ISPU_CATEGORIES: AqiCategory[] = [
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
    color: '#41a4e0',
    message: 'Udara sedang, tetap jaga kondisi tubuhmu.',
  },
  {
    min: 101,
    label: 'Tidak Sehat',
    short: 'Tidak Sehat',
    color: '#f5bb42',
    message: 'Udara mulai tidak sehat, batasi aktivitas luar.',
  },
  {
    min: 201,
    label: 'Sangat Tidak Sehat',
    short: 'Sangat TKS',
    color: '#ef6b56',
    message: 'Udara sangat tidak sehat, hindari aktivitas luar.',
  },
  {
    min: 301,
    label: 'Berbahaya',
    short: 'Berbahaya',
    color: '#26262b',
    message: 'Udara berbahaya, sebaiknya tetap di dalam rumah.',
  },
];

/**
 * Official ISPU breakpoints, [C_low, C_high, I_low, I_high] per tier, in μg/m³.
 * ISPU bands: 0–50 / 51–100 / 101–200 / 201–300 / 301–500.
 *
 * The table's averaging periods differ per pollutant (PM 24h, SO₂/NO₂/O₃ 1h,
 * CO 8h). Open-Meteo only supplies instantaneous hourly/current values, so
 * every sub-index is an *estimate* built from those; that is why the app keeps
 * the label "ISPU" on the scale — the number is always a defensible conversion,
 * never a claim about real station averaging. CO is excluded: with an 8-hour
 * breakpoint applied to a 1-hour value it would dominate every reading.
 */
export type IspuBreakpoint = [number, number, number, number];

export const ISPU_BREAKPOINTS: Record<string, IspuBreakpoint[]> = {
  pm2_5: [
    [0, 15.5, 0, 50],
    [15.5, 55.4, 51, 100],
    [55.4, 150.4, 101, 200],
    [150.4, 250.4, 201, 300],
    [250.4, 500, 301, 500],
  ],
  pm10: [
    [0, 75, 0, 50],
    [75, 150, 51, 100],
    [150, 350, 101, 200],
    [350, 420, 201, 300],
    [420, 500, 301, 500],
  ],
  so2: [
    [0, 105, 0, 50],
    [105, 355, 51, 100],
    [355, 800, 101, 200],
    [800, 1600, 201, 300],
    [1600, 2100, 301, 500],
  ],
  no2: [
    [0, 123.5, 0, 50],
    [123.5, 246.9, 51, 100],
    [246.9, 995.6, 101, 200],
    [995.6, 1246.2, 201, 300],
    [1246.2, 2107.9, 301, 500],
  ],
  o3: [
    [0, 110, 0, 50],
    [110, 220, 51, 100],
    [220, 660, 101, 200],
    [660, 880, 201, 300],
    [880, 1400, 301, 500],
  ],
};

/** Linear interpolation inside one tier, as the regulation prescribes. */
export function ispuForConcentration(key: string, concentration: number): number | null {
  const tiers = ISPU_BREAKPOINTS[key];
  if (!tiers || !Number.isFinite(concentration) || concentration < 0) return null;
  for (const [cLow, cHigh, iLow, iHigh] of tiers) {
    if (concentration <= cHigh || cHigh === tiers[tiers.length - 1][1]) {
      const clamped = Math.min(concentration, cHigh);
      const value = iLow + ((clamped - cLow) / (cHigh - cLow)) * (iHigh - iLow);
      // Cap the open last tier (C > 500) at ISPU 500.
      return Math.min(500, Math.round(value));
    }
  }
  return null;
}

/** Pollutant readings carry key + value; that is all the sub-index needs. */
export type PollutantConcentration = { key: string; value: number };

/**
 * ISPU = the maximum sub-index across the available pollutants. Returns null
 * when no pollutant has a usable concentration, so callers can show "—" rather
 * than an invented 0.
 */
export function ispuFromPollutants(pollutants: PollutantConcentration[]): number | null {
  let best: number | null = null;
  for (const pollutant of pollutants ?? []) {
    const subIndex = ispuForConcentration(pollutant.key, pollutant.value);
    if (subIndex !== null && (best === null || subIndex > best)) best = subIndex;
  }
  return best;
}

/**
 * The number a screen shows for a reading: US AQI as-is, or ISPU computed from
 * the reading's pollutant concentrations. Falls back to the API's own AQI only
 * when every ISPU sub-index is unusable — callers keep pairing the result with
 * `indexUnit(scale)`, so a hidden fallback should be rare and brief.
 */
export function displayIndexFor(
  reading:
    | (Pick<CurrentReading, 'aqi'> & { pollutants?: PollutantConcentration[] })
    | null
    | undefined,
  scale: IndexScale = 'us',
): number | null {
  const aqi = reading?.aqi;
  if (typeof aqi !== 'number' || !Number.isFinite(aqi)) return null;
  if (scale !== 'ispu') return Math.round(aqi);
  const ispu = ispuFromPollutants(reading?.pollutants ?? []);
  return ispu !== null ? ispu : Math.round(aqi);
}

/** The unit label paired with the number everywhere the app shows an index. */
export function indexUnit(scale: IndexScale): string {
  return scale === 'ispu' ? 'ISPU' : 'AQI';
}

/** Shared spoken form for accessibility labels, e.g. "AQI 87, Tidak Sehat". */
export function indexSpoken(scale: IndexScale): string {
  return scale === 'ispu' ? 'ISPU' : 'AQI';
}

function categoryForScale(aqi: number, scale: IndexScale): AqiCategory {
  const clamped = Number.isFinite(aqi) ? Math.max(0, aqi) : 0;
  const categories = scale === 'ispu' ? ISPU_CATEGORIES : AQI_CATEGORIES;
  let found = categories[0];
  for (const category of categories) {
    if (clamped >= category.min) found = category;
  }
  return found;
}

/** Category for an index value on the given scale (US AQI by default). */
export function categoryFor(aqi: number, scale: IndexScale = 'us'): AqiCategory {
  if (scale === 'ispu') {
    const clamped = Number.isFinite(aqi) ? Math.max(0, aqi) : 0;
    if (clamped > AQI_SCALE_MAX) return ISPU_CATEGORIES[ISPU_CATEGORIES.length - 1];
  }
  return categoryForScale(aqi, scale);
}

/**
 * Category boundary → arc position. Each scale stops every boundary of its
 * own category table at the same designed positions, so the colour classes
 * (drawn by `categoryFor`) always own the same share of the ring.
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

/**
 * ISPU stops: the "Tidak Sehat" band spans 101–200 as one stretch, so the US
 * AQI's interior stop at 150 must not bend that band — 101–200 interpolates
 * straight from 50% to 78% instead.
 */
const ISPU_GAUGE_STOPS: [number, number][] = [
  [0, 0],
  [50, 0.3],
  [100, 0.5],
  [200, 0.78],
  [300, 0.9],
  [500, 1],
];

/**
 * Ring fill over the chosen scale — piecewise, not linear.
 *
 * A straight 0-500 mapping buries everyday readings: AQI 50 fills 10% of the
 * arc and Jakarta rarely exceeds 100, so the ring looked permanently empty.
 * Stops keep every category boundary at a fixed arc position (50 → 30%,
 * 100 → 50%, 300 → 90%, 500 → 100%) while giving the common 0-100 band two
 * thirds of the visual range. Monotonic and clamped.
 */
export function gaugeProgress(aqi: number, scale: IndexScale = 'us'): number {
  if (!Number.isFinite(aqi)) return 0;
  const stops = scale === 'ispu' ? ISPU_GAUGE_STOPS : GAUGE_STOPS;
  const clamped = Math.min(Math.max(aqi, 0), AQI_SCALE_MAX);
  for (let i = 1; i < stops.length; i += 1) {
    const [x0, y0] = stops[i - 1];
    const [x1, y1] = stops[i];
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

/**
 * PM2.5 concentration bands for the map's second colour mode, in μg/m³.
 * Thresholds are the same WHO reference ladder `pollutantBand` colours the
 * pollutant bars with, and colours reuse AQI category positions 0–4, so a city
 * keeps the hue users already know from both scales — the number inside the
 * circle is what changes, from an index to the raw concentration. The top band
 * is open-ended: PM2.5 has no "Berbahaya" tier here because the WHO ladder
 * tops out at the 4th interim level.
 */
export const PM25_CATEGORIES: AqiCategory[] = [
  {
    min: 0,
    label: 'Baik',
    short: 'Baik',
    color: '#4abc78',
    message: 'PM2.5 masih di bawah panduan harian WHO.',
  },
  {
    min: 15,
    label: 'Sedang',
    short: 'Sedang',
    color: '#f5bb42',
    message: 'PM2.5 melampaui panduan harian WHO.',
  },
  {
    min: 35,
    label: 'Tidak Sehat untuk Sensitif',
    short: 'Sensitif',
    color: '#f0863c',
    message: 'Kelompok sensitif sebaiknya batasi aktivitas luar.',
  },
  {
    min: 55,
    label: 'Tidak Sehat',
    short: 'Tidak Sehat',
    color: '#ef6b56',
    message: 'PM2.5 tinggi, kurangi aktivitas di luar ruang.',
  },
  {
    min: 150,
    label: 'Sangat Tidak Sehat',
    short: 'Sangat TKS',
    color: '#9b5de5',
    message: 'PM2.5 sangat tinggi, hindari aktivitas luar.',
  },
];

/** Category for a PM2.5 concentration in μg/m³ (WHO bands, see above). */
export function pm25Category(value: number): AqiCategory {
  const clamped = Number.isFinite(value) ? Math.max(0, value) : 0;
  let found = PM25_CATEGORIES[0];
  for (const category of PM25_CATEGORIES) {
    if (clamped >= category.min) found = category;
  }
  return found;
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
  const ink = (backgroundLuminance + 0.05) / (luminance(INK) + 0.05);
  return white >= ink ? '#ffffff' : INK;
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