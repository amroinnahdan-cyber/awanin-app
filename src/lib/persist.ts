/**
 * Tiny persistence layer over AsyncStorage.
 *
 * AsyncStorage is in Expo's bundled native modules for this SDK (2.2.0), so it
 * runs in Expo Go, and on web it falls back to localStorage — one API for both.
 * Everything is JSON, best-effort: a corrupt or missing entry just means the
 * app starts with its defaults.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'awanin:';

export async function loadPersisted<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function savePersisted(key: string, value: unknown): void {
  try {
    void AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Best-effort: a full disk or private-browsing mode must not break the app.
  }
}
