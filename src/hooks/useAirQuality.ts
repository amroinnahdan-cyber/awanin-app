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

/** `force` bypasses the API layer's TTL cache, so pull-to-refresh is a real refetch. */
export type RunOptions = { force?: boolean };

type AsyncResult<T> = AsyncState<T> & {
  reload: (options?: RunOptions) => Promise<void>;
  refreshing: boolean;
};

/**
 * One in-flight request per hook, newest wins.
 *
 * `alive` alone was not enough: a dependency change re-armed it in the next
 * effect run, so a slow answer for the *previous* location still passed the
 * check and overwrote the new one — the classic "swap locations quickly and the
 * reading (and its name) disagree" bug. Every run now takes a ticket and only
 * the newest ticket may write, which also covers unmount.
 */
function useAsync<T>(
  run: (options: RunOptions) => Promise<T>,
  deps: readonly unknown[],
  enabled = true,
): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const ticket = useRef(0);
  const runRef = useRef(run);
  runRef.current = run;

  const start = useCallback(async (options: RunOptions, mode: 'initial' | 'refresh') => {
    const id = (ticket.current += 1);
    const live = () => mounted.current && ticket.current === id;
    if (mode === 'refresh') setRefreshing(true);
    // A new request supersedes the previous failure: leaving the old error on
    // screen next to a spinner claims the retry already failed.
    setState((previous) => ({ ...previous, error: null }));
    try {
      const data = await runRef.current(options);
      if (live()) setState({ data, loading: false, error: null });
    } catch (error) {
      if (live()) {
        setState((previous) => ({
          data: previous.data,
          loading: false,
          error: error instanceof Error ? error.message : 'Koneksi gagal',
        }));
      }
    } finally {
      if (live() && mode === 'refresh') setRefreshing(false);
    }
  }, []);

  const reload = useCallback(
    (options?: RunOptions) => start(options ?? {}, 'refresh'),
    [start],
  );

  useEffect(() => {
    mounted.current = true;
    // A disabled hook (a closed picker) must not spend the Open-Meteo quota.
    if (enabled) void start({}, 'initial');
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

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
      { aqi: reading.aqi, observedAt: reading.observedAt, slug: 'jakarta-pusat' },
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
  return useAsync<CurrentReading>(async (options) => {
    const reading = await fetchAirSmart(selected.location, selected.slug, options);
    recordReading(
      {
        aqi: reading.aqi,
        observedAt: reading.observedAt,
        place: selected.name,
        slug: selected.slug,
      },
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
    (options) => fetchHistorySmart(pastDays, selected.location, selected.slug, options),
    [pastDays, selected.slug, selected.location.latitude, selected.location.longitude],
  );
}

export type DirectoryEntry = { slug: string; name: string; aqi: number };

/**
 * AQI for every pickable location, so the picker can show live numbers. Five
 * one-field requests, cached for 5 minutes each by the API layer.
 *
 * Pass `enabled: false` while the picker is closed: mounting the sheet's host
 * screen used to spend those five calls on app start even when nobody ever
 * opened the picker.
 */
export function useLocationDirectory({ enabled = true }: { enabled?: boolean } = {}) {
  return useAsync<DirectoryEntry[]>(
    (options) =>
      Promise.all(
        ALL_LOCATIONS.map(async (entry) => ({
          slug: entry.slug,
          name: entry.name,
          aqi: await fetchAqiSmart(entry.location, entry.slug, options),
        })),
      ),
    [],
    enabled,
  );
}

/** Full reading (AQI + weather + pollutants) for any coordinate pair. */
export function useLocationAir(location: Coordinates | null, slug?: string) {
  return useAsync<CurrentReading>(async (options) => {
    if (!location) throw new Error('Lokasi tidak dikenal');
    return fetchAirSmart(location, slug, options);
  }, [location?.latitude, location?.longitude, slug]);
}

/**
 * Nationwide ranking for the Beranda card. It shares `fetchIndonesiaAqi`'s
 * ten-minute cache with the Indonesia screen, so opening one after the other
 * costs a single request.
 */
export function useIndonesiaRanking() {
  return useAsync<IndonesiaReading>(
    (options) => fetchIndonesiaAqi({ force: options?.force }),
    [],
  );
}

/**
 * 24-hour AQI change for any list of points — the six on the Beranda card, one
 * detail screen, or every city on the national ranking. Keyed by slug so a new
 * list triggers one fetch, not one per render; a failure leaves the screen
 * without deltas instead of replacing it with an error.
 */
export function useCityTrends(points: TrendPoint[], enabled = true) {
  const key = points.map((point) => point.slug).join(',');
  return useAsync<Record<string, AqiTrend>>(
    () => (key ? fetchCityTrends(points) : Promise.resolve({})),
    [key],
    enabled,
  );
}
