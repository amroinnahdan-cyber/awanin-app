import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useSelectedAir } from '@/hooks/useAirQuality';
import type { CurrentReading } from '@/api/openMeteo';
import { selectLocation } from '@/state/app';

jest.mock('@/lib/persist', () => ({
  loadPersisted: jest.fn(async () => null),
  savePersisted: jest.fn(),
}));

jest.mock('@/api/gateway', () => ({
  fetchAirSmart: jest.fn(),
  fetchHistorySmart: jest.fn(),
  fetchAqiSmart: jest.fn(),
}));

const { fetchAirSmart } = jest.requireMock('@/api/gateway') as {
  fetchAirSmart: jest.Mock;
};

function reading(aqi: number, observedAt = '2026-10-26T10:00'): CurrentReading {
  return {
    observedAt,
    aqi,
    pm25: 20,
    pm10: 30,
    temperature: 30,
    humidity: 70,
    wind: 4,
    weatherCode: 0,
    pollutants: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useSelectedAir', () => {
  beforeEach(() => {
    fetchAirSmart.mockReset();
  });

  it('keeps the newest location reading when an older request answers late', async () => {
    const slow = deferred<CurrentReading>();
    const fast = deferred<CurrentReading>();
    fetchAirSmart
      .mockImplementationOnce(() => slow.promise)
      .mockImplementationOnce(() => fast.promise);

    const { result } = await renderHook(() => useSelectedAir());

    // The user switches location before the first request answers. `monas` is
    // not the default, so this really does start a second run.
    await act(async () => {
      selectLocation('monas');
    });
    await waitFor(() => expect(fetchAirSmart).toHaveBeenCalledTimes(2));

    await act(async () => {
      fast.resolve(reading(42));
    });
    await waitFor(() => expect(result.current.data?.aqi).toBe(42));

    // The abandoned request lands afterwards; it must not overwrite the newer
    // reading, which was the "quickly swap locations and the number is wrong"
    // bug.
    await act(async () => {
      slow.resolve(reading(999));
    });

    expect(result.current.data?.aqi).toBe(42);
    expect(result.current.loading).toBe(false);
  });

  it('does not write state after unmount', async () => {
    const pending = deferred<CurrentReading>();
    fetchAirSmart.mockImplementationOnce(() => pending.promise);

    const { unmount } = await renderHook(() => useSelectedAir());
    await waitFor(() => expect(fetchAirSmart).toHaveBeenCalledTimes(1));
    await unmount();

    // A late resolve on an unmounted hook must not throw or write state.
    await act(async () => {
      pending.resolve(reading(120));
    });
    expect(fetchAirSmart).toHaveBeenCalledTimes(1);
  });
});
