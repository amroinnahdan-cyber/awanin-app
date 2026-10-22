import type { IndonesiaCity } from '@/data/indonesiaCities';
import {
  buildRows,
  describeTrend,
  filterRows,
  matchesFilter,
  parseAqiBatch,
  parseHourlyTrend,
  pickExtremes,
  summarize,
} from '@/lib/indonesia';

const city = (slug: string, name: string, province: string): IndonesiaCity => ({
  slug,
  name,
  province,
  latitude: 0,
  longitude: 0,
  timezone: 'Asia/Jakarta',
});

const CITIES = [
  city('bandung', 'Bandung', 'Jawa Barat'),
  city('medan', 'Medan', 'Sumatera Utara'),
  city('nabire', 'Nabire', 'Papua Tengah'),
  city('jayapura', 'Jayapura', 'Papua'),
];

describe('parseAqiBatch', () => {
  it('joins results to cities by position', () => {
    const payload = [
      { current: { us_aqi: 120.4 } },
      { current: { us_aqi: 45 } },
      { current: { us_aqi: 210 } },
      { current: { us_aqi: 80 } },
    ];
    expect(parseAqiBatch(payload, CITIES)).toEqual([
      { slug: 'bandung', aqi: 120 },
      { slug: 'medan', aqi: 45 },
      { slug: 'nabire', aqi: 210 },
      { slug: 'jayapura', aqi: 80 },
    ]);
  });

  it('drops gaps instead of turning them into AQI 0', () => {
    const payload = [{ current: {} }, { current: { us_aqi: null } }, { current: { us_aqi: 70 } }];
    expect(parseAqiBatch(payload, CITIES)).toEqual([{ slug: 'nabire', aqi: 70 }]);
  });

  it('accepts a single-object response', () => {
    expect(parseAqiBatch({ current: { us_aqi: 33 } }, CITIES)).toEqual([
      { slug: 'bandung', aqi: 33 },
    ]);
  });

  it('ignores results beyond the requested city list', () => {
    const payload = [{ current: { us_aqi: 10 } }, { current: { us_aqi: 20 } }];
    expect(parseAqiBatch(payload, CITIES.slice(0, 1))).toEqual([{ slug: 'bandung', aqi: 10 }]);
  });

  it('survives an unexpected payload', () => {
    expect(parseAqiBatch(null, CITIES)).toEqual([]);
    expect(parseAqiBatch('nope', CITIES)).toEqual([]);
  });
});

describe('buildRows', () => {
  it('joins by slug and sorts cleanest first', () => {
    const rows = buildRows(
      [
        { slug: 'medan', aqi: 150 },
        { slug: 'bandung', aqi: 40 },
        { slug: 'jayapura', aqi: 40 },
      ],
      CITIES,
    );
    expect(rows.map((row) => row.city.slug)).toEqual(['bandung', 'jayapura', 'medan']);
    expect(rows[0].aqi).toBe(40);
  });

  it('skips readings without a matching city', () => {
    const rows = buildRows([{ slug: 'atlantis', aqi: 10 }], CITIES);
    expect(rows).toEqual([]);
  });
});

describe('matchesFilter', () => {
  it('uses the AQI category bands', () => {
    expect(matchesFilter(50, 'baik')).toBe(true);
    expect(matchesFilter(51, 'baik')).toBe(false);
    expect(matchesFilter(100, 'sedang')).toBe(true);
    expect(matchesFilter(101, 'tidak')).toBe(true);
    expect(matchesFilter(400, 'semua')).toBe(true);
  });
});

describe('filterRows', () => {
  const rows = buildRows(
    [
      { slug: 'bandung', aqi: 40 },
      { slug: 'medan', aqi: 120 },
      { slug: 'nabire', aqi: 75 },
      { slug: 'jayapura', aqi: 160 },
    ],
    CITIES,
  );

  it('searches city and province names, case-insensitively', () => {
    expect(filterRows(rows, { query: 'papua' }).map((row) => row.city.slug)).toEqual([
      'nabire',
      'jayapura',
    ]);
    expect(filterRows(rows, { query: '  MEDAN ' }).map((row) => row.city.slug)).toEqual(['medan']);
  });

  it('combines search with a category filter', () => {
    expect(
      filterRows(rows, { query: 'papua', filter: 'tidak' }).map((row) => row.city.slug),
    ).toEqual(['jayapura']);
  });

  it('returns every row without a query or filter', () => {
    expect(filterRows(rows)).toHaveLength(4);
  });
});

