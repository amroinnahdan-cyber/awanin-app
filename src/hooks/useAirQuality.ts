import { useCallback, useEffect, useRef, useState } from 'react';

import {
  POPULAR_LOCATIONS,
  type Coordinates,
  type CurrentReading,
  type DayAqi,
} from '@/api/openMeteo';
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
      setRefreshing(true);
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
    [pastDays, selected.slug],
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

export type PopularLocationReading = {
  name: string;
  aqi: number;
};

/** Full reading (AQI + weather + pollutants) for any coordinate pair. */
export function useLocationAir(location: Coordinates | null, slug?: string) {
  return useAsync<CurrentReading>(async () => {
    if (!location) throw new Error('Lokasi tidak dikenal');
    return fetchAirSmart(location, slug);
  }, [location?.latitude, location?.longitude, slug]);
}

/** Real AQI for each popular location (fetched in parallel, one tiny call each). */
export function usePopularLocations() {
  return useAsync<PopularLocationReading[]>(async () => {
    const readings = await Promise.all(
      POPULAR_LOCATIONS.map(async (entry) => ({
        name: entry.name,
        aqi: await fetchAqiSmart(entry.location),
      })),
    );
    return readings;
  }, []);
}
