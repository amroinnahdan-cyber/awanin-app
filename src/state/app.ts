import { useSyncExternalStore } from 'react';

import { JAKARTA_PUSAT, POPULAR_LOCATIONS, type Coordinates } from '@/api/openMeteo';
import { INDONESIA_CITIES, type IndonesiaCity } from '@/data/indonesiaCities';
import { distanceKm, timezoneForCoordinates } from '@/lib/geo';
import { loadPersisted, savePersisted } from '@/lib/persist';

/**
 * App-wide state: which location every screen is looking at, the user's
 * favourites, and the handful of real settings the profile rows control.
 *
 * Same pattern as `state/notifications.ts` — a module-level store read through
 * `useSyncExternalStore` — so any screen can read or change it without a provider
 * and without prop drilling. The state is persisted with AsyncStorage
 * (`lib/persist.ts`) and hydrated at startup, so choices survive a restart.
 */

/**
 * Placeholder profile shown on the Profil screen — the demo persona from the
 * design showcase. There is no account system; change these two lines to rebrand.
 */
export type UserProfile = {
  name: string;
  email: string;
  initials: string;
};

export const USER_PROFILE: UserProfile = {
  name: 'Dzul Amroin',
  email: 'dzulamroin@gmail.com',
  initials: 'DA',
};

export type AppLocation = {
  slug: string;
  name: string;
  /** Shown as the subtitle, e.g. "Jakarta Pusat" */
  area: string;
  location: Coordinates;
};

export const HOME_LOCATION: AppLocation = {
  slug: 'jakarta-pusat',
  name: 'Jakarta Pusat',
  area: 'DKI Jakarta',
  location: JAKARTA_PUSAT,
};

export const ALL_LOCATIONS: AppLocation[] = [
  HOME_LOCATION,
  ...POPULAR_LOCATIONS.map((entry) => ({
    slug: entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: entry.name,
    area: 'Jakarta Pusat',
    location: entry.location,
  })),
];

export type TemperatureUnit = 'C' | 'F';
export type ThemeMode = 'system' | 'light' | 'dark';

export type AppSettings = {
  /** Master switch — "Peringatan Kualitas Udara" */
  notifMaster: boolean;
  /** "Peringatan AQI Tinggi" — notify when the AQI category worsens */
  badAirAlerts: boolean;
  /** "Tips Kesehatan" — attach a health tip to notifications */
  tipsHealth: boolean;
  /** "Update Cuaca" — once-a-day digest of reading + weather */
  weatherUpdate: boolean;
  temperatureUnit: TemperatureUnit;
  /** Light / dark / follow the OS */
  themeMode: ThemeMode;
  /** First-run onboarding finished */
  onboarded: boolean;
};

type AppState = {
  selected: AppLocation;
  /** Last position read from the device GPS, if any — drawn on the map. */
  deviceLocation: AppLocation | null;
  /**
   * True after the user picks a place by hand (sheet, Sekitar list, Indonesia
   * screen, detail CTA). While false, a fresh GPS fix also moves `selected`,
   * so the home screen follows the device instead of sitting on Jakarta Pusat.
   * Persisted so a restart does not undo an explicit choice.
   */
  manualOverride: boolean;
  favorites: string[];
  settings: AppSettings;
};

const DEFAULT_SETTINGS: AppSettings = {
  notifMaster: true,
  badAirAlerts: true,
  tipsHealth: true,
  weatherUpdate: false,
  temperatureUnit: 'C',
  themeMode: 'system',
  onboarded: false,
};

function defaultState(): AppState {
  return {
    selected: HOME_LOCATION,
    deviceLocation: null,
    manualOverride: false,
    favorites: ['monas'],
    settings: { ...DEFAULT_SETTINGS },
  };
}

let state: AppState = defaultState();

type PersistedLocation = { name: string; area: string; latitude: number; longitude: number };

type PersistedAppState = {
  selectedSlug?: string;
  selected?: PersistedLocation & { slug: string };
  deviceLocation?: PersistedLocation;
  manualOverride?: boolean;
  favorites?: string[];
  settings?: Partial<AppSettings>;
};

function toAppLocation(slug: string, saved: PersistedLocation): AppLocation {
  return {
    slug,
    name: saved.name,
    area: saved.area,
    // Zone is not persisted: it is derived from the coordinates so a fix taken
    // in Makassar or Jayapura keeps WITA/WIT hours after a restart.
    location: {
      latitude: saved.latitude,
      longitude: saved.longitude,
      timezone: timezoneForCoordinates(saved.latitude, saved.longitude),
    },
  };
}

const listeners = new Set<() => void>();

