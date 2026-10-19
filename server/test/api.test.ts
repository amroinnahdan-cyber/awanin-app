import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { pino } from 'pino';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase, type Db } from '../src/db.js';
import type { PushMessage, PushSender } from '../src/push.js';
import { pollOnce } from '../src/scheduler.js';
import type { AirSnapshot, UpstreamClient } from '../src/upstream.js';

const JAKARTA = { latitude: -6.1754, longitude: 106.8272, timezone: 'Asia/Jakarta' };

function snapshot(aqi: number): AirSnapshot {
  return {
    observedAt: '2026-10-19T08:00',
    aqi,
    pm25: 36.7,
    pm10: 39.1,
    temperature: 31,
    humidity: 70,
    wind: 8,
    weatherCode: 3,
    pollutants: [
      { key: 'pm2_5', label: 'PM2.5', value: 36.7, unit: 'μg/m³' },
      { key: 'pm10', label: 'PM10', value: 39.1, unit: 'μg/m³' },
    ],
    hourly: [
      { time: '2026-10-19T09:00', aqi: aqi + 5 },
      { time: '2026-10-20T09:00', aqi: aqi + 10 },
    ],
    forecast: [
      { day: '2026-10-19', avg: aqi + 2, max: aqi + 20, min: aqi },
      { day: '2026-10-20', avg: aqi + 10, max: aqi + 30, min: aqi },
    ],
    fetchedAt: Date.now(),
  };
}

class FakeUpstream implements UpstreamClient {
  aqi = 120;
  fail = false;
  calls = 0;

  async getSnapshot(): Promise<AirSnapshot> {
    this.calls += 1;
    if (this.fail) throw new Error('upstream down');
    return snapshot(this.aqi);
  }

  async getHistory() {
    return [{ day: '2026-10-18', avg: 90, max: 110, min: 70 }];
  }
}

class FakePush implements PushSender {
  messages: PushMessage[] = [];
  result = { ok: 1, failed: 0, errors: [] as string[] };

  async send(messages: PushMessage[]) {
    this.messages.push(...messages);
    return this.result;
  }
}

function makeHarness() {
  const db: Db = openDatabase(':memory:');
  const upstream = new FakeUpstream();
  const push = new FakePush();
  const config = loadConfig({
    DATABASE_PATH: ':memory:',
    CORS_ORIGINS: '*',
    POLL_INTERVAL_MINUTES: '15',
    QUIET_START: '22:00',
    QUIET_END: '06:00',
  } as NodeJS.ProcessEnv);
  const logger = pino({ level: 'silent' });
  const app = createApp({ db, upstream, push, config, logger, enableRateLimit: false });
  return { db, upstream, push, config, logger, app };
}

const DEVICE = {
  deviceId: 'test-device-0001',
  pushToken: 'ExponentPushToken[test-token]',
  platform: 'android' as const,
};

