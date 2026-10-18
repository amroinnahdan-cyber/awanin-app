import type { TemperatureUnit } from '@/state/app';

/**
 * The API always answers in °C; this is display only, driven by the profile's
 * "Unit & format" setting.
 */
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  if (!Number.isFinite(celsius)) return '—';
  return unit === 'F' ? `${Math.round((celsius * 9) / 5 + 32)}°F` : `${Math.round(celsius)}°C`;
}
