import { useSyncExternalStore } from 'react';

import { JAKARTA_PUSAT, POPULAR_LOCATIONS, type Coordinates } from '@/api/openMeteo';

/**
 * App-wide state: which location every screen is looking at, the user's
 * favourites, and the handful of real settings the profile rows control.
 *
 * Same pattern as `state/notifications.ts` — a module-level store read through
 * `useSyncExternalStore` — so any screen can read or change it without a provider
 * and without prop drilling. It is deliberately in-memory: there is no backend,
 * and persisting would need a native storage module (a dev build), see README.
 */

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

export type AppSettings = {
  /** Warn when the AQI moves into a worse category */
  badAirAlerts: boolean;
  /** A once-a-day summary of the reading */
  dailySummary: boolean;
  temperatureUnit: TemperatureUnit;
};

type AppState = {
  selected: AppLocation;
  favorites: string[];
  settings: AppSettings;
};

let state: AppState = {
  selected: HOME_LOCATION,
  favorites: ['monas'],
  settings: { badAirAlerts: true, dailySummary: false, temperatureUnit: 'C' },
};

const listeners = new Set<() => void>();

function emit() {
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
  state = {
    selected: HOME_LOCATION,
    favorites: [],
    settings: { badAirAlerts: true, dailySummary: false, temperatureUnit: 'C' },
  };
  emit();
}
