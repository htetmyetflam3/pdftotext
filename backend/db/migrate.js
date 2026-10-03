// FILE: backend/db/migrate.js
//
// The schema ledger.
//
// WHAT WAS WRONG BEFORE
// ─────────────────────
// ensureSchema() used to be `db.exec(schema.sql)` and the file claimed to be
// "the first import AND the migration". It was neither, because every statement
// is IF NOT EXISTS: an existing table is never reshaped. A database written by
// an older build therefore kept its old columns forever, and the boot either
//
//   • crashed on an unhandled SqliteError — "no such column: device_fingerprint"
//     from CREATE INDEX, with a raw stack trace and no guidance; or, worse,
//   • appeared to succeed, because the missing column happened not to be
//     referenced by any index, and then failed on the first query under traffic.
//
// There was no user_version, no ledger table, and no way to tell a fresh file
// from a drifted one.
//
// WHAT THIS DOES
// ──────────────
// PRAGMA user_version is the ledger — it is a 32-bit int stored in the database
// header, costs nothing to read, and needs no table of its own.
//
//   user_version = 0   fresh file, or a legacy database from before versioning
//   user_version = N   every migration up to and including N has been applied
//
// On boot:
//   1. user_version 0 + no application tables  → apply the baseline, stamp 1.
//   2. user_version 0 + application tables     → ADOPT: verify the file really
//      has the baseline shape. Matching files are stamped 1 and continue.
//      Drifted files raise a SchemaDriftError that NAMES the missing tables and
//      columns and says what to do. We never silently ALTER a database whose
//      history we cannot see — that is how data is lost.
//   3. Then every migration above the stored version runs in order, each inside
//      its own transaction, each stamping user_version on success.
//
// Adding a migration: append to MIGRATIONS with the next version number and
// leave the earlier entries alone. schema.sql stays the baseline (what a fresh
// v1 database looks like); later shape changes belong in a migration step, not
// in schema.sql, or the two will disagree.
import fs from 'node:fs';

/** Thrown when an unversioned database does not match the baseline. */
export class SchemaDriftError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'SchemaDriftError';
    this.details = details;
  }
}

/** The shape a user_version=1 database has. Used to adopt legacy files. */
export const BASELINE_TABLES = {
  users: [
    'id', 'cookie_hash', 'visitor_id', 'cf_header_ip', 'cf_country',
    'user_agent', 'device_fingerprint', 'local_storage_token', 't',
    'daily_quota_used', 'daily_quota_reset', 'last_submission_date',
    'created_at', 'updated_at',
  ],
  submissions: [
    'id', 'submission_id', 'user_id', 'session_id', 'source', 'status',
    'file_name', 'submit_id', 'bridge_path', 'created_at', 'updated_at',
  ],
  user_logs: ['id', 'user_id', 'action', 'details', 'timestamp'],
};

const tableNames = (db) =>
  new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => r.name),
  );

const columnNames = (db, table) =>
  new Set(db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map((c) => c.name));

/**
 * Compare an unversioned database against the baseline.
 * @returns {{missingTables: string[], missingColumns: Record<string,string[]>}}
 */
export function baselineDrift(db) {
  const present = tableNames(db);
  const missingTables = [];
  const missingColumns = {};
  for (const [table, expected] of Object.entries(BASELINE_TABLES)) {
    if (!present.has(table)) {
      missingTables.push(table);
      continue;
    }
    const actual = columnNames(db, table);
    const missing = expected.filter((c) => !actual.has(c));
    if (missing.length) missingColumns[table] = missing;
  }
  return { missingTables, missingColumns };
}

/** Does this file already hold application data, or is it a fresh/empty file? */
export function hasApplicationTables(db) {
  const present = tableNames(db);
  return Object.keys(BASELINE_TABLES).some((t) => present.has(t));
}

function adoptLegacyDatabase(db, schemaSql) {
  const { missingTables, missingColumns } = baselineDrift(db);
  const columnProblems = Object.entries(missingColumns);

  // Tables that are simply absent are safe to create — IF NOT EXISTS leaves the
  // existing ones untouched, and a missing table has no rows to lose.
  // Columns missing from a table that DOES exist are real drift: adding them
  // blind would invent defaults for rows we know nothing about.
  if (columnProblems.length) {
    const detail = columnProblems
      .map(([table, cols]) => `  - ${table} is missing: ${cols.join(', ')}`)
      .join('\n');
    throw new SchemaDriftError(
      'This SQLite file predates schema versioning and does not match the ' +
        'current baseline, so it cannot be adopted automatically:\n' +
        `${detail}\n\n` +
        'Nothing has been changed. Back the file up, then either migrate it by ' +
        'hand (ALTER TABLE ... ADD COLUMN) and re-run, or point DB_FILE at a ' +
        'fresh path to start clean.',
      { missingTables, missingColumns },
    );
  }

  try {
    db.exec(schemaSql);
  } catch (error) {
    throw new SchemaDriftError(
      'This SQLite file predates schema versioning and the baseline could not ' +
        `be applied to it: ${error.message}\n\n` +
        'A common cause is existing rows that violate a unique index (for ' +
        'example duplicate users.cookie_hash). Nothing has been changed. ' +
        'Resolve the conflicting rows, or point DB_FILE at a fresh path.',
      { cause: error.message },
    );
  }
}

