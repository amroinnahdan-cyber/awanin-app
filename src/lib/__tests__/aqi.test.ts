import {
  AQI_SCALE_MAX,
  categoryFor,
  dayLabel,
  displayIndexFor,
  formatWib,
  gaugeProgress,
  indexUnit,
  ispuForConcentration,
  ispuFromPollutants,
  pm25Category,
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

describe('ISPU conversion', () => {
  it('matches worked breakpoints from the regulation', () => {
    // PM2.5 15.5 -> 50, 55.4 -> 100: exact tier edges.
    expect(ispuForConcentration('pm2_5', 15.5)).toBe(50);
    expect(ispuForConcentration('pm2_5', 55.4)).toBe(100);
    // PM2.5 30.45 inside [15.5, 55.4] -> 51 + (30.45-15.5)/39.9*49 = 69.
    expect(ispuForConcentration('pm2_5', 30.45)).toBe(69);
    expect(ispuForConcentration('pm2_5', 500)).toBe(500);
  });

  it('rejects unknown pollutants and impossible inputs', () => {
    expect(ispuForConcentration('co', 20)).toBeNull();
    expect(ispuForConcentration('pm2_5', -1)).toBeNull();
    expect(ispuForConcentration('pm2_5', Number.NaN)).toBeNull();
  });

  it('takes the maximum sub-index across pollutants', () => {
    const ispu = ispuFromPollutants([
      { key: 'pm2_5', value: 15 },
      { key: 'pm10', value: 100 },
    ]);
    // PM2.5 15 -> 48; PM10 100 -> 67 (inside [75,150]); the max wins.
    expect(ispu).toBe(67);
  });

  it('returns null when no pollutant is usable', () => {
    expect(ispuFromPollutants([])).toBeNull();
    expect(ispuFromPollutants([{ key: 'no2', value: Number.NaN }])).toBeNull();
  });

  it('labels the chosen unit and maps ISPU bands, not US bands', () => {
    expect(indexUnit('ispu')).toBe('ISPU');
    expect(indexUnit('us')).toBe('AQI');
    // ISPU has no "sensitive" tier: 150 is mid "Tidak Sehat",
    // and its Sedang tier is blue, not yellow.
    expect(categoryFor(150, 'ispu').label).toBe('Tidak Sehat');
    expect(categoryFor(75, 'ispu').color).toBe('#41a4e0');
    expect(categoryFor(999, 'ispu').label).toBe('Berbahaya');
  });

  it('converts a reading, falling back to the API index', () => {
    expect(displayIndexFor(null, 'ispu')).toBeNull();
    expect(displayIndexFor({ aqi: 80, pollutants: [] }, 'us')).toBe(80);
    expect(displayIndexFor({ aqi: 80, pollutants: [{ key: 'pm2_5', value: 15 }] }, 'ispu')).toBe(48);
  });
});

describe('gaugeProgress', () => {
  it('places every US AQI category boundary at its designed arc position', () => {
    expect(gaugeProgress(0)).toBeCloseTo(0, 5);
    expect(gaugeProgress(50)).toBeCloseTo(0.3, 5);
    expect(gaugeProgress(100)).toBeCloseTo(0.5, 5);
    expect(gaugeProgress(150)).toBeCloseTo(0.66, 5);
    expect(gaugeProgress(200)).toBeCloseTo(0.78, 5);
    expect(gaugeProgress(300)).toBeCloseTo(0.9, 5);
    expect(gaugeProgress(AQI_SCALE_MAX)).toBeCloseTo(1, 5);
  });

  it('keeps ISPU boundaries aligned and 101-200 as one band', () => {
    expect(gaugeProgress(0, 'ispu')).toBeCloseTo(0, 5);
    expect(gaugeProgress(50, 'ispu')).toBeCloseTo(0.3, 5);
    expect(gaugeProgress(100, 'ispu')).toBeCloseTo(0.5, 5);
    // The US AQI's interior stop at 150 must not bend the ISPU band:
    // 101-200 interpolates straight from 0.5 to 0.78.
    expect(gaugeProgress(150, 'ispu')).toBeCloseTo(0.64, 5);
    expect(gaugeProgress(200, 'ispu')).toBeCloseTo(0.78, 5);
    expect(gaugeProgress(300, 'ispu')).toBeCloseTo(0.9, 5);
    expect(gaugeProgress(AQI_SCALE_MAX, 'ispu')).toBeCloseTo(1, 5);
  });

  it('is monotonic and clamps outside the scale', () => {
    let previous = -1;
    for (let value = 0; value <= 500; value += 5) {
      const progress = gaugeProgress(value);
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress).toBeLessThanOrEqual(1);
      previous = progress;
    }
    for (let value = 0; value <= 500; value += 10) {
      const progress = gaugeProgress(value, 'ispu');
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
      if (value >= 10) {
        expect(progress).toBeGreaterThanOrEqual(gaugeProgress(value - 10, 'ispu'));
      }
    }
    expect(gaugeProgress(-10)).toBe(0);
    expect(gaugeProgress(900)).toBe(1);
    expect(gaugeProgress(900, 'ispu')).toBe(1);
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

describe('pm25Category', () => {
  it('moves through the WHO bands at each threshold', () => {
    expect(pm25Category(0).short).toBe('Baik');
    expect(pm25Category(14.9).short).toBe('Baik');
    expect(pm25Category(15).short).toBe('Sedang');
    expect(pm25Category(35).short).toBe('Sensitif');
    expect(pm25Category(55).short).toBe('Tidak Sehat');
    expect(pm25Category(150).short).toBe('Sangat TKS');
    // The top band is open-ended: no "Berbahaya" tier on the WHO ladder.
    expect(pm25Category(400).short).toBe('Sangat TKS');
  });

  it('clamps NaN and negative values to Baik', () => {
    expect(pm25Category(Number.NaN).short).toBe('Baik');
    expect(pm25Category(-5).short).toBe('Baik');
  });

  it('keeps the same colours as the pollutant bars, threshold for threshold', () => {
    // pollutantBand colours the PM2.5 bar in Riwayat; the map's colour mode
    // must flip bands at exactly the same values or one screen would disagree
    // with the other about the same reading.
    for (const value of [0, 5, 14.9, 15, 30, 34.9, 35, 54.9, 55, 100, 149.9, 150, 400]) {
      expect(pm25Category(value).color).toBe(pollutantBand('pm2_5', value).color);
    }
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
