import type { HourlyForecastPoint } from '@/api/openMeteo';
import {
  bestExerciseWindow,
  exerciseAdvice,
  isFlatDay,
  remainingHoursToday,
} from '@/lib/bestTime';

const point = (time: string, aqi: number): HourlyForecastPoint => ({ time, aqi });

describe('remainingHoursToday', () => {
  const hourly = [
    point('2026-10-21T08:00', 120),
    point('2026-10-21T17:00', 140),
    point('2026-10-21T18:00', 144),
    point('2026-10-21T19:00', 138),
    point('2026-10-22T07:00', 90),
  ];

  it('keeps only later hours of the same day', () => {
    expect(remainingHoursToday(hourly, '2026-10-21T17:00')).toEqual([
      { hour: 18, aqi: 144 },
      { hour: 19, aqi: 138 },
    ]);
  });

  it('stops at today, never borrowing tomorrow', () => {
    const hours = remainingHoursToday(hourly, '2026-10-21T18:00');
    expect(hours.every((entry) => entry.hour >= 19)).toBe(true);
    expect(hours.some((entry) => entry.aqi === 90)).toBe(false);
  });

  it('drops duplicate and non-finite samples', () => {
    const messy = [
      point('2026-10-21T18:00', 140),
      point('2026-10-21T18:00', 138),
      point('2026-10-21T19:00', Number.NaN),
    ];
    expect(remainingHoursToday(messy, '2026-10-21T17:00')).toEqual([{ hour: 18, aqi: 138 }]);
  });

  it('returns nothing when the timestamp is unusable', () => {
    expect(remainingHoursToday(hourly, '')).toEqual([]);
    expect(remainingHoursToday(hourly, 'baru saja')).toEqual([]);
    expect(remainingHoursToday(undefined, '2026-10-21T17:00')).toEqual([]);
  });
});

describe('bestExerciseWindow', () => {
  const hours = [
    { hour: 18, aqi: 144 },
    { hour: 19, aqi: 138 },
    { hour: 20, aqi: 133 },
    { hour: 21, aqi: 133 },
    { hour: 22, aqi: 150 },
  ];

  it('picks the two consecutive hours with the lowest average', () => {
    const window = bestExerciseWindow(hours);
    expect(window).toMatchObject({ startHour: 20, endHour: 22, avgAqi: 133, hours: 2 });
  });

  it('prefers the earliest window when averages tie', () => {
    const window = bestExerciseWindow(hours);
    expect(window?.startHour).toBe(20);
  });

  it('ignores windows that jump over a missing hour', () => {
    const gapped = [
      { hour: 18, aqi: 60 },
      { hour: 20, aqi: 62 },
      { hour: 21, aqi: 62 },
    ];
    expect(bestExerciseWindow(gapped)).toMatchObject({ startHour: 20, endHour: 22 });
    expect(bestExerciseWindow(gapped, 2)?.avgAqi).toBe(62);
  });

  it('falls back to a single hour when only one is left', () => {
    expect(bestExerciseWindow([{ hour: 23, aqi: 120 }])).toMatchObject({
      startHour: 23,
      endHour: 24,
      avgAqi: 120,
      hours: 1,
    });
  });

  it('returns null without hours', () => {
    expect(bestExerciseWindow([])).toBeNull();
  });

  it('never reports an end hour beyond midnight', () => {
    const window = bestExerciseWindow([
      { hour: 22, aqi: 90 },
      { hour: 23, aqi: 95 },
    ]);
    expect(window?.endHour).toBe(24);
  });
});

describe('isFlatDay', () => {
  it('is true when the remaining hours barely differ', () => {
    expect(
      isFlatDay([
        { hour: 20, aqi: 133 },
        { hour: 21, aqi: 135 },
        { hour: 22, aqi: 133 },
      ]),
    ).toBe(true);
  });

  it('is false when there is a real difference', () => {
    expect(
      isFlatDay([
        { hour: 18, aqi: 144 },
        { hour: 20, aqi: 133 },
      ]),
    ).toBe(false);
  });

  it('needs at least two hours', () => {
    expect(isFlatDay([{ hour: 23, aqi: 120 }])).toBe(false);
  });
});

describe('exerciseAdvice', () => {
  it('matches the AQI band of the window', () => {
    expect(exerciseAdvice(35)).toContain('tepat untuk olahraga');
    expect(exerciseAdvice(90)).toContain('Masih aman');
    expect(exerciseAdvice(133)).toContain('Kelompok sensitif');
    expect(exerciseAdvice(180)).toContain('di dalam ruangan');
  });

  it('is empty for non-finite input', () => {
    expect(exerciseAdvice(Number.NaN)).toBe('');
  });
});
