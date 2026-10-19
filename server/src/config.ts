import 'dotenv/config';

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : fallback;
}

export type Config = {
  port: number;
  databasePath: string;
  corsOrigins: string[];
  pollIntervalMinutes: number;
  cooldownMinutes: number;
  quietStart: string;
  quietEnd: string;
  expoAccessToken: string | undefined;
  logLevel: string;
  timeZone: string;
  version: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: num(env.PORT, 4000),
    databasePath: env.DATABASE_PATH ?? './data/awanin.db',
    corsOrigins: list(env.CORS_ORIGINS, ['http://localhost:8081', 'http://localhost:19006']),
    pollIntervalMinutes: num(env.POLL_INTERVAL_MINUTES, 15),
    cooldownMinutes: num(env.COOLDOWN_MINUTES, 180),
    quietStart: env.QUIET_START ?? '22:00',
    quietEnd: env.QUIET_END ?? '06:00',
    expoAccessToken: env.EXPO_ACCESS_TOKEN || undefined,
    logLevel: env.LOG_LEVEL ?? 'info',
    timeZone: 'Asia/Jakarta',
    version: '1.0.0',
  };
}
