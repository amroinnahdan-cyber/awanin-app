import { formatCoordinates, formatDistance, distanceKm, timezoneForCoordinates } from '@/lib/geo';

const MONAS = { lat: -6.179, lon: 106.8271 };
const BUNDARAN_HI = { lat: -6.1949, lon: 106.823 };

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(MONAS.lat, MONAS.lon, MONAS.lat, MONAS.lon)).toBe(0);
  });

  it('measures Monas → Bundaran HI at roughly 1.8 km', () => {
    const km = distanceKm(MONAS.lat, MONAS.lon, BUNDARAN_HI.lat, BUNDARAN_HI.lon);
    expect(km).toBeGreaterThan(1.7);
    expect(km).toBeLessThan(1.9);
  });

  it('is symmetric', () => {
    const forward = distanceKm(MONAS.lat, MONAS.lon, BUNDARAN_HI.lat, BUNDARAN_HI.lon);
    const back = distanceKm(BUNDARAN_HI.lat, BUNDARAN_HI.lon, MONAS.lat, MONAS.lon);
    expect(back).toBeCloseTo(forward, 9);
  });

  it('puts Jakarta → Bandung near 120 km', () => {
    const km = distanceKm(-6.1754, 106.8272, -6.9175, 107.6191);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(130);
  });
});

describe('formatDistance', () => {
  it('rounds metres to the nearest 10 m', () => {
    expect(formatDistance(0.42)).toBe('420 m');
    expect(formatDistance(0.9876)).toBe('990 m');
  });

  it('never claims more precision than the fix has', () => {
    expect(formatDistance(0)).toBe('< 10 m');
    expect(formatDistance(0.002)).toBe('< 10 m');
  });

  it('uses a comma decimal up to 10 km, then whole kilometres', () => {
    expect(formatDistance(2.44)).toBe('2,4 km');
    expect(formatDistance(9.96)).toBe('10,0 km');
    expect(formatDistance(12.6)).toBe('13 km');
  });

  it('returns a dash for unusable input', () => {
    expect(formatDistance(Number.NaN)).toBe('—');
    expect(formatDistance(-1)).toBe('—');
  });
});

describe('timezoneForCoordinates', () => {
  it('gives each Indonesian zone the right IANA name', () => {
    expect(timezoneForCoordinates(-6.1754, 106.8272)).toBe('Asia/Jakarta');
    expect(timezoneForCoordinates(-5.1486, 119.4319)).toBe('Asia/Makassar');
    expect(timezoneForCoordinates(-2.5337, 140.7181)).toBe('Asia/Jayapura');
  });

  it('does not split zones by longitude alone', () => {
    // Surabaya sits east of 112.5°E but is firmly WIB, so a meridian cut would
    // be an hour out for Indonesia's second city.
    expect(timezoneForCoordinates(-7.2492, 112.7508)).toBe('Asia/Jakarta');
    expect(timezoneForCoordinates(-8.65, 115.2167)).toBe('Asia/Makassar');
  });

  it('keeps Pontianak on its own zone rather than lumping it into WIB', () => {
    expect(timezoneForCoordinates(-0.0319, 109.325)).toBe('Asia/Pontianak');
  });

  it('answers for a nearby point without a city of its own', () => {
    // Cimahi is 10 km from Bandung.
    expect(timezoneForCoordinates(-6.8722, 107.5425)).toBe('Asia/Jakarta');
  });

  it('prefers the device zone when no Indonesian city is close', () => {
    expect(timezoneForCoordinates(51.5072, -0.1276, 'Europe/London')).toBe('Europe/London');
    expect(timezoneForCoordinates(0, 0, null)).toBe('Asia/Jakarta');
  });

  it('never uses the fallback when a city is within reach', () => {
    expect(timezoneForCoordinates(-2.5337, 140.7181, 'Europe/London')).toBe('Asia/Jayapura');
  });

  it('falls back on unusable coordinates instead of throwing', () => {
    expect(timezoneForCoordinates(Number.NaN, 106.8, 'Asia/Makassar')).toBe('Asia/Makassar');
    expect(timezoneForCoordinates(-6.17, Number.POSITIVE_INFINITY, null)).toBe('Asia/Jakarta');
  });
});

describe('formatCoordinates', () => {
  it('uses hemispheres instead of signs', () => {
    expect(formatCoordinates(-6.1754, 106.8272)).toBe('6,175° LS · 106,827° BT');
    expect(formatCoordinates(51.5072, -0.1276)).toBe('51,507° LU · 0,128° BB');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatCoordinates(Number.NaN, 106.8)).toBe('—');
    expect(formatCoordinates(-6.17, Number.POSITIVE_INFINITY)).toBe('—');
  });
});