export const MIGRATIONS = [
  {
    version: 1,
    name: 'baseline',
    apply(db, { schemaSql }) {
      db.exec(schemaSql);
    },
  },
  {
    version: 2,
    name: 'referential-integrity',
    // `PRAGMA foreign_keys = ON` was already set in db.js, but the schema
    // declared no foreign keys at all, so it enforced nothing: a submission
    // could reference a user id that never existed. The enumerated columns had
    // their allowed values in a comment only. Both are real constraints now.
    //
    // SQLite cannot ALTER a table into having constraints, so this is the
    // documented 12-step rebuild: new table, copy, drop, rename, re-index.
    apply(db) {
      db.exec(`
        CREATE TABLE submissions_v2 (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          submission_id   TEXT    NOT NULL,
          user_id         INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          session_id      TEXT,
          source          TEXT    CHECK (source IS NULL OR source IN ('file', 'text')),
          status          TEXT    DEFAULT 'pending'
                                  CHECK (status IS NULL OR status IN ('pending', 'processed', 'failed')),
          file_name       TEXT,
          submit_id       TEXT,
          bridge_path     TEXT,
          created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        INSERT INTO submissions_v2
          (id, submission_id, user_id, session_id, source, status, file_name,
           submit_id, bridge_path, created_at, updated_at)
          SELECT id, submission_id, user_id, session_id, source, status, file_name,
                 submit_id, bridge_path, created_at, updated_at
            FROM submissions
           WHERE user_id IN (SELECT id FROM users)
             AND (source IS NULL OR source IN ('file', 'text'))
             AND (status IS NULL OR status IN ('pending', 'processed', 'failed'));
        DROP TABLE submissions;
        ALTER TABLE submissions_v2 RENAME TO submissions;
        CREATE UNIQUE INDEX uq_submissions_submission_id ON submissions (submission_id);
        CREATE INDEX idx_submissions_user ON submissions (user_id, created_at);

        CREATE TABLE user_logs_v2 (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
          action     TEXT,
          details    TEXT,
          timestamp  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        INSERT INTO user_logs_v2 (id, user_id, action, details, timestamp)
          SELECT id, user_id, action, details, timestamp
            FROM user_logs
           WHERE user_id IN (SELECT id FROM users);
        DROP TABLE user_logs;
        ALTER TABLE user_logs_v2 RENAME TO user_logs;
        CREATE INDEX idx_user_logs_user ON user_logs (user_id, timestamp);
      `);
    },
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Bring `db` up to LATEST_VERSION. Idempotent, and safe to call on every boot.
 *
 * @param {object} db          an open better-sqlite3 Database
 * @param {object} options
 * @param {string} options.schemaFile  absolute path to schema.sql
 * @param {(line: string) => void} [options.log]
 * @returns {{from: number, to: number, applied: string[]}}
 */
export function migrate(db, { schemaFile, log = () => {} }) {
  const schemaSql = fs.readFileSync(schemaFile, 'utf8');
  let version = Number(db.pragma('user_version', { simple: true })) || 0;
  const from = version;
  const applied = [];

  if (version === 0 && hasApplicationTables(db)) {
    // A database from before this ledger existed. Prove it matches v1, then
    // adopt it rather than re-running a baseline that cannot reshape it.
    adoptLegacyDatabase(db, schemaSql);
    db.pragma('user_version = 1');
    version = 1;
    applied.push('1:adopt-legacy');
    log('[db] adopted an unversioned database as schema v1');
  }

  for (const step of MIGRATIONS) {
    if (step.version <= version) continue;
    // Foreign keys must be off for the drop/rename rebuild, and the pragma is a
    // no-op inside a transaction — so it is toggled around one, not within.
    const fkWasOn = Number(db.pragma('foreign_keys', { simple: true })) === 1;
    if (fkWasOn) db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        step.apply(db, { schemaSql });
        db.pragma(`user_version = ${step.version}`);
      })();
    } catch (error) {
      throw new Error(
        `Schema migration ${step.version} (${step.name}) failed and was rolled ` +
          `back: ${error.message}`,
        { cause: error },
      );
    } finally {
      if (fkWasOn) db.pragma('foreign_keys = ON');
    }
    // A rebuild can leave dangling references if the pragma was off; prove not.
    const violations = db.pragma('foreign_key_check');
    if (violations.length) {
      throw new Error(
        `Schema migration ${step.version} (${step.name}) left ` +
          `${violations.length} foreign key violation(s).`,
      );
    }
    version = step.version;
    applied.push(`${step.version}:${step.name}`);
    log(`[db] applied schema migration ${step.version} (${step.name})`);
  }

  return { from, to: version, applied };
}
