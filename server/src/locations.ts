import { CITY_LOCATIONS } from './cities.js';

/**
 * The five points the app can monitor. Kept in sync with
 * `awanin-app/src/api/openMeteo.ts` (POPULAR_LOCATIONS) and
 * `awanin-app/src/state/app.ts` (ALL_LOCATIONS).
 */
export type Location = {
  slug: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export const HOME_SLUG = 'jakarta-pusat';

export const LOCATIONS: Location[] = [
  {
    slug: 'jakarta-pusat',
    name: 'Jakarta Pusat',
    area: 'DKI Jakarta',
    latitude: -6.1754,
    longitude: 106.8272,
    timezone: 'Asia/Jakarta',
  },
  {
    slug: 'monas',
    name: 'Monas',
    area: 'Jakarta Pusat',
    latitude: -6.179,
    longitude: 106.8271,
    timezone: 'Asia/Jakarta',
  },
  {
    slug: 'bundaran-hi',
    name: 'Bundaran HI',
    area: 'Jakarta Pusat',
    latitude: -6.1949,
    longitude: 106.823,
    timezone: 'Asia/Jakarta',
  },
  {
    slug: 'gbk',
    name: 'GBK',
    area: 'Jakarta Pusat',
    latitude: -6.2185,
    longitude: 106.8022,
    timezone: 'Asia/Jakarta',
  },
  {
    slug: 'kota-tua',
    name: 'Kota Tua',
    area: 'Jakarta Barat',
    latitude: -6.135,
    longitude: 106.813,
    timezone: 'Asia/Jakarta',
  },
];

/**
 * Everything the server can name: the five showcase points plus the nationwide
 * cities the app's Indonesia screen offers. Lookups go through this list, so a
 * device that picked Bandung keeps that name in its alerts and history instead
 * of being labelled by raw coordinates.
 */
export const ALL_LOCATIONS: Location[] = [...LOCATIONS, ...CITY_LOCATIONS];

export function findLocation(slug: string): Location | null {
  return ALL_LOCATIONS.find((entry) => entry.slug === slug) ?? null;
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest entry of `candidates` within `maxKm`; `null` when nothing is that close. */
export function nearestLocation(
  latitude: number,
  longitude: number,
  maxKm = 15,
  candidates: Location[] = ALL_LOCATIONS,
): Location | null {
  let best: Location | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of candidates) {
    const distance = distanceKm(latitude, longitude, entry.latitude, entry.longitude);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return bestDistance <= maxKm ? best : null;
}

/** Inside Jakarta the showcase point is a better label than a neighbouring city. */
const NEAREST_LANDMARK_KM = 15;

/** Mirrors the app's `NEAREST_NAME_KM`: past 60 km the fix is somewhere unnamed. */
const NEAREST_CITY_KM = 60;

/** Mirrors the app's `NEAREST_CITY_TRUST_KM`, used only to pick a zone. */
const CITY_ZONE_KM = 250;

/**
 * IANA zone for a coordinate the catalogue does not know. Indonesia spans WIB,
 * WITA and WIT, so a fixed `Asia/Jakarta` would shift a Makassar alert by an
 * hour; the nearest city carries the zone for its province. The app derives its
 * zone the same way, so both sides schedule around the same clock.
 */
function zoneForCoordinates(latitude: number, longitude: number): string {
  const near = nearestLocation(latitude, longitude, CITY_ZONE_KM, CITY_LOCATIONS);
  return near?.timezone ?? 'Asia/Jakarta';
}

/** Resolve a slug or arbitrary coordinates into a location record. */
export function resolveLocation(input: {
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): Location {
  if (input.slug) {
    const known = findLocation(input.slug);
    if (known) return known;
  }
  if (typeof input.latitude === 'number' && typeof input.longitude === 'number') {
    // The device's own slug ("lokasi-saya") is not a catalogue entry, so a GPS
    // fix is named by where it actually is: the nearest showcase point in
    // Jakarta, then the nearest city, and only then a bare coordinate.
    const landmark = nearestLocation(input.latitude, input.longitude, NEAREST_LANDMARK_KM, LOCATIONS);
    if (landmark) return landmark;
    const city = nearestLocation(input.latitude, input.longitude, NEAREST_CITY_KM, CITY_LOCATIONS);
    if (city) return city;
    return {
      slug: `custom:${input.latitude.toFixed(3)},${input.longitude.toFixed(3)}`,
      name: 'Lokasi saya',
      area: 'Lokasi perangkat',
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: zoneForCoordinates(input.latitude, input.longitude),
    };
  }
  const home = findLocation(HOME_SLUG);
  if (!home) throw new Error('HOME_SLUG is not part of LOCATIONS');
  return home;
}
