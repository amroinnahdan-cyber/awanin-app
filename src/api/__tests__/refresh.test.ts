import { fetchAirSmart } from '@/api/gateway';
import { JAKARTA_PUSAT, OpenMeteoTimeoutError, clearRequestCache } from '@/api/openMeteo';

jest.mock('@/lib/offline', () => ({
  saveReadingCache: jest.fn(),
  loadReadingCache: jest.fn(async () => null),
}));

/** Minimal Open-Meteo stand-in: one AQI payload and one weather payload. */
function mockFetch(aqi: number) {
  return jest.fn(async (url: string) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () =>
      url.includes('air-quality')
        ? {
            current: {
              time: '2026-10-26T10:00',
              us_aqi: aqi,
              pm2_5: 30,
              pm10: 44,
              carbon_monoxide: 120,
              nitrogen_dioxide: 9,
              sulphur_dioxide: 2,
              ozone: 30,
            },
          }
        : {
            current: {
              time: '2026-10-26T10:00',
              temperature_2m: 31,
              relative_humidity_2m: 68,
              wind_speed_10m: 4,
              weather_code: 1,
            },
          },
  }));
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  clearRequestCache();
});

describe('fetchAirSmart', () => {
  it('serves the cached reading, then refetches when forced', async () => {
    const first = mockFetch(80);
    global.fetch = first as unknown as typeof fetch;
    const initial = await fetchAirSmart(JAKARTA_PUSAT, 'jakarta-pusat');
    expect(initial.aqi).toBe(80);

    // Inside the 5-minute TTL: no request, identical payload. This is what made
    // pull-to-refresh look broken — the screen re-rendered with the same values.
    const second = mockFetch(120);
    global.fetch = second as unknown as typeof fetch;
    const cached = await fetchAirSmart(JAKARTA_PUSAT, 'jakarta-pusat');
    expect(cached.aqi).toBe(80);
    expect(second).not.toHaveBeenCalled();

    const forced = await fetchAirSmart(JAKARTA_PUSAT, 'jakarta-pusat', { force: true });
    expect(forced.aqi).toBe(120);
    expect(second).toHaveBeenCalled();
  });

  it('falls back to the device cache when the network fails', async () => {
    const { loadReadingCache } = jest.requireMock('@/lib/offline') as {
      loadReadingCache: jest.Mock;
    };
    loadReadingCache.mockResolvedValueOnce({
      reading: {
        observedAt: '2026-10-26T09:00',
        aqi: 66,
        pm25: 20,
        pm10: 30,
        temperature: 29,
        humidity: 70,
        wind: 3,
        weatherCode: 0,
        pollutants: [],
      },
      savedAt: '2026-10-26T09:05:00.000Z',
    });
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;

    const reading = await fetchAirSmart(JAKARTA_PUSAT, 'monas');
    expect(reading.aqi).toBe(66);
    expect(reading.stale).toBe(true);
    expect(reading.source).toBe('cache');
  });

  it('fails with a timeout error instead of hanging when Open-Meteo stalls', async () => {
    jest.useFakeTimers();
    try {
      // A request that never settles: without the deadline the await below
      // would hang the screen on "memuat" forever.
      global.fetch = jest.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ) as unknown as typeof fetch;

      const pending = fetchAirSmart(JAKARTA_PUSAT, 'jakarta-pusat', { force: true });
      const assertion = pending.then(
        () => {
          throw new Error('expected the stalled request to fail');
        },
        (error: unknown) => {
          expect(error).toBeInstanceOf(OpenMeteoTimeoutError);
        },
      );
      await jest.advanceTimersByTimeAsync(16_000);
      await assertion;
      await pending.catch(() => {});
    } finally {
      jest.useRealTimers();
    }
  });
});
