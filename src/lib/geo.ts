/**
 * Geospatial helpers for the "Sekitar" screen.
 *
 * The app has no map: the screen orders the monitored points by their real
 * distance from the device instead of drawing them. Everything here is plain
 * arithmetic on lat/lon, so it runs identically on web and native.
 */
import { INDONESIA_CITIES } from '@/data/indonesiaCities';

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in kilometres between two coordinate pairs. */
export function distanceKm(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * A city's zone is only trusted this close: within it the nearest city is a
 * better description of the actual place than the device's own setting.
 */
const NEAREST_CITY_TRUST_KM = 250;

/** The device's IANA zone, or null when the runtime cannot name one (`UTC` is not one). */
export function deviceTimezone(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone === 'string' && zone.includes('/') && zone !== 'UTC') return zone;
  } catch {
    // Hermes builds without Intl throw here; the caller has fallbacks.
  }
  return null;
}

/**
 * IANA zone for an arbitrary coordinate.
 *
 * Indonesia spans three zones (WIB, WITA, WIT), so open water and a coordinate
 * off Java cannot share one constant: bolting `Asia/Jakarta` onto a GPS fix in
 * Makassar would shift every forecast hour by one and a test in Jayapura by
 * two. The hundred-city table already carries the right zone for every province,
 * so the nearest entry answers for the surrounding area. Beyond that radius the
 * device's own zone is the better guess (a user abroad, or far offshore).
 */
export function timezoneForCoordinates(
  latitude: number,
  longitude: number,
  fallbackZone: string | null = deviceTimezone(),
): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return fallbackZone ?? 'Asia/Jakarta';
  }

  let nearest: { zone: string; km: number } | null = null;
  for (const city of INDONESIA_CITIES) {
    const km = distanceKm(latitude, longitude, city.latitude, city.longitude);
    if (!nearest || km < nearest.km) nearest = { zone: city.timezone, km };
  }

  if (nearest && nearest.km <= NEAREST_CITY_TRUST_KM) return nearest.zone;
  return fallbackZone ?? nearest?.zone ?? 'Asia/Jakarta';
}

/**
 * Human distance, Indonesian style: metres under a kilometre, one decimal
 * (comma separator) up to 10 km, whole kilometres beyond that.
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '—';
  const meters = Math.round((km * 1000) / 10) * 10;
  if (meters < 10) return '< 10 m';
  if (meters < 1000) return `${meters} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Coordinates with hemispheres instead of a signed pair: "-6,175, 106,827"
 * reads as three numbers, "6,175° LS · 106,827° BT" does not.
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '—';
  const value = (number: number) => Math.abs(number).toFixed(3).replace('.', ',');
  return `${value(latitude)}° ${latitude < 0 ? 'LS' : 'LU'} · ${value(longitude)}° ${
    longitude < 0 ? 'BB' : 'BT'
  }`;
}