function emit() {
  savePersisted('app', {
    selectedSlug: state.selected.slug,
    selected: {
      slug: state.selected.slug,
      name: state.selected.name,
      area: state.selected.area,
      latitude: state.selected.location.latitude,
      longitude: state.selected.location.longitude,
    },
    deviceLocation: state.deviceLocation
      ? {
          name: state.deviceLocation.name,
          area: state.deviceLocation.area,
          latitude: state.deviceLocation.location.latitude,
          longitude: state.deviceLocation.location.longitude,
        }
      : undefined,
    manualOverride: state.manualOverride,
    favorites: state.favorites,
    settings: state.settings,
  } satisfies PersistedAppState);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppState {
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Any place the app can look at: the five showcase points, or one of the
 * nationwide cities. Cities are stored in the bundle, so a city picked from the
 * Indonesia screen keeps working after a restart without extra state.
 */
export function findLocation(slug: string): AppLocation | null {
  // The device position is a real slug too, so a notification or a link that
  // points at it opens `lokasi-saya` instead of "lokasi tidak dikenal".
  if (slug === DEVICE_LOCATION_SLUG && state.deviceLocation) return state.deviceLocation;

  const known = ALL_LOCATIONS.find((entry) => entry.slug === slug);
  if (known) return known;

  const city = INDONESIA_CITIES.find((entry) => entry.slug === slug);
  if (!city) return null;
  return {
    slug: city.slug,
    name: city.name,
    area: city.province,
    location: { latitude: city.latitude, longitude: city.longitude, timezone: city.timezone },
  };
}

export const DEVICE_LOCATION_SLUG = 'lokasi-saya';

/**
 * Nearest bundled city to a GPS fix, so the selected location reads "Bekasi"
 * instead of a stale geocoder label. Beyond 60 km the fix is genuinely
 * somewhere unnamed, so the caller keeps the reverse-geocode name.
 */
const NEAREST_NAME_KM = 60;

function nearestKnownCity(latitude: number, longitude: number): IndonesiaCity | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  let nearest: { city: IndonesiaCity; km: number } | null = null;
  for (const city of INDONESIA_CITIES) {
    const km = distanceKm(latitude, longitude, city.latitude, city.longitude);
    if (!nearest || km < nearest.km) nearest = { city, km };
  }
  return nearest && nearest.km <= NEAREST_NAME_KM ? nearest.city : null;
}

/**
 * GPS result, kept as a normal AppLocation so every screen keeps working.
 * Stored as `deviceLocation` too, so the map keeps a "Lokasi saya" pin (and the
 * ability to return to it) after the user picks a landmark. Coordinates are
 * persisted with the rest of the state.
 *
 * The name prefers the nearest known city (Bekasi, Makassar, …) over a raw
 * reverse-geocode label: on a device whose geocoder answers with a stale or
 * foreign region ("Santa Clara County") the city table still says where the
 * fix really is, and when the user is abroad the device zone is the fallback.
 */
export function selectCustomLocation(name: string, latitude: number, longitude: number) {
  const nearest = nearestKnownCity(latitude, longitude);
  const resolved: AppLocation = {
    slug: DEVICE_LOCATION_SLUG,
    name: nearest?.name ?? name,
    area: nearest ? nearest.province : 'Lokasi perangkat',
    location: { latitude, longitude, timezone: timezoneForCoordinates(latitude, longitude) },
  };
  // A fresh fix always refreshes the stored device pin. It also moves the
  // active screen unless the user has explicitly picked a place — that is
  // what makes the home screen follow Bekasi after "Deteksi lokasi saya"
  // instead of sitting on Jakarta Pusat.
  state = {
    ...state,
    selected: state.manualOverride ? state.selected : resolved,
    deviceLocation: resolved,
  };
  emit();
}

/** Re-select the stored device position without a new GPS read. */
export function selectDeviceLocation() {
  if (!state.deviceLocation) return;
  // No slug-equality shortcut here: `deviceLocation` is refreshed by every
  // fix while `selected` may still point at the previous one, and both share
  // the `lokasi-saya` slug — comparing slugs would keep the stale fix.
  state = { ...state, selected: state.deviceLocation, manualOverride: false };
  emit();
}

export function selectLocation(slug: string) {
  const next = findLocation(slug);
  if (!next) return;
  // Same stale-slug trap as above: the device slug is shared by every fix, so
  // re-selecting it must always refresh `selected` to the newest coordinates.
  if (next.slug === state.selected.slug && next.slug !== DEVICE_LOCATION_SLUG) return;
  state = { ...state, selected: next, manualOverride: next.slug !== DEVICE_LOCATION_SLUG };
  emit();
}

export function selectLocationByName(name: string) {
  const next = ALL_LOCATIONS.find((entry) => entry.name === name);
  if (next) selectLocation(next.slug);
}

export function toggleFavorite(slug: string) {
  const favorites = state.favorites.includes(slug)
    ? state.favorites.filter((entry) => entry !== slug)
    : [...state.favorites, slug];
  state = { ...state, favorites };
  emit();
}

export function updateSettings(patch: Partial<AppSettings>) {
  state = { ...state, settings: { ...state.settings, ...patch } };
  emit();
}

/** Used by the profile's "Keluar" confirmation: back to a first-run state. */
export function resetAppState() {
  state = defaultState();
  emit();
}

/**
 * Whether a quiet startup read may also move the active screen: only when the
 * user never picked a place by hand. A stored or fresh device pin is always
 * kept either way, so Sekitar can still show it.
 */
export function shouldFollowDevice(): boolean {
  return !state.manualOverride;
}

/** Hydrate from storage. Called once from the root layout before first paint. */
export async function hydrateAppState(): Promise<void> {
  const saved = await loadPersisted<PersistedAppState>('app');
  if (!saved) return;
  const selected =
    saved.selectedSlug === DEVICE_LOCATION_SLUG && saved.selected
      ? toAppLocation(DEVICE_LOCATION_SLUG, saved.selected)
      : (findLocation(saved.selectedSlug ?? '') ?? HOME_LOCATION);
  state = {
    selected,
    deviceLocation: saved.deviceLocation
      ? toAppLocation(DEVICE_LOCATION_SLUG, saved.deviceLocation)
      : null,
    manualOverride: saved.manualOverride ?? saved.selectedSlug !== DEVICE_LOCATION_SLUG,
    favorites: Array.isArray(saved.favorites) ? saved.favorites : state.favorites,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
  };
  emit();
}
