import type { Logger } from 'pino';

import { categoryFor, isQuietHours, tipFor, zonedTime } from './aqi.js';
import type { Config } from './config.js';
import { readingBucket, type Db } from './db.js';
import { LOCATIONS, resolveLocation } from './locations.js';
import type { PushMessage, PushSender } from './push.js';
import {
  insertNotification,
  listSubscriptions,
  recordReading,
  updatePreferences,
  type PreferenceRow,
} from './store.js';
import type { AirSnapshot, UpstreamClient } from './upstream.js';

export type SchedulerDeps = {
  db: Db;
  upstream: UpstreamClient;
  push: PushSender;
  config: Config;
  logger: Pick<Logger, 'info' | 'warn' | 'error'>;
};

export type PollReport = {
  locations: number;
  readings: number;
  alertsSent: number;
  summariesSent: number;
  failures: number;
};

type LocationKey = { slug: string; latitude: number; longitude: number; timezone: string };

function isCooldownActive(lastSentAt: string | null, cooldownMinutes: number, now: Date): boolean {
  if (!lastSentAt) return false;
  const last = Date.parse(lastSentAt);
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last < cooldownMinutes * 60_000;
}

function collectPoints(subscriptions: { preferences: PreferenceRow }[]): LocationKey[] {
  const points = new Map<string, LocationKey>();
  // Always poll the five catalogue points so `/v1/locations` and the trend
  // endpoint have history even before anyone subscribes.
  for (const location of LOCATIONS) {
    points.set(location.slug, {
      slug: location.slug,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });
  }
  for (const { preferences } of subscriptions) {
    const resolved = resolveLocation({
      slug: preferences.location_slug,
      latitude: preferences.latitude,
      longitude: preferences.longitude,
    });
    points.set(resolved.slug, {
      slug: resolved.slug,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      timezone: resolved.timezone,
    });
  }
  return [...points.values()];
}

/**
 * One polling pass: refresh every subscribed point, persist the reading, then
 * evaluate alerts. Runs from cron in production and directly in the tests.
 */
