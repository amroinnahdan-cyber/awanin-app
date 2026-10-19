import { pino } from 'pino';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createExpoPushSender } from './push.js';
import { startScheduler } from './scheduler.js';
import { createUpstream } from './upstream.js';

const config = loadConfig();
const logger = pino({
  level: config.logLevel,
  redact: ['req.headers.authorization', 'pushToken'],
});

const db = openDatabase(config.databasePath);
const upstream = createUpstream(db);
const push = createExpoPushSender(config.expoAccessToken, logger);
const app = createApp({ db, upstream, push, config, logger });

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, database: config.databasePath },
    'Awanin API listening',
  );
});

const stopScheduler = startScheduler({ db, upstream, push, config, logger });

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');
  stopScheduler();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
