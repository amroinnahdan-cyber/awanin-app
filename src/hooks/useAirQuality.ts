import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordinates, CurrentReading, DayAqi } from '@/api/openMeteo';
import {
  fetchCityTrends,
  fetchIndonesiaAqi,
  type IndonesiaReading,
} from '@/api/indonesia';
import type { AqiTrend, TrendPoint } from '@/lib/indonesia';
import { fetchAirSmart, fetchAqiSmart, fetchHistorySmart } from '@/api/gateway';
import { ALL_LOCATIONS, useAppState } from '@/state/app';
import { recordReading } from '@/state/notifications';

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function useAsync<T>(
  run: () => Promise<T>,
  deps: readonly unknown[],
): AsyncState<T> & { reload: () => Promise<void>; refreshing: boolean } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const alive = useRef(true);
  const runRef = useRef(run);
  runRef.current = run;

  const reload = useCallback(async () => {
    try {
      if (alive.current) {
        setRefreshing(true);
        // A new request supersedes the previous failure: leaving the old error
        // on screen next to a spinner claims the retry already failed.
        setState((previous) => ({ ...previous, error: null }));
      }
      const data = await runRef.current();
      if (alive.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (alive.current) {
        setState((previous) => ({
          data: previous.data,
          loading: false,
          error: error instanceof Error ? error.message : 'Koneksi gagal',
        }));
      }
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload, refreshing };
}

/** Current AQI + weather for Jakarta Pusat; also feeds the notification store. */
export function useCurrentAir() {
  const { settings } = useAppState();
  return useAsync<CurrentReading>(async () => {
    const reading = await fetchAirSmart(
      { latitude: -6.1754, longitude: 106.8272, timezone: 'Asia/Jakarta' },
      'jakarta-pusat',
    );
    recordReading(
      { aqi: reading.aqi, observedAt: reading.observedAt },
      {
        alertsEnabled: settings.notifMaster && settings.badAirAlerts,
        dailySummaryEnabled: settings.notifMaster && settings.weatherUpdate,
        tipsEnabled: settings.tipsHealth,
      },
    );
    return reading;
  }, [settings.notifMaster, settings.badAirAlerts, settings.weatherUpdate, settings.tipsHealth]);
}

/**
 * The reading every screen follows: whatever location the user picked in the
 * location sheet. Re-runs when the selection changes (and records the reading for
 * the notification feed, as useCurrentAir does for the default location).
 */
export function useSelectedAir() {
  const { selected, settings } = useAppState();
  return useAsync<CurrentReading>(async () => {
    const reading = await fetchAirSmart(selected.location, selected.slug);
    recordReading(
      { aqi: reading.aqi, observedAt: reading.observedAt, place: selected.name },
      {
        alertsEnabled: settings.notifMaster && settings.badAirAlerts,
        dailySummaryEnabled: settings.notifMaster && settings.weatherUpdate,
        tipsEnabled: settings.tipsHealth,
      },
    );
    return reading;
  }, [
    selected.slug,
    selected.location.latitude,
    selected.location.longitude,
    settings.notifMaster,
    settings.badAirAlerts,
    settings.weatherUpdate,
    settings.tipsHealth,
  ]);
}

/** History for the selected location, over any window Open-Meteo accepts (<=92). */
export function useSelectedHistory(pastDays: number) {
  const { selected } = useAppState();
  return useAsync<DayAqi[]>(
    () => fetchHistorySmart(pastDays, selected.location, selected.slug),
    [pastDays, selected.slug, selected.location.latitude, selected.location.longitude],
  );
}

export type DirectoryEntry = { slug: string; name: string; aqi: number };

/**
 * AQI for every pickable location, so the picker can show live numbers. Five
 * one-field requests, cached for 5 minutes each by the API layer.
 */
export function useLocationDirectory() {
  return useAsync<DirectoryEntry[]>(
    () =>
      Promise.all(
        ALL_LOCATIONS.map(async (entry) => ({
          slug: entry.slug,
          name: entry.name,
          aqi: await fetchAqiSmart(entry.location, entry.slug),
        })),
      ),
    [],
  );
}

/** Full reading (AQI + weather + pollutants) for any coordinate pair. */
export function useLocationAir(location: Coordinates | null, slug?: string) {
  return useAsync<CurrentReading>(async () => {
    if (!location) throw new Error('Lokasi tidak dikenal');
    return fetchAirSmart(location, slug);
  }, [location?.latitude, location?.longitude, slug]);
}

/**
 * Nationwide ranking for the Beranda card. It shares `fetchIndonesiaAqi`'s
 * ten-minute cache with the Indonesia screen, so opening one after the other
 * costs a single request.
 */
export function useIndonesiaRanking() {
  return useAsync<IndonesiaReading>(() => fetchIndonesiaAqi(), []);
}

/**
 * 24-hour AQI change for any list of points — the six on the Beranda card, one
 * detail screen, or every city on the national ranking. Keyed by slug so a new
 * list triggers one fetch, not one per render; a failure leaves the screen
 * without deltas instead of replacing it with an error.
 */
export function useCityTrends(points: TrendPoint[]) {
  const key = points.map((point) => point.slug).join(',');
  return useAsync<Record<string, AqiTrend>>(
    () => (key ? fetchCityTrends(points) : Promise.resolve({})),
    [key],
  );
}
