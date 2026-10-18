import { useSyncExternalStore } from 'react';

import { categoryFor, formatWib } from '@/lib/aqi';

export type AwaninNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  /** Which location the change was seen at, so the row can open it */
  place: string;
  tone: 'info' | 'warning';
  read: boolean;
};

/**
 * In-memory notification store.
 *
 * There is no backend, so instead of seeding fake history the store starts empty
 * and only records a real event: a change of AQI category observed while the app
 * runs (checked every time a reading is refreshed, per location).
 */
let items: AwaninNotification[] = [];
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

function getSnapshot(): AwaninNotification[] {
  return items;
}

export function useNotifications(): AwaninNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function pushNotification(entry: Omit<AwaninNotification, 'id' | 'read'>) {
  items = [{ ...entry, id: `${Date.now()}-${items.length}`, read: false }, ...items].slice(0, 20);
  emit();
}

/** Baseline category per location: the first reading of a session is not an event. */
const lastCategoryByPlace = new Map<string, string>();

/** Called on every successful reading; only emits when the category changes. */
export function recordReading(reading: { aqi: number; observedAt: string; place?: string }) {
  const place = reading.place ?? 'Jakarta Pusat';
  const category = categoryFor(reading.aqi);
  const previous = lastCategoryByPlace.get(place);
  lastCategoryByPlace.set(place, category.label);

  if (previous === undefined || previous === category.label) return;

  pushNotification({
    title: `${place}: kualitas udara kini ${category.label.toLowerCase()}`,
    body: `${category.message} AQI tercatat ${reading.aqi}.`,
    time: formatWib(reading.observedAt),
    place,
    tone: reading.aqi > 100 ? 'warning' : 'info',
  });
}

export function markRead(id: string) {
  if (!items.some((item) => item.id === id && !item.read)) return;
  items = items.map((item) => (item.id === id ? { ...item, read: true } : item));
  emit();
}

export function markAllRead() {
  if (items.every((item) => item.read)) return;
  items = items.map((item) => ({ ...item, read: true }));
  emit();
}

/** Exposed for the empty state copy and the sheet's "Bersihkan" action. */
export function clearNotificationCache() {
  items = [];
  lastCategoryByPlace.clear();
  emit();
}
