import { formatTemperature, relativeTime } from '@/lib/format';

describe('formatTemperature', () => {
  it('formats Celsius and Fahrenheit', () => {
    expect(formatTemperature(31.4, 'C')).toBe('31°C');
    expect(formatTemperature(0, 'C')).toBe('0°C');
    expect(formatTemperature(0, 'F')).toBe('32°F');
    expect(formatTemperature(30, 'F')).toBe('86°F');
  });

  it('returns an em dash for unusable values', () => {
    expect(formatTemperature(Number.NaN, 'C')).toBe('—');
    expect(formatTemperature(Number.POSITIVE_INFINITY, 'F')).toBe('—');
  });
});

describe('relativeTime', () => {
  const now = Date.parse('2026-10-19T10:00:00.000Z');

  it('describes recent, hourly and daily ages', () => {
    expect(relativeTime('2026-10-19T09:59:40.000Z', now)).toBe('baru saja');
    expect(relativeTime('2026-10-19T09:48:00.000Z', now)).toBe('12 menit lalu');
    expect(relativeTime('2026-10-19T08:00:00.000Z', now)).toBe('2 jam lalu');
    expect(relativeTime('2026-10-17T10:00:00.000Z', now)).toBe('2 hari lalu');
  });

  it('never reports a negative age and handles bad input', () => {
    expect(relativeTime('2026-10-19T10:05:00.000Z', now)).toBe('baru saja');
    expect(relativeTime('nonsense', now)).toBe('waktu tidak diketahui');
  });
});