export async function pollOnce(deps: SchedulerDeps, now = new Date()): Promise<PollReport> {
  const { db, upstream, push, config, logger } = deps;
  const report: PollReport = {
    locations: 0,
    readings: 0,
    alertsSent: 0,
    summariesSent: 0,
    failures: 0,
  };

  const subscriptions = listSubscriptions(db);
  const points = collectPoints(subscriptions);
  const snapshots = new Map<string, AirSnapshot>();

  for (const point of points) {
    report.locations += 1;
    try {
      const snapshot = await upstream.getSnapshot(
        point.latitude,
        point.longitude,
        point.timezone,
      );
      snapshots.set(point.slug, snapshot);
      recordReading(db, point.slug, snapshot, readingBucket(now));
      report.readings += 1;
    } catch (error) {
      report.failures += 1;
      logger.warn({ error, slug: point.slug }, 'Upstream read failed during poll');
    }
  }

  const zoned = zonedTime(now, config.timeZone);

  for (const { device, preferences } of subscriptions) {
    const resolved = resolveLocation({
      slug: preferences.location_slug,
      latitude: preferences.latitude,
      longitude: preferences.longitude,
    });
    const snapshot = snapshots.get(resolved.slug);
    if (!snapshot) continue;

    const category = categoryFor(snapshot.aqi);
    const tip = preferences.tips_enabled ? ` ${tipFor(snapshot.aqi)}` : '';
    const quietStart = preferences.quiet_start ?? config.quietStart;
    const quietEnd = preferences.quiet_end ?? config.quietEnd;
    const quiet = isQuietHours(zoned.minutes, quietStart, quietEnd);

    const categoryChanged = preferences.last_category !== category.label;
    const thresholdMet = snapshot.aqi >= preferences.threshold;
    const cooldownActive = isCooldownActive(
      preferences.last_sent_at,
      config.cooldownMinutes,
      now,
    );
    const canAlert =
      Boolean(preferences.alerts_enabled) &&
      Boolean(device.push_token) &&
      thresholdMet &&
      categoryChanged &&
      !quiet &&
      !cooldownActive;

    if (canAlert) {
      const title = `${resolved.name}: kualitas udara ${category.label.toLowerCase()}`;
      const body = `${category.message} AQI tercatat ${snapshot.aqi}.${tip}`;
      const message: PushMessage = {
        to: device.push_token as string,
        title,
        body,
        sound: 'default',
        channelId: 'air-quality',
        data: { type: 'alert', slug: resolved.slug, aqi: snapshot.aqi },
      };
      const result = await push.send([message]);
      const status = result.ok > 0 ? 'sent' : 'failed';
      insertNotification(db, {
        deviceRowId: device.id,
        locationSlug: resolved.slug,
        aqi: snapshot.aqi,
        category: category.label,
        title,
        body,
        status,
        expoTicket: result.errors[0] ?? null,
      });
      updatePreferences(db, device.id, {
        lastSentAt: now.toISOString(),
        lastCategory: category.label,
      });
      if (result.ok > 0) report.alertsSent += 1;
      else report.failures += 1;
      logger.info(
        { deviceId: device.device_id, slug: resolved.slug, aqi: snapshot.aqi, status },
        'AQI alert evaluated',
      );
      continue;
    }

    // Track the category even when no alert fires, so turning alerts on later
    // does not replay an old change.
    if (categoryChanged) {
      updatePreferences(db, device.id, { lastCategory: category.label });
    }

    const summaryHour = zoned.hour === 8;
    const summaryDue =
      Boolean(preferences.daily_summary) &&
      summaryHour &&
      preferences.last_summary_day !== zoned.date &&
      Boolean(device.push_token) &&
      !quiet;

    if (summaryDue) {
      const title = `Ringkasan ${zoned.date} · ${resolved.name}`;
      const body = `AQI ${snapshot.aqi} (${category.label}). ${category.message}${tip}`;
      const result = await push.send([
        {
          to: device.push_token as string,
          title,
          body,
          sound: 'default',
          channelId: 'air-quality',
          data: { type: 'summary', slug: resolved.slug, aqi: snapshot.aqi },
        },
      ]);
      insertNotification(db, {
        deviceRowId: device.id,
        locationSlug: resolved.slug,
        aqi: snapshot.aqi,
        category: category.label,
        title,
        body,
        status: result.ok > 0 ? 'sent' : 'failed',
        expoTicket: result.errors[0] ?? null,
      });
      updatePreferences(db, device.id, { lastSummaryDay: zoned.date });
      if (result.ok > 0) report.summariesSent += 1;
      else report.failures += 1;
    }
  }

  logger.info(report, 'Poll cycle finished');
  return report;
}

/**
 * Starts the polling loop; the returned function stops it.
 *
 * A plain interval is enough here: the cadence is a fixed number of minutes
 * (the daily summary is selected inside `pollOnce` from the Jakarta wall
 * clock), and the overlap guard keeps a slow upstream from stacking cycles.
 */
export function startScheduler(deps: SchedulerDeps): () => void {
  const intervalMs = deps.config.pollIntervalMinutes * 60_000;
  let running = false;

  const timer = setInterval(() => {
    if (running) {
      deps.logger.warn('Previous poll still running, skipping this tick');
      return;
    }
    running = true;
    void pollOnce(deps)
      .catch((error) => deps.logger.error({ error }, 'Poll cycle crashed'))
      .finally(() => {
        running = false;
      });
  }, intervalMs);
  timer.unref();

  // Warm the cache once on boot so the first request is not a cold miss.
  void pollOnce(deps).catch((error) => deps.logger.warn({ error }, 'Initial poll failed'));

  deps.logger.info({ intervalMs }, 'Scheduler started');
  return () => {
    clearInterval(timer);
    deps.logger.info('Scheduler stopped');
  };
}
