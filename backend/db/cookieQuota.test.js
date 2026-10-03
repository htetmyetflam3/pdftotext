import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrate } from './migrate.js';
import { createRequest, dailyLimit, QUOTA_OFF_SENTINEL } from './request.js';

const DAILY_LIMIT = dailyLimit();

function freshDb(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linga-cq-'));
  const db = new Database(path.join(dir, 'site.db'));
  migrate(db, { schemaFile: path.resolve(import.meta.dirname, 'schema.sql') });
  t.after(() => {
    try { db.close(); } catch { /* closed */ }
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return db;
}

test('with no users row at all the count falls back to the cookie', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  // No users row exists: the DB-free case `t` was added for.
  const cookieData = { userId: 'agent-visitor', t: 0 };

  const seen = [];
  for (let i = 0; i < DAILY_LIMIT + 1; i++) {
    const r = request.consumeQuota({ userId: 1, cookieData, allowCookieFallback: true });
    seen.push(r.allowed ? r.remaining : 'refused');
  }
  assert.deepEqual(seen, [2, 1, 0, 'refused']);
  assert.equal(cookieData.t, DAILY_LIMIT, 'the count rides in the cookie');
  assert.equal(db.prepare('SELECT count(*) n FROM users').get().n, 0, 'no DB writes');
});

test('checkQuota agrees with consumeQuota on the cookie fallback path', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  const cookieData = { userId: 'agent', t: 0 };

  for (let i = 0; i < DAILY_LIMIT; i++) {
    assert.equal(request.checkQuota({ cookieData, allowCookieFallback: true }).allowed, true);
    assert.equal(request.consumeQuota({ cookieData, allowCookieFallback: true }).allowed, true);
  }
  assert.equal(request.checkQuota({ cookieData, allowCookieFallback: true }).allowed, false);
});

test('a cookie with a missing or junk t starts from zero', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  for (const seed of [{}, { t: null }, { t: 'nonsense' }, { t: -5 }, { t: NaN }]) {
    const r = request.consumeQuota({ cookieData: seed, allowCookieFallback: true });
    assert.equal(r.allowed, true, JSON.stringify(seed));
    assert.equal(r.remaining, DAILY_LIMIT - 1);
  }
});

test('a cookie claiming a t above the limit is clamped, not trusted downward', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  const r = request.consumeQuota({ cookieData: { t: 9999 }, allowCookieFallback: true });
  assert.equal(r.allowed, false);
  assert.equal(r.remaining, 0);
});

test('quotaDisabled short-circuits both paths', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  for (const r of [request.checkQuota({ userId: 1, quotaDisabled: true }),
                   request.consumeQuota({ userId: 1, quotaDisabled: true })]) {
    assert.equal(r.allowed, true);
    assert.equal(r.remaining, QUOTA_OFF_SENTINEL);
  }
});

test('on the happy path the DB decides and the cookie mirrors it', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  const userId = Number(
    db.prepare('INSERT INTO users (cookie_hash) VALUES (?)').run('v').lastInsertRowid,
  );
  const cookieData = { userId: 'v', t: 0 };

  for (let i = 1; i <= DAILY_LIMIT; i++) {
    const r = request.consumeQuota({ userId, cookieData });
    assert.equal(r.allowed, true);
    const dbUsed = db.prepare('SELECT daily_quota_used u FROM users WHERE id = ?').get(userId).u;
    assert.equal(dbUsed, i, 'the database is the gate');
    assert.equal(cookieData.t, i, 'and the cookie mirrors it exactly');
    assert.equal(r.cookieChanged, true);
  }
  const refused = request.consumeQuota({ userId, cookieData });
  assert.equal(refused.allowed, false);
  assert.equal(cookieData.t, DAILY_LIMIT, 'the mirror still agrees after a refusal');
});

test('a replayed cookie cannot buy extra uploads once a users row exists', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  const userId = Number(
    db.prepare('INSERT INTO users (cookie_hash) VALUES (?)').run('v').lastInsertRowid,
  );
  for (let i = 0; i < DAILY_LIMIT; i++) request.consumeQuota({ userId, cookieData: { t: 0 } });

  // An attacker replays an old, perfectly authentic cookie claiming t = 0.
  const stale = { userId: 'v', t: 0 };
  const r = request.consumeQuota({ userId, cookieData: stale });
  assert.equal(r.allowed, false, 'the database, not the cookie, decides');
  assert.equal(stale.t, DAILY_LIMIT, 'and the replayed cookie is corrected');
});

test('concurrent consumption cannot overrun the limit on the happy path', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  const userId = Number(
    db.prepare('INSERT INTO users (cookie_hash) VALUES (?)').run('v').lastInsertRowid,
  );
  // Every caller carries its own copy of the same t = 0 cookie, which is what
  // a parallel burst from one browser looks like.
  const results = Array.from({ length: 8 }, () =>
    request.consumeQuota({ userId, cookieData: { t: 0 } }));
  assert.equal(results.filter((r) => r.allowed).length, DAILY_LIMIT);
});

test('DAILY_UPLOAD_LIMIT configures the limit, and 0 switches it off', (t) => {
  const db = freshDb(t);
  const request = createRequest({ db });
  const userId = Number(
    db.prepare('INSERT INTO users (cookie_hash) VALUES (?)').run('v').lastInsertRowid,
  );
  const saved = process.env.DAILY_UPLOAD_LIMIT;
  const set = (v) => { if (v === undefined) delete process.env.DAILY_UPLOAD_LIMIT;
    else process.env.DAILY_UPLOAD_LIMIT = v; };
  t.after(() => set(saved));

  // A configured ceiling of 5 is honoured by the atomic UPDATE.
  set('5');
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const r = request.consumeQuota({ userId });
    seen.push(r.allowed ? r.remaining : 'refused');
  }
  assert.deepEqual(seen, [4, 3, 2, 1, 0, 'refused']);
  assert.equal(db.prepare('SELECT daily_quota_used u FROM users WHERE id = ?').get(userId).u, 5);

  // 0 turns the per-visitor cap off entirely — in any MODE, no flag involved.
  set('0');
  for (let i = 0; i < 10; i++) {
    const r = request.consumeQuota({ userId });
    assert.equal(r.allowed, true, `upload ${i} with the limit off`);
    assert.equal(r.remaining, QUOTA_OFF_SENTINEL);
    assert.equal(r.limit, 0);
  }
  // and nothing was counted against the row
  assert.equal(db.prepare('SELECT daily_quota_used u FROM users WHERE id = ?').get(userId).u, 5);

  set(undefined);
  assert.equal(dailyLimit(), 3, 'unset falls back to 3');
});

test('a junk DAILY_UPLOAD_LIMIT is rejected rather than silently defaulted', (t) => {
  const saved = process.env.DAILY_UPLOAD_LIMIT;
  t.after(() => { if (saved === undefined) delete process.env.DAILY_UPLOAD_LIMIT;
    else process.env.DAILY_UPLOAD_LIMIT = saved; });
  for (const bad of ['-1', 'three', '3.5', 'off', '1e3', '200000']) {
    process.env.DAILY_UPLOAD_LIMIT = bad;
    assert.throws(() => dailyLimit(), /DAILY_UPLOAD_LIMIT/, `value ${JSON.stringify(bad)}`);
  }
});