describe('Awanin API', () => {
  let harness = makeHarness();

  beforeEach(() => {
    harness = makeHarness();
  });

  it('reports health', async () => {
    const response = await request(harness.app).get('/health').expect(200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.service, 'awanin-server');
  });

  it('serves the OpenAPI document and a readable reference page', async () => {
    const spec = await request(harness.app).get('/openapi.json').expect(200);
    assert.equal(spec.body.openapi, '3.1.0');
    assert.ok(spec.body.paths['/v1/air']);
    assert.ok(spec.body.paths['/v1/devices'].post);

    const docs = await request(harness.app).get('/docs').expect(200);
    assert.match(docs.headers['content-type'], /text\/html/);
    assert.match(docs.text, /Awanin API/);
    assert.match(docs.text, /\/v1\/air\/\{slug\}\/history/);
  });

  it('lists the five monitored locations', async () => {
    const response = await request(harness.app).get('/v1/locations').expect(200);
    assert.equal(response.body.locations.length, 5);
    assert.equal(response.body.locations[0].slug, 'jakarta-pusat');
  });

  it('returns a reading with forecast for coordinates', async () => {
    const response = await request(harness.app)
      .get('/v1/air')
      .query({ lat: JAKARTA.latitude, lon: JAKARTA.longitude })
      .expect(200);
    assert.equal(response.body.source, 'open-meteo');
    assert.equal(response.body.stale, false);
    assert.equal(response.body.reading.aqi, 120);
    assert.equal(response.body.forecast.length, 2);
    assert.equal(response.body.location.slug, 'jakarta-pusat');
  });

  it('rejects out-of-range coordinates', async () => {
    await request(harness.app).get('/v1/air').query({ lat: 999, lon: 999 }).expect(400);
  });

  it('falls back to a stale snapshot when Open-Meteo fails', async () => {
    const key = `snapshot:${JAKARTA.latitude},${JAKARTA.longitude}`;
    harness.db
      .prepare('INSERT INTO api_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)')
      .run(key, JSON.stringify({ value: snapshot(88), fetchedAt: Date.now() }), Date.now());
    harness.upstream.fail = true;

    const response = await request(harness.app)
      .get('/v1/air')
      .query({ lat: JAKARTA.latitude, lon: JAKARTA.longitude })
      .expect(200);
    assert.equal(response.body.source, 'cache');
    assert.equal(response.body.stale, true);
    assert.equal(response.body.reading.aqi, 88);
  });

  it('serves history for a known slug', async () => {
    const response = await request(harness.app)
      .get('/v1/air/monas/history')
      .query({ days: 7 })
      .expect(200);
    assert.equal(response.body.series[0].avg, 90);
  });

  it('registers a device idempotently', async () => {
    const first = await request(harness.app).post('/v1/devices').send(DEVICE).expect(201);
    assert.equal(first.body.created, true);
    assert.equal(first.body.preferences.locationSlug, 'jakarta-pusat');

    const second = await request(harness.app).post('/v1/devices').send(DEVICE).expect(200);
    assert.equal(second.body.created, false);
  });

  it('rejects a malformed Expo push token', async () => {
    await request(harness.app)
      .post('/v1/devices')
      .send({ deviceId: 'test-device-0002', pushToken: 'not-a-token' })
      .expect(400);
  });

  it('patches device preferences', async () => {
    await request(harness.app).post('/v1/devices').send(DEVICE).expect(201);
    const response = await request(harness.app)
      .patch(`/v1/devices/${DEVICE.deviceId}`)
      .send({ preferences: { locationSlug: 'monas', threshold: 50, alertsEnabled: false } })
      .expect(200);
    assert.equal(response.body.preferences.locationSlug, 'monas');
    assert.equal(response.body.preferences.threshold, 50);
    assert.equal(response.body.preferences.alertsEnabled, false);
  });

  it('sends a test push and records it', async () => {
    await request(harness.app).post('/v1/devices').send(DEVICE).expect(201);
    const response = await request(harness.app)
      .post(`/v1/devices/${DEVICE.deviceId}/test`)
      .send({})
      .expect(202);
    assert.equal(response.body.accepted, 1);
    assert.equal(harness.push.messages.length, 1);
    assert.match(harness.push.messages[0].title, /uji/i);

    const history = await request(harness.app)
      .get(`/v1/devices/${DEVICE.deviceId}/notifications`)
      .expect(200);
    assert.equal(history.body.notifications.length, 1);
    assert.equal(history.body.notifications[0].status, 'sent');
  });

  it('deletes a device', async () => {
    await request(harness.app).post('/v1/devices').send(DEVICE).expect(201);
    await request(harness.app).delete(`/v1/devices/${DEVICE.deviceId}`).expect(204);
    await request(harness.app).get(`/v1/devices/${DEVICE.deviceId}`).expect(404);
  });

  it('sends one alert per category change, not one per poll', async () => {
    await request(harness.app).post('/v1/devices').send(DEVICE).expect(201);
    await request(harness.app)
      .patch(`/v1/devices/${DEVICE.deviceId}`)
      .send({ preferences: { threshold: 100, quietStart: null, quietEnd: null } })
      .expect(200);

    harness.upstream.aqi = 160;
    const first = await pollOnce({
      db: harness.db,
      upstream: harness.upstream,
      push: harness.push,
      config: harness.config,
      logger: harness.logger,
    });
    assert.equal(first.alertsSent, 1);
    assert.equal(harness.push.messages.length, 1);

    const second = await pollOnce({
      db: harness.db,
      upstream: harness.upstream,
      push: harness.push,
      config: harness.config,
      logger: harness.logger,
    });
    assert.equal(second.alertsSent, 0);
    assert.equal(harness.push.messages.length, 1);
  });

  it('respects the device threshold', async () => {
    await request(harness.app).post('/v1/devices').send(DEVICE).expect(201);
    await request(harness.app)
      .patch(`/v1/devices/${DEVICE.deviceId}`)
      .send({ preferences: { threshold: 300, quietStart: null, quietEnd: null } })
      .expect(200);

    harness.upstream.aqi = 160;
    const report = await pollOnce({
      db: harness.db,
      upstream: harness.upstream,
      push: harness.push,
      config: harness.config,
      logger: harness.logger,
    });
    assert.equal(report.alertsSent, 0);
    assert.equal(harness.push.messages.length, 0);
  });
});
