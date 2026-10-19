import { loadPersisted, savePersisted } from '@/lib/persist';

/**
 * Anonymous device id.
 *
 * The backend only needs a stable key to attach push preferences and a token
 * to; there is no account, no email and no name. Generated once and persisted,
 * so reinstalling creates a new identity (the old row simply stops receiving).
 */
const KEY = 'device-id';
let cached: string | null = null;

function generate(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `awanin-${Date.now().toString(36)}-${random}`;
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const saved = await loadPersisted<string>(KEY);
  if (saved && /^[A-Za-z0-9:_-]{8,128}$/.test(saved)) {
    cached = saved;
    return saved;
  }
  const next = generate();
  cached = next;
  savePersisted(KEY, next);
  return next;
}
