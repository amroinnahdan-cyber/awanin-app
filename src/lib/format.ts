import type { TemperatureUnit } from '@/state/app';

/**
 * The API always answers in °C; this is display only, driven by the profile's
 * "Unit & format" setting.
 */
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  if (!Number.isFinite(celsius)) return '—';
  return unit === 'F' ? `${Math.round((celsius * 9) / 5 + 32)}°F` : `${Math.round(celsius)}°C`;
}

/** "Baru saja" / "12 menit lalu" — used by the stale-data badge. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'waktu tidak diketahui';
  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}
