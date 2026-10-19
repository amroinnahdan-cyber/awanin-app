/** Mirrors `awanin-app/src/lib/aqi.ts` — labels and colours stay identical. */
export type Category = {
  min: number;
  label: string;
  short: string;
  message: string;
};

export const CATEGORIES: Category[] = [
  { min: 0, label: 'Baik', short: 'Baik', message: 'Udara baik, nikmati harimu!' },
  {
    min: 51,
    label: 'Sedang',
    short: 'Sedang',
    message: 'Udara sedang, tetap jaga kondisi tubuhmu.',
  },
  {
    min: 101,
    label: 'Tidak Sehat untuk Sensitif',
    short: 'Sensitif',
    message: 'Kelompok sensitif sebaiknya batasi aktivitas luar.',
  },
  {
    min: 151,
    label: 'Tidak Sehat',
    short: 'Tidak Sehat',
    message: 'Udara tidak sehat, kurangi aktivitas di luar ruang.',
  },
  {
    min: 201,
    label: 'Sangat Tidak Sehat',
    short: 'Sangat Tidak Sehat',
    message: 'Hindari aktivitas luar ruang dan gunakan masker.',
  },
  {
    min: 301,
    label: 'Berbahaya',
    short: 'Berbahaya',
    message: 'Udara berbahaya, sebaiknya tetap di dalam rumah.',
  },
];

const TIPS = [
  'Tips: gunakan masker N95 bila harus beraktivitas di luar.',
  'Tips: perbanyak minum air putih agar tubuh tetap terhidrasi.',
  'Tips: kurangi aktivitas berat di luar ruangan hari ini.',
  'Tips: tunda olahraga luar dan nyalakan penyaring udara dalam ruang.',
];

export function categoryFor(aqi: number): Category {
  const clamped = Number.isFinite(aqi) ? Math.max(0, aqi) : 0;
  let found = CATEGORIES[0];
  for (const category of CATEGORIES) {
    if (clamped >= category.min) found = category;
  }
  return found;
}

export function tipFor(aqi: number): string {
  const index = Math.min(Math.floor(Math.max(aqi, 0) / 100), TIPS.length - 1);
  return TIPS[index] ?? TIPS[0];
}

export type ZonedTime = { date: string; hour: number; minutes: number };

/** Wall-clock parts for a timezone, without pulling in a date library. */
export function zonedTime(now: Date, timeZone: string): ZonedTime {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  const hour = Number(get('hour')) % 24;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minutes: hour * 60 + Number(get('minute')),
  };
}

function parseClock(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return 0;
  return (Number(match[1]) % 24) * 60 + Number(match[2]);
}

/** Handles windows that cross midnight (22:00 → 06:00). */
export function isQuietHours(
  minutes: number,
  start: string | null,
  end: string | null,
): boolean {
  if (!start || !end) return false;
  const from = parseClock(start);
  const to = parseClock(end);
  if (from === to) return false;
  if (from < to) return minutes >= from && minutes < to;
  return minutes >= from || minutes < to;
}
