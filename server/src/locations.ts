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

export function findLocation(slug: string): Location | null {
  return LOCATIONS.find((entry) => entry.slug === slug) ?? null;
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

/** Nearest monitored point within `maxKm`; used to re-use a known slug for coordinates. */
export function nearestLocation(
  latitude: number,
  longitude: number,
  maxKm = 15,
): Location | null {
  let best: Location | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of LOCATIONS) {
    const distance = distanceKm(latitude, longitude, entry.latitude, entry.longitude);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return bestDistance <= maxKm ? best : null;
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
    const near = nearestLocation(input.latitude, input.longitude);
    if (near) return near;
    return {
      slug: `custom:${input.latitude.toFixed(3)},${input.longitude.toFixed(3)}`,
      name: 'Lokasi saya',
      area: 'Lokasi perangkat',
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: 'Asia/Jakarta',
    };
  }
  const home = findLocation(HOME_SLUG);
  if (!home) throw new Error('HOME_SLUG is not part of LOCATIONS');
  return home;
}
