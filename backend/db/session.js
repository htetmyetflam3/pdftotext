import logger from '../logger.js';
import session from 'express-session';
import { db } from './db.js';
import { SqliteSessionStore } from './sessionStore.js';
import { cookieSecureEnabled, cookieSameSite } from '../gateway/edge.js';
export function createSessionMiddleware({
  secret = process.env.SESSION_SECRET || 'super-secret-key',
  maxAge = 24 * 60 * 60 * 1000,
  checkExpirationInterval = 15 * 60 * 1000,
} = {}) {
  // The session store is ALWAYS the SQLite one.
  //
  // This used to drop to MemoryStore whenever a bypass flag was set — and the
  // condition included sessionBypassIgnored()/agentUploadIgnored(), the two
  // helpers whose entire job is to say "the flag is set but production is
  // ignoring it". So a stray DEV_BYPASS_SESSION=true carried from a dev .env
  // silently swapped a production server onto MemoryStore: sessions lost on
  // restart, unbounded memory growth, broken across more than one process.
  // Silently, because both banner lines were guarded by Enabled(), not
  // Ignored(), and .env sets NODE_ENV=production so express-session's own
  // MemoryStore warning never fired either.
  //
  // It is also the wrong shape now that bypasses are paired to DEV_BYPASS_IP:
  // one process serves bypassed and ordinary callers at the same time, so a
  // process-wide store swap would degrade everyone to satisfy one agent.
  //
  // The original justification — "the DB is not available in dev" — was MySQL
  // reasoning. SQLite is a file this process already has open.
  // The store runs on the same open connection as everything else — no pool, no
  // second client, and it creates its own `sessions` table on first run.
  const store = new SqliteSessionStore({
    db,
    tableName: 'sessions',
    checkExpirationIntervalMs: checkExpirationInterval,
    expirationMs: maxAge,
  });
  store.on('error', (err) => {
    logger.log('ERROR:', '[SessionStore]', err.message);
  });
  return session({
    name: 'sid',
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge,
      httpOnly: true,
      sameSite: cookieSameSite(),
      secure: cookieSecureEnabled(),
    },
  });
}
