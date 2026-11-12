import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CITY_LOCATIONS } from '../src/cities.js';
import { LOCATIONS, findLocation, resolveLocation } from '../src/locations.js';

/** The Expo app owns the city list; the server mirror must never drift from it. */
const APP_CITIES = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/data/indonesiaCities.ts',
);

describe('location resolution', () => {
  it('stays in sync with the app city table', () => {
    const source = readFileSync(APP_CITIES, 'utf8');
    const rows = [
      ...source.matchAll(
        /\{ slug: '([^']+)', name: '([^']+)', province: '([^']+)', latitude: (-?[\d.]+), longitude: (-?[\d.]+), timezone: '([^']+)' \}/g,
      ),
    ].map(([, slug, name, area, latitude, longitude, timezone]) => ({
      slug,
      name,
      area,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone,
    }));
    assert.equal(rows.length, 100);
    assert.deepEqual(rows, CITY_LOCATIONS);
  });
  it('mirrors the app city table without reusing a landmark slug', () => {
    assert.equal(CITY_LOCATIONS.length, 100);
    const landmarkSlugs = new Set(LOCATIONS.map((entry) => entry.slug));
    for (const city of CITY_LOCATIONS) {
      assert.equal(landmarkSlugs.has(city.slug), false, `${city.slug} duplicates a landmark`);
    }
    const slugs = new Set(CITY_LOCATIONS.map((entry) => entry.slug));
    assert.equal(slugs.size, CITY_LOCATIONS.length);
  });

  it('names a chosen city instead of "Lokasi saya"', () => {
    const bandung = resolveLocation({
      slug: 'bandung',
      latitude: -6.9222,
      longitude: 107.6069,
    });
    assert.equal(bandung.name, 'Bandung');
    assert.equal(bandung.area, 'Jawa Barat');
    assert.equal(bandung.timezone, 'Asia/Jakarta');
  });

  it('names a GPS fix by its nearest city', () => {
    // The app sends `lokasi-saya` for the device position, which is not a
    // catalogue slug: the coordinates have to answer for the name.
    const makassar = resolveLocation({
      slug: 'lokasi-saya',
      latitude: -5.1486,
      longitude: 119.4319,
    });
    assert.equal(makassar.name, 'Makassar');
    assert.equal(makassar.timezone, 'Asia/Makassar');
  });

  it('keeps a fix inside Jakarta on the showcase point', () => {
    const jakarta = resolveLocation({
      slug: 'lokasi-saya',
      latitude: -6.1754,
      longitude: 106.8272,
    });
    assert.equal(jakarta.slug, 'jakarta-pusat');
  });

  it('falls back to "Lokasi saya" only far from every known place', () => {
    const remote = resolveLocation({ latitude: -30, longitude: 100 });
    assert.equal(remote.name, 'Lokasi saya');
    assert.match(remote.slug, /^custom:/);
    assert.equal(remote.timezone, 'Asia/Jakarta');
  });

  it('looks cities up by slug, so history and slug routes accept them', () => {
    assert.equal(findLocation('surabaya')?.name, 'Surabaya');
    assert.equal(findLocation('jayapura')?.timezone, 'Asia/Jayapura');
    assert.equal(findLocation('nowhere'), null);
  });
});
