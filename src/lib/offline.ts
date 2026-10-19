import { loadPersisted, savePersisted } from '@/lib/persist';
import type { CurrentReading } from '@/api/openMeteo';

/**
 * Last successful reading per location, kept on the device.
 *
 * A quality-of-air app is most useful exactly when the connection is poor, so a
 * failed request falls back to the newest saved reading (labelled with its age)
 * instead of an error card.
 */
type CachedReading = { reading: CurrentReading; savedAt: string };

const key = (slug: string) => `reading:${slug}`;

export function saveReadingCache(slug: string, reading: CurrentReading): void {
  savePersisted(key(slug), { reading, savedAt: new Date().toISOString() } satisfies CachedReading);
}

export async function loadReadingCache(
  slug: string,
): Promise<{ reading: CurrentReading; savedAt: string } | null> {
  const saved = await loadPersisted<CachedReading>(key(slug));
  if (!saved || !saved.reading) return null;
  return saved;
}
