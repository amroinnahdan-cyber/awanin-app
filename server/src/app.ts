import compression from 'compression';
import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError, z } from 'zod';
import type { Logger } from 'pino';

import { categoryFor } from './aqi.js';
import type { Config } from './config.js';
import { readingBucket, type Db } from './db.js';
import { LOCATIONS, findLocation, resolveLocation } from './locations.js';
import { openApiDocument, renderDocsHtml } from './openapi.js';
import { isValidExpoPushToken, type PushSender } from './push.js';
import {
  deleteDevice,
  getDevice,
  getPreferences,
  getTrend,
  insertNotification,
  latestReading,
  listNotifications,
  recordReading,
  serializeNotificationList,
  updateDevice,
  updatePreferences,
  upsertDevice,
  type DeviceRow,
  type PreferenceRow,
} from './store.js';
import {
  ATTRIBUTION,
  readCachedSnapshot,
  type AirSnapshot,
  type UpstreamClient,
} from './upstream.js';

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };
}

function serializeDevice(device: DeviceRow) {
  return {
    id: device.id,
    deviceId: device.device_id,
    pushToken: device.push_token,
    platform: device.platform,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
  };
}

export function serializePreferences(row: PreferenceRow) {
  return {
    locationSlug: row.location_slug,
    latitude: row.latitude,
    longitude: row.longitude,
    alertsEnabled: Boolean(row.alerts_enabled),
    dailySummary: Boolean(row.daily_summary),
    tipsEnabled: Boolean(row.tips_enabled),
    threshold: row.threshold,
    quietStart: row.quiet_start,
    quietEnd: row.quiet_end,
  };
}

function readingPayload(snapshot: AirSnapshot) {
  return {
    observedAt: snapshot.observedAt,
    aqi: snapshot.aqi,
    pm25: snapshot.pm25,
    pm10: snapshot.pm10,
    temperature: snapshot.temperature,
    humidity: snapshot.humidity,
    wind: snapshot.wind,
    weatherCode: snapshot.weatherCode,
    pollutants: snapshot.pollutants,
  };
}

const deviceCreateSchema = z.object({
  deviceId: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9:_-]+$/, 'deviceId hanya boleh berisi huruf, angka, :, _ atau -'),
  pushToken: z.string().min(10).max(256).nullable().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

const preferencePatchSchema = z.object({
  locationSlug: z.string().min(1).max(64).optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  alertsEnabled: z.boolean().optional(),
  dailySummary: z.boolean().optional(),
  tipsEnabled: z.boolean().optional(),
  threshold: z.number().int().min(0).max(500).optional(),
  quietStart: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/)
    .nullable()
    .optional(),
  quietEnd: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/)
    .nullable()
    .optional(),
});

const devicePatchSchema = z.object({
  pushToken: z.string().min(10).max(256).nullable().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
  preferences: preferencePatchSchema.optional(),
});

export type AppDeps = {
  db: Db;
  upstream: UpstreamClient;
  push: PushSender;
  config: Config;
  logger: Logger;
  enableRateLimit?: boolean;
};