describe('parseHourlyTrend', () => {
  const hourly = (time: string[], us_aqi: (number | null)[]) => ({ hourly: { time, us_aqi } });

  it('compares the latest sample with the one 24 hours earlier', () => {
    const payload = hourly(
      [
        '2026-10-20T20:00',
        '2026-10-20T21:00',
        '2026-10-20T22:00',
        '2026-10-21T21:00',
        '2026-10-21T22:00',
        '2026-10-21T23:00',
      ],
      [100, 101, 102, 140, 130, 129],
    );
    // 22:30 GMT: newest usable sample is 22:00 (130), yesterday's is 102.
    expect(parseHourlyTrend(payload, 'medan', Date.UTC(2026, 9, 21, 22, 30))).toEqual({
      slug: 'medan',
      delta: 28,
      from: 102,
      to: 130,
      hours: 24,
    });
  });

  it('reads the stamps as GMT and ignores samples from the future', () => {
    const payload = hourly(
      ['2026-10-19T23:00', '2026-10-20T00:00', '2026-10-21T00:00', '2026-10-21T23:00'],
      [10, 20, 40, 50],
    );
    expect(parseHourlyTrend(payload, 'bandung', Date.UTC(2026, 9, 21, 0, 30))).toEqual({
      slug: 'bandung',
      delta: 20,
      from: 20,
      to: 40,
      hours: 24,
    });
  });

  it('returns null when the 24-hour sample is missing', () => {
    const payload = hourly(
      ['2026-10-21T20:00', '2026-10-21T21:00', '2026-10-21T22:00'],
      [180, 181, 182],
    );
    expect(parseHourlyTrend(payload, 'medan', Date.UTC(2026, 9, 21, 22, 30))).toBeNull();
  });

  it('does not turn a gap into "stable air"', () => {
    const payload = hourly(
      ['2026-10-20T22:00', '2026-10-21T21:00', '2026-10-21T22:00'],
      [120, null, null],
    );
    expect(parseHourlyTrend(payload, 'medan', Date.UTC(2026, 9, 21, 22, 30))).toBeNull();
  });

  it('survives an unexpected payload', () => {
    expect(parseHourlyTrend(null, 'medan', Date.now())).toBeNull();
    expect(parseHourlyTrend({ hourly: { time: 'nope' } }, 'medan', Date.now())).toBeNull();
  });
});

describe('describeTrend', () => {
  const trend = (delta: number) => ({ slug: 'x', delta, from: 100, to: 100 + delta, hours: 24 });

  it('names the direction a rising or falling AQI means', () => {
    expect(describeTrend(trend(42))).toBe('naik 42 poin dalam 24 jam');
    expect(describeTrend(trend(-14))).toBe('turun 14 poin dalam 24 jam');
  });

  it('calls an unchanged reading stable, not a 0-point rise', () => {
    expect(describeTrend(trend(0))).toBe('stabil dalam 24 jam');
  });
});

describe('pickExtremes', () => {
  const rows = buildRows(
    [
      { slug: 'bandung', aqi: 40 },
      { slug: 'medan', aqi: 120 },
      { slug: 'nabire', aqi: 75 },
      { slug: 'jayapura', aqi: 161 },
    ],
    CITIES,
  );

  it('lists the cleanest and the most polluted ends', () => {
    const extremes = pickExtremes(rows, 2);
    expect(extremes.best.map((row) => row.city.slug)).toEqual(['bandung', 'nabire']);
    expect(extremes.worst.map((row) => row.city.slug)).toEqual(['jayapura', 'medan']);
    expect(extremes.spread).toBe(121);
  });

  it('never names the same city as both best and worst', () => {
    const extremes = pickExtremes(rows.slice(0, 3), 3);
    expect(extremes.best).toHaveLength(1);
    expect(extremes.worst).toHaveLength(1);
    expect(extremes.best[0].city.slug).toBe('bandung');
    expect(extremes.worst[0].city.slug).toBe('medan');
  });

  it('handles an empty batch', () => {
    expect(pickExtremes([], 3)).toEqual({ best: [], worst: [], spread: 0 });
  });

  it('does not reorder the caller\u2019s rows', () => {
    const input = buildRows(
      [
        { slug: 'medan', aqi: 150 },
        { slug: 'bandung', aqi: 40 },
      ],
      CITIES,
    );
    pickExtremes(input, 1);
    expect(input.map((row) => row.city.slug)).toEqual(['bandung', 'medan']);
  });
});

describe('summarize', () => {
  const rows = buildRows(
    [
      { slug: 'bandung', aqi: 40 },
      { slug: 'medan', aqi: 120 },
      { slug: 'nabire', aqi: 75 },
      { slug: 'jayapura', aqi: 161 },
    ],
    CITIES,
  );

  it('rounds the national average and names both extremes', () => {
    const summary = summarize(rows);
    // (40 + 75 + 120 + 161) / 4 = 99
    expect(summary.average).toBe(99);
    expect(summary.monitored).toBe(4);
    expect(summary.cleanest?.city.slug).toBe('bandung');
    expect(summary.worst?.city.slug).toBe('jayapura');
  });

  it('counts clean and unhealthy cities', () => {
    const summary = summarize(rows);
    expect(summary.clean).toBe(1);
    expect(summary.unhealthy).toBe(2);
  });

  it('handles an empty batch', () => {
    expect(summarize([])).toEqual({
      monitored: 0,
      average: 0,
      cleanest: null,
      worst: null,
      clean: 0,
      unhealthy: 0,
    });
  });
});
