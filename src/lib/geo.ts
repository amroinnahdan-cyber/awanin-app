/**
 * Geospatial helpers for the "Sekitar" screen.
 *
 * The app has no map: the screen orders the monitored points by their real
 * distance from the device instead of drawing them. Everything here is plain
 * arithmetic on lat/lon, so it runs identically on web and native.
 */

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