export function createApp({
  db,
  upstream,
  push,
  config,
  logger,
  enableRateLimit = true,
}: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 86_400,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      if (req.url === '/health') return;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level](
        { method: req.method, url: req.url, status: res.statusCode, ms: Date.now() - startedAt },
        'request',
      );
    });
    next();
  });

  if (enableRateLimit) {
    app.use(
      '/v1',
      rateLimit({
        windowMs: 60_000,
        limit: 180,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Terlalu banyak permintaan, coba lagi sebentar.' },
      }),
    );
  }

  app.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({
      ok: true,
      service: 'awanin-server',
      version: config.version,
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    });
  });

  app.get('/openapi.json', (_req, res) => {
    res.set('cache-control', 'public, max-age=3600');
    res.json(openApiDocument);
  });

  app.get('/docs', (_req, res) => {
    res.set('cache-control', 'public, max-age=3600');
    res.type('html').send(renderDocsHtml(openApiDocument));
  });

  app.get('/v1/locations', (_req, res) => {
    res.json({
      attribution: ATTRIBUTION,
      locations: LOCATIONS.map((location) => {
        const reading = latestReading(db, location.slug);
        return {
          ...location,
          aqi: reading?.aqi ?? null,
          updatedAt: reading?.capturedAt ?? null,
        };
      }),
    });
  });

  async function respondWithAir(
    res: Response,
    location: ReturnType<typeof resolveLocation>,
  ): Promise<void> {
    try {
      const snapshot = await upstream.getSnapshot(
        location.latitude,
        location.longitude,
        location.timezone,
      );
      recordReading(db, location.slug, snapshot, readingBucket());
      res.json({
        location,
        source: 'open-meteo',
        stale: false,
        fetchedAt: snapshot.fetchedAt,
        reading: readingPayload(snapshot),
        hourly: snapshot.hourly,
        forecast: snapshot.forecast,
        attribution: ATTRIBUTION,
      });
    } catch (error) {
      logger.warn({ error, slug: location.slug }, 'Upstream failed, trying cached snapshot');
      const cached = readCachedSnapshot(db, location.latitude, location.longitude);
      if (!cached) {
        throw new HttpError(
          503,
          'Data kualitas udara belum bisa dimuat dan belum ada salinan tersimpan.',
          'upstream_unavailable',
        );
      }
      res.json({
        location,
        source: 'cache',
        stale: true,
        cachedAt: new Date(cached.fetchedAt).toISOString(),
        fetchedAt: cached.fetchedAt,
        reading: readingPayload(cached),
        hourly: cached.hourly,
        forecast: cached.forecast,
        attribution: ATTRIBUTION,
      });
    }
  }

  app.get(
    '/v1/air',
    asyncHandler(async (req, res) => {
      const latitude = req.query.lat === undefined ? undefined : Number(req.query.lat);
      const longitude = req.query.lon === undefined ? undefined : Number(req.query.lon);
      const slug = typeof req.query.slug === 'string' ? req.query.slug : undefined;

      if (slug && !findLocation(slug)) {
        throw new HttpError(404, `Lokasi "${slug}" tidak dikenal`, 'unknown_location');
      }
      if (
        (latitude !== undefined && !Number.isFinite(latitude)) ||
        (longitude !== undefined && !Number.isFinite(longitude))
      ) {
        throw new HttpError(400, 'Koordinat tidak valid', 'invalid_coordinates');
      }
      if (
        (latitude !== undefined && (latitude < -90 || latitude > 90)) ||
        (longitude !== undefined && (longitude < -180 || longitude > 180))
      ) {
        throw new HttpError(400, 'Koordinat di luar jangkauan', 'invalid_coordinates');
      }

      const location = resolveLocation({ slug, latitude, longitude });
      await respondWithAir(res, location);
    }),
  );

  app.get(
    '/v1/air/:slug',
    asyncHandler(async (req, res) => {
      const location = findLocation(req.params.slug);
      if (!location) {
        throw new HttpError(404, `Lokasi "${req.params.slug}" tidak dikenal`, 'unknown_location');
      }
      await respondWithAir(res, location);
    }),
  );

  app.get(
    '/v1/air/:slug/history',
    asyncHandler(async (req, res) => {
      const location = findLocation(req.params.slug);
      if (!location) {
        throw new HttpError(404, `Lokasi "${req.params.slug}" tidak dikenal`, 'unknown_location');
      }
      const days = Math.min(Math.max(Number(req.query.days ?? 7), 1), 92);
      const series = await upstream.getHistory(
        location.latitude,
        location.longitude,
        location.timezone,
        Math.round(days),
      );
      res.json({ location, days: Math.round(days), series, attribution: ATTRIBUTION });
    }),
  );

  app.get('/v1/air/:slug/trend', (req, res) => {
    const slug = req.params.slug;
    const hours = Math.min(Math.max(Number(req.query.hours ?? 24), 1), 168);
    res.json({ slug, hours: Math.round(hours), points: getTrend(db, slug, hours) });
  });

  app.post(
    '/v1/devices',
    asyncHandler(async (req, res) => {
      const body = deviceCreateSchema.parse(req.body);
      if (body.pushToken && !isValidExpoPushToken(body.pushToken)) {
        throw new HttpError(400, 'Token push Expo tidak valid', 'invalid_push_token');
      }
      const { device, preferences, created } = upsertDevice(db, body);
      res.status(created ? 201 : 200).json({
        created,
        device: serializeDevice(device),
        preferences: serializePreferences(preferences),
      });
    }),
  );

  app.get('/v1/devices/:deviceId', (req, res) => {
    const device = getDevice(db, req.params.deviceId);
    if (!device) throw new HttpError(404, 'Perangkat tidak terdaftar', 'unknown_device');
    const preferences = getPreferences(db, device.id);
    if (!preferences) throw new HttpError(500, 'Preferensi perangkat hilang');
    res.json({
      device: serializeDevice(device),
      preferences: serializePreferences(preferences),
      notifications: serializeNotificationList(listNotifications(db, device.id, 10)),
    });
  });

  app.patch(
    '/v1/devices/:deviceId',
    asyncHandler(async (req, res) => {
      const device = getDevice(db, req.params.deviceId);
      if (!device) throw new HttpError(404, 'Perangkat tidak terdaftar', 'unknown_device');
      const body = devicePatchSchema.parse(req.body);
      if (body.pushToken && !isValidExpoPushToken(body.pushToken)) {
        throw new HttpError(400, 'Token push Expo tidak valid', 'invalid_push_token');
      }

      if (body.pushToken !== undefined || body.platform !== undefined) {
        updateDevice(db, device.id, body);
      }
      if (body.preferences) {
        updatePreferences(db, device.id, body.preferences);
      }

      const nextDevice = getDevice(db, req.params.deviceId) as DeviceRow;
      const nextPreferences = getPreferences(db, device.id) as PreferenceRow;
      res.json({
        device: serializeDevice(nextDevice),
        preferences: serializePreferences(nextPreferences),
      });
    }),
  );

  app.delete('/v1/devices/:deviceId', (req, res) => {
    const removed = deleteDevice(db, req.params.deviceId);
    if (!removed) throw new HttpError(404, 'Perangkat tidak terdaftar', 'unknown_device');
    res.status(204).end();
  });

  app.get('/v1/devices/:deviceId/notifications', (req, res) => {
    const device = getDevice(db, req.params.deviceId);
    if (!device) throw new HttpError(404, 'Perangkat tidak terdaftar', 'unknown_device');
    const limit = Number(req.query.limit ?? 20);
    res.json({
      notifications: serializeNotificationList(
        listNotifications(db, device.id, Number.isFinite(limit) ? limit : 20),
      ),
    });
  });

  app.post(
    '/v1/devices/:deviceId/test',
    asyncHandler(async (req, res) => {
      const device = getDevice(db, req.params.deviceId);
      if (!device) throw new HttpError(404, 'Perangkat tidak terdaftar', 'unknown_device');
      if (!device.push_token) {
        throw new HttpError(
          400,
          'Perangkat belum punya token push. Jalankan aplikasi di development build dan aktifkan notifikasi.',
          'missing_push_token',
        );
      }
      if (!isValidExpoPushToken(device.push_token)) {
        throw new HttpError(400, 'Token push Expo tidak valid', 'invalid_push_token');
      }

      const preferences = getPreferences(db, device.id) as PreferenceRow;
      const location = resolveLocation({
        slug: preferences.location_slug,
        latitude: preferences.latitude,
        longitude: preferences.longitude,
      });
      const snapshot = await upstream
        .getSnapshot(location.latitude, location.longitude, location.timezone)
        .catch(() => null);
      const aqi = snapshot?.aqi ?? 0;
      const category = categoryFor(aqi);
      const title = 'Notifikasi uji Awanin';
      const body = snapshot
        ? `Backend terhubung. ${location.name} saat ini AQI ${aqi} (${category.label}).`
        : `Backend terhubung. Data ${location.name} sedang tidak tersedia.`;

      const result = await push.send([
        {
          to: device.push_token,
          title,
          body,
          sound: 'default',
          channelId: 'air-quality',
          data: { type: 'test', slug: location.slug, aqi },
        },
      ]);
      insertNotification(db, {
        deviceRowId: device.id,
        locationSlug: location.slug,
        aqi,
        category: category.label,
        title,
        body,
        status: result.ok > 0 ? 'sent' : 'failed',
        expoTicket: result.errors[0] ?? null,
      });

      res.status(202).json({
        accepted: result.ok,
        failed: result.failed,
        errors: result.errors,
      });
    }),
  );

  app.use('/v1', (_req, res) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan', code: 'not_found' });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validasi gagal',
        code: 'validation_error',
        details: error.flatten().fieldErrors,
      });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    logger.error({ error }, 'Unhandled request error');
    res.status(500).json({ error: 'Terjadi kesalahan pada server', code: 'internal_error' });
  });

  return app;
}
