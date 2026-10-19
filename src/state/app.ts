import { useSyncExternalStore } from 'react';

import { JAKARTA_PUSAT, POPULAR_LOCATIONS, type Coordinates } from '@/api/openMeteo';
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
  return { selected: HOME_LOCATION, favorites: ['monas'], settings: { ...DEFAULT_SETTINGS } };
}

let state: AppState = defaultState();

type PersistedAppState = {
  selectedSlug?: string;
  selected?: { slug: string; name: string; area: string; latitude: number; longitude: number };
  favorites?: string[];
  settings?: Partial<AppSettings>;
};

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

export function findLocation(slug: string): AppLocation | null {
  return ALL_LOCATIONS.find((entry) => entry.slug === slug) ?? null;
}

const CUSTOM_SLUG = 'lokasi-saya';

/**
 * GPS result, kept as a normal AppLocation so every screen keeps working.
 * The coordinates are persisted with the rest of the state.
 */
export function selectCustomLocation(name: string, latitude: number, longitude: number) {
  const next: AppLocation = {
    slug: CUSTOM_SLUG,
    name,
    area: 'Lokasi perangkat',
    location: { latitude, longitude, timezone: 'Asia/Jakarta' },
  };
  state = { ...state, selected: next };
  emit();
}

export function selectLocation(slug: string) {
  const next = findLocation(slug);
  if (!next || next.slug === state.selected.slug) return;
  state = { ...state, selected: next };
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

/** Hydrate from storage. Called once from the root layout before first paint. */
export async function hydrateAppState(): Promise<void> {
  const saved = await loadPersisted<PersistedAppState>('app');
  if (!saved) return;
  const savedSelection =
    saved.selectedSlug === CUSTOM_SLUG && saved.selected
      ? {
          slug: CUSTOM_SLUG,
          name: saved.selected.name,
          area: saved.selected.area,
          location: {
            latitude: saved.selected.latitude,
            longitude: saved.selected.longitude,
            timezone: 'Asia/Jakarta',
          },
        }
      : null;
  state = {
    selected: savedSelection ?? findLocation(saved.selectedSlug ?? '') ?? HOME_LOCATION,
    favorites: Array.isArray(saved.favorites) ? saved.favorites : state.favorites,
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
  };
  emit();
}
