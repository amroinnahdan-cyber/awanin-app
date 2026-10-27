import { useSyncExternalStore } from 'react';

import { locationSlug } from '@/api/openMeteo';
import { categoryFor, formatWib, shortDate } from '@/lib/aqi';
import { loadPersisted, savePersisted } from '@/lib/persist';

export type AwaninNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  /** Which location the change was seen at, so the row can open it */
  place: string;
  /**
   * Route slug of `place`. Stored rather than derived at tap time: a device
   * position is named after a district ("Kemang"), and slugifying that name
   * produced `/lokasi/kemang`, which matches no location at all.
   */
  slug: string;
  tone: 'info' | 'warning';
  read: boolean;
};

/**
 * In-memory notification store, persisted across restarts.
 *
 * There is no backend, so instead of seeding fake history the store starts empty
 * and only records real events: a change of AQI category observed while the app
 * runs (checked every time a reading is refreshed, per location), plus an
 * optional once-a-day summary when the profile's "Ringkasan harian" is on.
 *
 * The Profil switches are real gates: `badAirAlerts` controls the category-change
 * feed, `dailySummary` controls the daily digest.
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

type PersistedNotifications = {
  items?: AwaninNotification[];
  /** Baseline category per place, so a restart does not re-announce the same state */
  lastCategory?: Record<string, string>;
  /** Last day (YYYY-MM-DD) that received a daily summary */
  summaryDay?: string;
};

function persist() {
  savePersisted('notifications', {
    items,
    lastCategory: Object.fromEntries(lastCategoryByPlace),
    summaryDay: lastSummaryDay ?? undefined,
  } satisfies PersistedNotifications);
}

function pushNotification(entry: Omit<AwaninNotification, 'id' | 'read'>) {
  items = [{ ...entry, id: `${Date.now()}-${items.length}`, read: false }, ...items].slice(0, 20);
  persist();
  emit();
}

/** Baseline category per location: the first reading of a session is not an event. */
const lastCategoryByPlace = new Map<string, string>();
let lastSummaryDay: string | null = null;

export type ReadingObservation = {
  aqi: number;
  observedAt: string;
  place?: string;
  slug?: string;
};

export type NotificationGates = {
  /** notifMaster && "Peringatan AQI Tinggi" — category-change events */
  alertsEnabled: boolean;
  /** notifMaster && "Update Cuaca" — the once-a-day digest */
  dailySummaryEnabled: boolean;
  /** "Tips Kesehatan" — append a short health tip to each notification body */
  tipsEnabled: boolean;
};

const TIP_BY_CATEGORY = [
  'Tips: gunakan masker N95 bila harus beraktivitas di luar.',
  'Tips: perbanyak minum air putih agar tubuh tetap terhidrasi.',
  'Tips: kurangi aktivitas berat di luar ruangan hari ini.',
  'Tips: tunda olahraga luar dan nyalakan penyaring udara dalam ruang.',
];

function tipFor(aqi: number): string {
  const index = Math.min(Math.floor(aqi / 100), TIP_BY_CATEGORY.length - 1);
  return TIP_BY_CATEGORY[Math.max(index, 0)];
}

/**
 * Called on every successful reading.
 * - Category changes emit only while `alertsEnabled` is on (the baseline keeps
 *   tracking either way, so toggling back on does not replay old changes).
 * - With `dailySummaryEnabled`, the first reading of each day also emits one
 *   digest notification.
 * - With `tipsEnabled`, every emitted body ends with a short health tip.
 */
export function recordReading(reading: ReadingObservation, gates: NotificationGates) {
  const place = reading.place ?? 'Jakarta Pusat';
  const slug = reading.slug ?? locationSlug(place);
  const category = categoryFor(reading.aqi);
  const previous = lastCategoryByPlace.get(place);
  lastCategoryByPlace.set(place, category.label);
  const tip = gates.tipsEnabled ? ` ${tipFor(reading.aqi)}` : '';

  if (gates.dailySummaryEnabled) {
    const day = reading.observedAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day !== lastSummaryDay) {
      lastSummaryDay = day;
      pushNotification({
        title: `Ringkasan ${shortDate(day)} · ${place}`,
        body: `AQI terbaca ${reading.aqi} (${category.label}). ${category.message}${tip}`,
        time: formatWib(reading.observedAt),
        place,
        slug,
        tone: reading.aqi > 100 ? 'warning' : 'info',
      });
    }
  }

  if (!gates.alertsEnabled) {
    persist();
    return;
  }

  if (previous === undefined || previous === category.label) {
    persist();
    return;
  }

  pushNotification({
    title: `${place}: kualitas udara kini ${category.label.toLowerCase()}`,
    body: `${category.message} AQI tercatat ${reading.aqi}.${tip}`,
    time: formatWib(reading.observedAt),
    place,
    slug,
    tone: reading.aqi > 100 ? 'warning' : 'info',
  });
}

export function markRead(id: string) {
  if (!items.some((item) => item.id === id && !item.read)) return;
  items = items.map((item) => (item.id === id ? { ...item, read: true } : item));
  persist();
  emit();
}

export function markAllRead() {
  if (items.every((item) => item.read)) return;
  items = items.map((item) => ({ ...item, read: true }));
  persist();
  emit();
}

/** Exposed for the empty state copy and the sheet's "Bersihkan" action. */
export function clearNotificationCache() {
  items = [];
  lastCategoryByPlace.clear();
  lastSummaryDay = null;
  persist();
  emit();
}

/** Hydrate from storage. Called once from the root layout before first paint. */
export async function hydrateNotifications(): Promise<void> {
  const saved = await loadPersisted<PersistedNotifications>('notifications');
  if (!saved) return;
  if (Array.isArray(saved.items)) {
    // Items written before `slug` existed are migrated on read, so an old feed
    // still opens the right screen.
    items = saved.items
      .slice(0, 20)
      .map((item) => ({ ...item, slug: item.slug ?? locationSlug(item.place) }));
  }
  if (saved.lastCategory) {
    lastCategoryByPlace.clear();
    for (const [place, category] of Object.entries(saved.lastCategory)) {
      lastCategoryByPlace.set(place, category);
    }
  }
  if (typeof saved.summaryDay === 'string') lastSummaryDay = saved.summaryDay;
  emit();
}
