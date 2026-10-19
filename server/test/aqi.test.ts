import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { categoryFor, isQuietHours, tipFor, zonedTime } from '../src/aqi.js';
import { buildForecast, groupHourlyByDay } from '../src/upstream.js';

describe('categoryFor', () => {
  it('maps every US AQI boundary to the documented category', () => {
    assert.equal(categoryFor(0).label, 'Baik');
    assert.equal(categoryFor(50).label, 'Baik');
    assert.equal(categoryFor(51).label, 'Sedang');
    assert.equal(categoryFor(100).label, 'Sedang');
    assert.equal(categoryFor(101).label, 'Tidak Sehat untuk Sensitif');
    assert.equal(categoryFor(151).label, 'Tidak Sehat');
    assert.equal(categoryFor(201).label, 'Sangat Tidak Sehat');
    assert.equal(categoryFor(301).label, 'Berbahaya');
    assert.equal(categoryFor(900).label, 'Berbahaya');
  });

  it('clamps invalid numbers to the first category', () => {
    assert.equal(categoryFor(Number.NaN).label, 'Baik');
    assert.equal(categoryFor(-20).label, 'Baik');
  });
});

describe('tipFor', () => {
  it('picks a tip that grows more cautious with the reading', () => {
    assert.match(tipFor(20), /masker N95/);
    assert.match(tipFor(250), /kurangi aktivitas/);
    assert.match(tipFor(350), /penyaring udara/);
  });
});

describe('zonedTime', () => {
  it('returns wall-clock parts in Asia/Jakarta', () => {
    const parts = zonedTime(new Date('2026-10-19T01:30:00.000Z'), 'Asia/Jakarta');
    assert.equal(parts.date, '2026-10-19');
    assert.equal(parts.hour, 8);
    assert.equal(parts.minutes, 8 * 60 + 30);
  });
});

describe('isQuietHours', () => {
  it('handles a window that crosses midnight', () => {
    assert.equal(isQuietHours(23 * 60, '22:00', '06:00'), true);
    assert.equal(isQuietHours(5 * 60, '22:00', '06:00'), true);
    assert.equal(isQuietHours(12 * 60, '22:00', '06:00'), false);
  });

  it('handles a same-day window and missing config', () => {
    assert.equal(isQuietHours(9 * 60, '08:00', '17:00'), true);
    assert.equal(isQuietHours(19 * 60, '08:00', '17:00'), false);
    assert.equal(isQuietHours(23 * 60, null, null), false);
  });
});

describe('groupHourlyByDay', () => {
  it('aggregates mean, max and min per day and skips gaps', () => {
    const times = [
      '2026-10-17T00:00',
      '2026-10-17T01:00',
      '2026-10-17T02:00',
      '2026-10-18T00:00',
      null,
    ];
    const values = [40, 60, 80, 100, 999];
    const days = groupHourlyByDay(times, values);
    assert.deepEqual(days, [
      { day: '2026-10-17', avg: 60, max: 80, min: 40 },
      { day: '2026-10-18', avg: 100, max: 100, min: 100 },
    ]);
  });

  it('drops null samples so empty forecast days do not become AQI 0', () => {
    const days = groupHourlyByDay(
      ['2026-10-17T00:00', '2026-10-17T01:00', '2026-10-18T00:00'],
      [40, null, null],
    );
    assert.deepEqual(days, [{ day: '2026-10-17', avg: 40, max: 40, min: 40 }]);
  });
});

describe('buildForecast', () => {
  it('keeps today and future days, capped at seven', () => {
    const hourly = Array.from({ length: 24 * 9 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 9, 15, index));
      return {
        time: date.toISOString().slice(0, 13),
        aqi: 50 + (index % 5),
      };
    });
    const forecast = buildForecast(hourly, new Date('2026-10-18T00:00:00.000Z'));
    assert.ok(forecast.length > 0);
    assert.ok(forecast.length <= 7);
    assert.ok(forecast.every((day) => day.day >= '2026-10-18'));
  });
});
