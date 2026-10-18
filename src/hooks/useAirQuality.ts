import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type Coordinates,
  type CurrentReading,
  type DayAqi,
  POPULAR_LOCATIONS,
  fetchAqiAt,
  fetchCurrentReading,
  fetchDailyAqi,
} from '@/api/openMeteo';
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
  return useAsync<CurrentReading>(async () => {
    const reading = await fetchCurrentReading();
    recordReading({ aqi: reading.aqi, observedAt: reading.observedAt });
    return reading;
  }, []);
}

/**
 * The reading every screen follows: whatever location the user picked in the
 * location sheet. Re-runs when the selection changes (and records the reading for
 * the notification feed, as useCurrentAir does for the default location).
 */
export function useSelectedAir() {
  const { selected } = useAppState();
  return useAsync<CurrentReading>(async () => {
    const reading = await fetchCurrentReading(selected.location);
    recordReading({ aqi: reading.aqi, observedAt: reading.observedAt, place: selected.name });
    return reading;
  }, [selected.slug]);
}

/** Daily AQI series for the history chart (7 or 30 days). */
export function useAqiHistory(pastDays: 7 | 30) {
  return useAsync<DayAqi[]>(() => fetchDailyAqi(pastDays), [pastDays]);
}

/** History for the selected location, over any window Open-Meteo accepts (<=92). */
export function useSelectedHistory(pastDays: number) {
  const { selected } = useAppState();
  return useAsync<DayAqi[]>(() => fetchDailyAqi(pastDays, selected.location), [
    pastDays,
    selected.slug,
  ]);
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
          aqi: await fetchAqiAt(entry.location),
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
export function useLocationAir(location: Coordinates | null) {
  return useAsync<CurrentReading>(async () => {
    if (!location) throw new Error('Lokasi tidak dikenal');
    return fetchCurrentReading(location);
  }, [location?.latitude, location?.longitude]);
}

/** Real AQI for each popular location (fetched in parallel, one tiny call each). */
export function usePopularLocations() {
  return useAsync<PopularLocationReading[]>(async () => {
    const readings = await Promise.all(
      POPULAR_LOCATIONS.map(async (entry) => ({
        name: entry.name,
        aqi: await fetchAqiAt(entry.location),
      })),
    );
    return readings;
  }, []);
}