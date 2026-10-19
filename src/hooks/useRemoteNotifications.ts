import { useCallback, useEffect, useRef, useState } from 'react';

import {
  backendConfigured,
  fetchRemoteNotifications,
  type RemoteNotification,
} from '@/api/backend';
import { getDeviceId } from '@/lib/device';

/**
 * Server-side notification log. Unlike the in-app feed (which only knows events
 * observed while the app was open), this list includes alerts the cron sent
 * while the app was closed.
 */
export function useRemoteNotifications(enabled: boolean) {
  const [items, setItems] = useState<RemoteNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    if (!enabled || !backendConfigured()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const deviceId = await getDeviceId();
      const next = await fetchRemoteNotifications(deviceId);
      if (alive.current) setItems(next);
    } catch (caught) {
      if (alive.current) {
        setError(caught instanceof Error ? caught.message : 'Gagal memuat riwayat server.');
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    alive.current = true;
    // Deferred so the first paint is not blocked by a synchronous setState in
    // the effect body (react-hooks/set-state-in-effect).
    const timer = setTimeout(() => void reload(), 0);
    return () => {
      alive.current = false;
      clearTimeout(timer);
    };
  }, [reload]);

  return { items, loading, error, reload };
}
