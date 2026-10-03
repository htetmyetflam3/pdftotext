// FILE: Backend/db/db.js
// ── The site's database: ONE SQLite file, opened by better-sqlite3 ──────────
//
// What changed and why the shape of this file is different
// ───────────────────────────────────────────────────────
// This module used to export a mysql2 connection POOL: a network client with a
// host, a user, a password, a database name and a socket — every query was a
// round trip and every call was a promise. It now exports ONE
// `better-sqlite3` Database: a file handle. There is nothing to dial, nothing
// to pool, and — the part that changes every call site — nothing asynchronous.
//
//   before:  const [rows] = await pool.query('SELECT … WHERE id = ?', [id]);
//   now:     const row = db.prepare('SELECT … WHERE id = ?').get(id);
//
// The `?` placeholders are the same, so the SQL itself survives the move; what
// went away is the tuple/`await` wrapper, because better-sqlite3 executes
// synchronously in-process (it is the sqlite3 C library, without a thread).
// Handlers that were already async stay async (they do file and socket work) —
// they simply no longer await the database.
//
// Prepared statements are CACHEABLE in better-sqlite3: preparing the same text
// twice is cheap, but a hot path can hold the statement. Everything in this
// tree prepares on use and keeps the call site readable.
//
// Timestamps: MySQL's NOW() wrote a DATETIME the driver handed back as a JS
// Date; SQLite has no date type, so dates are ISO-8601 TEXT in UTC — which
// sorts chronologically, compares as a string, and JSON-serialises to the same
// shape the mysql2 Date did. SQL_NOW below is the one expression to use.
import fs from 'fs';
import Database from 'better-sqlite3';
import { DB_FILE, abs, ensureDataDir, SCHEMA_FILE } from '../file/paths.js';
import { migrate } from './migrate.js';

/** The SQLite file this process opens (absolute; see paths.js for DB_FILE). */
export const dbPath = abs(DB_FILE);

/** ISO-8601 UTC with milliseconds — the SQLite stand-in for MySQL's NOW(). */
export const SQL_NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

// better-sqlite3 creates the file but not its parent dir.
ensureDataDir();

/**
 * The one connection, shared by everything in this process.
 *
 * `foreign_keys` is off by default in SQLite and stays ON here so the schema can
 * grow relations later without a surprise; WAL lets a reader (a second process
 * poking the file, a backup) work while the site writes; `busy_timeout` makes a
 * concurrent writer wait instead of throwing SQLITE_BUSY at the first lock.
 */
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');

/**
 * Bring the database up to the current schema version. Idempotent, so it runs
 * on every boot. Called from the server entry before anything queries.
 *
 * schema.sql is the BASELINE (what a fresh v1 file looks like), not the
 * migration: every statement in it is IF NOT EXISTS, so it cannot reshape a
 * table that already exists. Versioned steps live in migrate.js and the applied
 * version is recorded in PRAGMA user_version. See that file for why.
 */
export function ensureSchema({ log = console.log } = {}) {
  const result = migrate(db, { schemaFile: abs(SCHEMA_FILE), log });
  if (result.from !== result.to) {
    log(`[db] schema ${result.from} → ${result.to}`);
  }
  return dbPath;
}

/**
 * WAL keeps uncheckpointed rows in `<db>-wal` and shared state in `<db>-shm`.
 * Those files are created by SQLite with the process umask, so a 0600 database
 * can sit next to a world-readable -wal holding the very rows it protects.
 * ensureDataDir() deliberately does not lock down a custom DB_FILE's parent,
 * which is exactly when this matters.
 */
export function secureDbFiles() {
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    try {
      fs.chmodSync(file, 0o600);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

/** Close the handle (tests, scripts, a clean shutdown). */
export function closeDb() {
  db.close();
}

/** Where the file is, for boot banners and health output. */
export function dbInfo() {
  return { file: dbPath, exists: fs.existsSync(dbPath) };
}
