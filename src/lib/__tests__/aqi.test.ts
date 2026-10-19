import {
  AQI_SCALE_MAX,
  categoryFor,
  dayLabel,
  formatWib,
  gaugeProgress,
  pollutantBand,
  readableOn,
  shortDate,
} from '@/lib/aqi';

describe('categoryFor', () => {
  it('maps each boundary to the documented category', () => {
    expect(categoryFor(0).label).toBe('Baik');
    expect(categoryFor(50).label).toBe('Baik');
    expect(categoryFor(51).label).toBe('Sedang');
    expect(categoryFor(100).label).toBe('Sedang');
    expect(categoryFor(101).label).toBe('Tidak Sehat untuk Sensitif');
    expect(categoryFor(151).label).toBe('Tidak Sehat');
    expect(categoryFor(201).label).toBe('Sangat Tidak Sehat');
    expect(categoryFor(301).label).toBe('Berbahaya');
    expect(categoryFor(999).label).toBe('Berbahaya');
  });

  it('clamps NaN and negative values to Baik', () => {
    expect(categoryFor(Number.NaN).label).toBe('Baik');
    expect(categoryFor(-40).label).toBe('Baik');
  });
});

describe('gaugeProgress', () => {
  it('places every category boundary at its designed arc position', () => {
    expect(gaugeProgress(0)).toBeCloseTo(0, 5);
    expect(gaugeProgress(50)).toBeCloseTo(0.3, 5);
    expect(gaugeProgress(100)).toBeCloseTo(0.5, 5);
    expect(gaugeProgress(150)).toBeCloseTo(0.66, 5);
    expect(gaugeProgress(200)).toBeCloseTo(0.78, 5);
    expect(gaugeProgress(300)).toBeCloseTo(0.9, 5);
    expect(gaugeProgress(AQI_SCALE_MAX)).toBeCloseTo(1, 5);
  });

  it('is monotonic and clamps outside the scale', () => {
    let previous = -1;
    for (let value = 0; value <= 500; value += 5) {
      const progress = gaugeProgress(value);
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress).toBeLessThanOrEqual(1);
      previous = progress;
    }
    expect(gaugeProgress(-10)).toBe(0);
    expect(gaugeProgress(900)).toBe(1);
    expect(gaugeProgress(Number.NaN)).toBe(0);
  });
});

describe('readableOn', () => {
  it('returns ink on the pale categories and white on the dark ones', () => {
    expect(readableOn('#f5bb42')).toBe('#153c70');
    expect(readableOn('#4abc78')).toBe('#153c70');
    expect(readableOn('#b3453f')).toBe('#ffffff');
    expect(readableOn('#9b5de5')).toBe('#ffffff');
  });
});

describe('pollutantBand', () => {
  it('moves through the WHO bands and never exceeds a full bar', () => {
    const low = pollutantBand('pm2_5', 5);
    const high = pollutantBand('pm2_5', 400);
    expect(low.color).toBe('#4abc78');
    expect(high.progress).toBe(1);
    expect(low.progress).toBeGreaterThan(0);
    expect(low.progress).toBeLessThan(high.progress);
  });

  it('falls back to a default band for unknown pollutants', () => {
    expect(pollutantBand('unknown', 100).progress).toBeGreaterThan(0);
  });
});

describe('time helpers', () => {
  it('formats an API timestamp as WIB', () => {
    expect(formatWib('2026-10-19T14:05')).toBe('14.05 WIB');
    expect(formatWib('')).toBe('—');
    expect(formatWib(undefined)).toBe('—');
  });

  it('derives Indonesian weekday initials and short dates', () => {
    // 2026-10-18 is a Sunday.
    expect(dayLabel('2026-10-18')).toBe('M');
    expect(shortDate('2026-10-17')).toBe('17 Okt');
    expect(shortDate('not-a-date')).toBe('not-a-date');
  });
});
