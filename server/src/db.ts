import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Db = DatabaseSync;

/**
 * SQLite through Node's built-in `node:sqlite` module — no native addon, no
 * build toolchain. The schema is created idempotently on boot, which is enough
 * for a single-instance deployment; a multi-instance deployment would move to
 * Postgres and a migration runner.
 */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL UNIQUE,
      push_token TEXT,
      platform TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS preferences (
      device_row_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      location_slug TEXT NOT NULL DEFAULT 'jakarta-pusat',
      latitude REAL,
      longitude REAL,
      alerts_enabled INTEGER NOT NULL DEFAULT 1,
      daily_summary INTEGER NOT NULL DEFAULT 0,
      tips_enabled INTEGER NOT NULL DEFAULT 1,
      threshold INTEGER NOT NULL DEFAULT 100,
      quiet_start TEXT,
      quiet_end TEXT,
      last_category TEXT,
      last_sent_at TEXT,
      last_summary_day TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      device_row_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      location_slug TEXT NOT NULL,
      aqi INTEGER,
      category TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      expo_ticket TEXT,
      sent_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS notifications_device_idx
      ON notifications (device_row_id, sent_at DESC);

    CREATE TABLE IF NOT EXISTS readings (
      location_slug TEXT NOT NULL,
      aqi INTEGER NOT NULL,
      pm25 REAL,
      pm10 REAL,
      temperature REAL,
      humidity REAL,
      wind REAL,
      captured_at TEXT NOT NULL,
      PRIMARY KEY (location_slug, captured_at)
    );

    CREATE INDEX IF NOT EXISTS readings_location_idx
      ON readings (location_slug, captured_at DESC);

    CREATE TABLE IF NOT EXISTS api_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
  `);
}

/** 15-minute bucket, so repeated requests collapse onto one reading row. */
export function readingBucket(now = new Date()): string {
  const rounded = new Date(Math.floor(now.getTime() / (15 * 60_000)) * 15 * 60_000);
  return rounded.toISOString();
}
