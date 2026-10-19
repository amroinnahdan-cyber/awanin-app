import { buildDailyForecast, groupHourlyByDay } from '@/api/openMeteo';

describe('groupHourlyByDay', () => {
  it('aggregates mean, max and min while skipping gaps', () => {
    const times = [
      '2026-10-17T00:00',
      '2026-10-17T01:00',
      '2026-10-17T02:00',
      '2026-10-18T00:00',
      null,
    ];
    const values = [40, 60, 80, 100, 999];

    expect(groupHourlyByDay(times, values)).toEqual([
      { day: '2026-10-17', avg: 60, max: 80, min: 40 },
      { day: '2026-10-18', avg: 100, max: 100, min: 100 },
    ]);
  });

  it('returns an empty series when nothing is valid', () => {
    expect(groupHourlyByDay([], [])).toEqual([]);
    expect(groupHourlyByDay([null], [Number.NaN])).toEqual([]);
  });
});

describe('buildDailyForecast', () => {
  const now = new Date('2026-10-18T00:00:00.000Z');

  it('keeps today and future days only, capped at seven', () => {
    const hourly = Array.from({ length: 24 * 10 }, (_, index) => {
      const at = new Date(Date.UTC(2026, 9, 15, index));
      return {
        time: at.toISOString().slice(0, 13),
        aqi: 50 + (index % 5),
      };
    });

    const forecast = buildDailyForecast(hourly, now);
    expect(forecast.length).toBeGreaterThan(0);
    expect(forecast.length).toBeLessThanOrEqual(7);
    expect(forecast.every((day) => day.day >= '2026-10-18')).toBe(true);
  });

  it('drops past days entirely', () => {
    const hourly = [
      { time: '2026-10-16T10:00', aqi: 200 },
      { time: '2026-10-17T10:00', aqi: 180 },
      { time: '2026-10-18T10:00', aqi: 90 },
    ];
    expect(buildDailyForecast(hourly, now)).toEqual([
      { day: '2026-10-18', avg: 90, max: 90, min: 90 },
    ]);
  });
});
