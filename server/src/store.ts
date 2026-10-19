import { randomUUID } from 'node:crypto';

import type { Db } from './db.js';
import type { CurrentReading } from './upstream.js';

export type DeviceRow = {
  id: string;
  device_id: string;
  push_token: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
};

export type PreferenceRow = {
  device_row_id: string;
  location_slug: string;
  latitude: number | null;
  longitude: number | null;
  alerts_enabled: number;
  daily_summary: number;
  tips_enabled: number;
  threshold: number;
  quiet_start: string | null;
  quiet_end: string | null;
  last_category: string | null;
  last_sent_at: string | null;
  last_summary_day: string | null;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  device_row_id: string;
  location_slug: string;
  aqi: number | null;
  category: string | null;
  title: string;
  body: string;
  status: string;
  expo_ticket: string | null;
  sent_at: string;
};

export type PreferencePatch = {
  locationSlug?: string;
  latitude?: number | null;
  longitude?: number | null;
  alertsEnabled?: boolean;
  dailySummary?: boolean;
  tipsEnabled?: boolean;
  threshold?: number;
  quietStart?: string | null;
  quietEnd?: string | null;
  lastCategory?: string | null;
  lastSentAt?: string | null;
  lastSummaryDay?: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function getDevice(db: Db, deviceId: string): DeviceRow | undefined {
  return db.prepare('SELECT * FROM devices WHERE device_id = ?').get(deviceId) as
    | DeviceRow
    | undefined;
}

export function getPreferences(db: Db, deviceRowId: string): PreferenceRow | undefined {
  return db.prepare('SELECT * FROM preferences WHERE device_row_id = ?').get(deviceRowId) as
    | PreferenceRow
    | undefined;
}

export function upsertDevice(
  db: Db,
  input: { deviceId: string; pushToken?: string | null; platform?: string | null },
): { device: DeviceRow; preferences: PreferenceRow; created: boolean } {
  const existing = getDevice(db, input.deviceId);
  const stamp = nowIso();

  if (existing) {
    db.prepare(
      `UPDATE devices
          SET push_token = COALESCE(?, push_token),
              platform = COALESCE(?, platform),
              updated_at = ?
        WHERE id = ?`,
    ).run(input.pushToken ?? null, input.platform ?? null, stamp, existing.id);
    if (!getPreferences(db, existing.id)) {
      db.prepare(
        `INSERT INTO preferences (device_row_id, updated_at) VALUES (?, ?)`,
      ).run(existing.id, stamp);
    }
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(existing.id) as DeviceRow;
    return { device, preferences: getPreferences(db, existing.id) as PreferenceRow, created: false };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO devices (id, device_id, push_token, platform, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, input.deviceId, input.pushToken ?? null, input.platform ?? null, stamp, stamp);
  db.prepare(`INSERT INTO preferences (device_row_id, updated_at) VALUES (?, ?)`).run(id, stamp);
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as DeviceRow;
  return { device, preferences: getPreferences(db, id) as PreferenceRow, created: true };
}

export function updateDevice(
  db: Db,
  deviceRowId: string,
  patch: { pushToken?: string | null; platform?: string | null },
): void {
  const assignments: string[] = [];
  const values: (string | null)[] = [];
  if (patch.pushToken !== undefined) {
    assignments.push('push_token = ?');
    values.push(patch.pushToken);
  }
  if (patch.platform !== undefined) {
    assignments.push('platform = ?');
    values.push(patch.platform);
  }
  if (assignments.length === 0) return;
  db.prepare(
    `UPDATE devices SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`,
  ).run(...values, nowIso(), deviceRowId);
}

export function deleteDevice(db: Db, deviceId: string): boolean {
  const device = getDevice(db, deviceId);
  if (!device) return false;
  db.prepare('DELETE FROM devices WHERE id = ?').run(device.id);
  return true;
}

const PREFERENCE_COLUMNS: Record<keyof PreferencePatch, string> = {
  locationSlug: 'location_slug',
  latitude: 'latitude',
  longitude: 'longitude',
  alertsEnabled: 'alerts_enabled',
  dailySummary: 'daily_summary',
  tipsEnabled: 'tips_enabled',
  threshold: 'threshold',
  quietStart: 'quiet_start',
  quietEnd: 'quiet_end',
  lastCategory: 'last_category',
  lastSentAt: 'last_sent_at',
  lastSummaryDay: 'last_summary_day',
};

function normalizePreferenceValue(key: keyof PreferencePatch, value: unknown): unknown {
  if (key === 'alertsEnabled' || key === 'dailySummary' || key === 'tipsEnabled') {
    return value ? 1 : 0;
  }
  return value;
}

export function updatePreferences(
  db: Db,
  deviceRowId: string,
  patch: PreferencePatch,
): PreferenceRow {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    const current = getPreferences(db, deviceRowId);
    if (!current) throw new Error('Preferences missing');
    return current;
  }

  const assignments = entries.map(([key]) => `${PREFERENCE_COLUMNS[key as keyof PreferencePatch]} = ?`);
  const values = entries.map(([key, value]) =>
    normalizePreferenceValue(key as keyof PreferencePatch, value),
  );
  db.prepare(
    `UPDATE preferences SET ${assignments.join(', ')}, updated_at = ? WHERE device_row_id = ?`,
  ).run(...(values as (string | number | null)[]), nowIso(), deviceRowId);

  const updated = getPreferences(db, deviceRowId);
  if (!updated) throw new Error('Preferences missing after update');
  return updated;
}

export function recordReading(
  db: Db,
  locationSlug: string,
  reading: CurrentReading,
  capturedAt: string,
): void {
  db.prepare(
    `INSERT OR REPLACE INTO readings
       (location_slug, aqi, pm25, pm10, temperature, humidity, wind, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    locationSlug,
    Math.round(reading.aqi),
    reading.pm25,
    reading.pm10,
    reading.temperature,
    reading.humidity,
    reading.wind,
    capturedAt,
  );
}

export function latestReading(
  db: Db,
  locationSlug: string,
): { aqi: number; capturedAt: string } | null {
  const row = db
    .prepare(
      `SELECT aqi, captured_at FROM readings
        WHERE location_slug = ?
        ORDER BY captured_at DESC LIMIT 1`,
    )
    .get(locationSlug) as { aqi: number; captured_at: string } | undefined;
  return row ? { aqi: row.aqi, capturedAt: row.captured_at } : null;
}

export function getTrend(
  db: Db,
  locationSlug: string,
  hours: number,
): { at: string; aqi: number }[] {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const rows = db
    .prepare(
      `SELECT captured_at, aqi FROM readings
        WHERE location_slug = ? AND captured_at >= ?
        ORDER BY captured_at ASC`,
    )
    .all(locationSlug, since) as { captured_at: string; aqi: number }[];
  return rows.map((row) => ({ at: row.captured_at, aqi: row.aqi }));
}

export function insertNotification(
  db: Db,
  input: {
    deviceRowId: string;
    locationSlug: string;
    aqi: number;
    category: string;
    title: string;
    body: string;
    status: 'sent' | 'failed' | 'skipped';
    expoTicket?: string | null;
    sentAt?: string;
  },
): NotificationRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO notifications
       (id, device_row_id, location_slug, aqi, category, title, body, status, expo_ticket, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.deviceRowId,
    input.locationSlug,
    Math.round(input.aqi),
    input.category,
    input.title,
    input.body,
    input.status,
    input.expoTicket ?? null,
    input.sentAt ?? nowIso(),
  );
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as NotificationRow;
}

export function listNotifications(
  db: Db,
  deviceRowId: string,
  limit = 20,
): NotificationRow[] {
  return db
    .prepare(
      `SELECT * FROM notifications
        WHERE device_row_id = ?
        ORDER BY sent_at DESC LIMIT ?`,
    )
    .all(deviceRowId, Math.min(Math.max(limit, 1), 100)) as NotificationRow[];
}

export function serializeNotificationList(rows: NotificationRow[]) {
  return rows.map((row) => ({
    id: row.id,
    locationSlug: row.location_slug,
    aqi: row.aqi,
    category: row.category,
    title: row.title,
    body: row.body,
    status: row.status,
    sentAt: row.sent_at,
  }));
}

export function listSubscriptions(
  db: Db,
): { device: DeviceRow; preferences: PreferenceRow }[] {
  const rows = db
    .prepare(
      `SELECT d.*, p.device_row_id AS p_device_row_id, p.location_slug, p.latitude, p.longitude,
              p.alerts_enabled, p.daily_summary, p.tips_enabled, p.threshold,
              p.quiet_start, p.quiet_end, p.last_category, p.last_sent_at,
              p.last_summary_day, p.updated_at AS p_updated_at
         FROM devices d
         JOIN preferences p ON p.device_row_id = d.id`,
    )
    .all() as (DeviceRow & Record<string, unknown>)[];

  return rows.map((row) => ({
    device: {
      id: row.id,
      device_id: row.device_id,
      push_token: row.push_token,
      platform: row.platform,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    preferences: {
      device_row_id: row.p_device_row_id as string,
      location_slug: row.location_slug as string,
      latitude: row.latitude as number | null,
      longitude: row.longitude as number | null,
      alerts_enabled: row.alerts_enabled as number,
      daily_summary: row.daily_summary as number,
      tips_enabled: row.tips_enabled as number,
      threshold: row.threshold as number,
      quiet_start: row.quiet_start as string | null,
      quiet_end: row.quiet_end as string | null,
      last_category: row.last_category as string | null,
      last_sent_at: row.last_sent_at as string | null,
      last_summary_day: row.last_summary_day as string | null,
      updated_at: row.p_updated_at as string,
    },
  }));
}
