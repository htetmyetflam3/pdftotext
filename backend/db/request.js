import crypto from 'crypto';
import { SQL_NOW } from './db.js';
import { quotaBypassEnabled } from '../cookie/devbypass.js';

/**
 * The daily allowance per visitor, from DAILY_UPLOAD_LIMIT.
 *
 *   unset / 3   the historic behaviour
 *   50          generous, still bounded
 *   0           OFF — no per-visitor limit at all
 *
 * This is CONFIGURATION, not a bypass. DEV_BYPASS_QUOTA is a hole in a gate
 * and is correctly inert in production; a site that has no paid tier and
 * simply does not want a per-visitor cap should say so here instead, and have
 * it honoured in production like any other setting.
 *
 * Switching it off does not leave the parser unprotected: UPLOAD_RATE_MAX
 * (per IP, per hour) and PARSER_MAX_CONCURRENCY still apply, and the per-IP
 * rate limit is already the binding constraint in practice.
 *
 * Read per call rather than captured at import, so a test can move it — the
 * same rule mode.js follows.
 */
export const QUOTA_OFF_SENTINEL = 999;

export function dailyLimit() {
  const raw = String(process.env.DAILY_UPLOAD_LIMIT ?? '').trim();
  if (raw === '') return 3;
  if (!/^\d+$/.test(raw)) {
    throw new Error('DAILY_UPLOAD_LIMIT must be a non-negative integer (0 disables the per-visitor limit)');
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value > 100_000) {
    throw new Error('DAILY_UPLOAD_LIMIT must be between 0 and 100000');
  }
  return value;
}

/** True when the per-visitor limit is switched off entirely. */
export const quotaDisabledByConfig = () => dailyLimit() === 0;

/** The default when DAILY_UPLOAD_LIMIT is unset. */
export const DAILY_LIMIT_DEFAULT = 3;

// DEV_BYPASS_QUOTA=true runs the request layer DB-free: no users / submissions
// writes. Disk output (.output/txt, .output/original, quarantine) still happens
// exactly as in production.
//
// ALLOW_AGENT_UPLOAD does NOT engage this. The master opens the header and
// cookie gates so an agent can reach the upload; the limit stays on so the
// agent can drive the real 3/day and the real 429.
const devBypass = () => quotaBypassEnabled();

/**
 * users.t — the same count, carried in the encrypted cookie.
 *
 * Two jobs, in this order of precedence:
 *
 *  1. MIRROR. Every DB decision is written back here, so `t` is always a
 *     truthful copy of daily_quota_used. The database stays the gate — the
 *     limit lives inside `UPDATE ... WHERE daily_quota_used < ?`, one
 *     statement and one row lock, which is what makes concurrent uploads
 *     impossible to overrun. A cookie cannot do that: eight parallel requests
 *     all carry the same cookie, all read the same t, and all decide they are
 *     allowed.
 *  2. FALLBACK. When there is genuinely no users row to count against, the
 *     cookie carries the count on its own. That is what `t` was added for and
 *     why cookieGenerator has always zeroed it on a UTC day change — the reset
 *     half shipped, the counting half never did.
 *
 * It cannot be forged: the cookie is AES-256-GCM, so a tampered `t` fails
 * authentication and decodes to null before any handler sees it. It can be
 * REPLAYED, which is the reason it mirrors rather than decides.
 */
function cookieQuota(cookieData, limit) {
  const used = Number.isFinite(Number(cookieData?.t)) ? Number(cookieData.t) : 0;
  return Math.max(0, Math.min(limit, used));
}

/** Write the authoritative count back into the cookie. */
function mirrorToCookie(cookieData, used, limit) {
  if (!cookieData) return false;
  const next = Math.max(0, Math.min(limit, used));
  if (cookieData.t === next) return false;
  cookieData.t = next;
  return true;
}

/** The day part of a stored ISO timestamp ('YYYY-MM-DD'), or null. */
const dayOf = (value) => (value ? String(value).slice(0, 10) : null);

/**
 * The request/quota layer.
 *
 * @param {object} deps
 * @param {object} deps.db  better-sqlite3 Database (Backend/db/db.js)
 *
 * The methods below are synchronous — better-sqlite3 is, and a local file has
 * no latency to hide. Callers still `await` them; awaiting a plain value is a
 * no-op, so the router code did not have to change shape to survive the move.
 */
export function createRequest({ db }) {
  const consumeQuotaTransaction = db.transaction(({ userId, limit }) => {
    const today = new Date().toISOString().slice(0, 10);
    const row = db
      .prepare('SELECT daily_quota_used, daily_quota_reset FROM users WHERE id = ?')
      .get(userId);
    if (!row) return { allowed: false, remaining: 0 };

    if (dayOf(row.daily_quota_reset) !== today) {
      db.prepare(
        `UPDATE users
         SET daily_quota_used = 1, daily_quota_reset = ${SQL_NOW}
         WHERE id = ?`,
      ).run(userId);
      return { allowed: true, remaining: Math.max(0, limit - 1) };
    }

    // The limit stays INSIDE the statement. That is what makes a concurrent
    // burst impossible to overrun: one statement, one row lock.
    const update = db.prepare(
      `UPDATE users
       SET daily_quota_used = daily_quota_used + 1
       WHERE id = ? AND daily_quota_used < ?`,
    ).run(userId, limit);
    if (update.changes !== 1) return { allowed: false, remaining: 0 };
    return { allowed: true, remaining: Math.max(0, limit - 1 - row.daily_quota_used) };
  });

  return {
    validateSession({ userId, visitorHash }) {
      const row = db
        .prepare(
          'SELECT id, daily_quota_used, daily_quota_reset FROM users WHERE id = ? AND cookie_hash = ?',
        )
        .get(userId, visitorHash);
      if (!row) throw new Error('Session metadata mismatch');
      return row;
    },
    createUploadSession({ userId, visitorHash, source, bypassIdentity = false }) {
      const formId = crypto.randomUUID();
      if (devBypass() || bypassIdentity) return formId; // no INSERT — formId is still real
      db.prepare(
        `INSERT INTO submissions
          (submission_id, user_id, session_id, source, status, created_at)
          VALUES (?, ?, ?, ?, ?, ${SQL_NOW})`,
      ).run(formId, userId, visitorHash, source, 'pending');
      return formId;
    },
    validateSubmission({ userId, formId, source, bypassIdentity = false }) {
      if (devBypass() || bypassIdentity || source === 'new')
        return {
          userId,
          formId,
          source,
          owned: true,
        };
      const row = db
        .prepare(
          'SELECT id FROM submissions WHERE user_id = ? AND submission_id = ?',
        )
        .get(userId, formId);
      if (!row) throw new Error('Submission metadata mismatch');
      return {
        userId,
        formId,
        source,
        owned: true,
      };
    },
    getUploadMetadata({ userId, formId }) {
      const row = db
        .prepare(
          'SELECT * FROM submissions WHERE user_id = ? AND submission_id = ?',
        )
        .get(userId, formId);
      if (!row) throw new Error('Upload metadata not found');
      return row;
    },
    checkQuota({ userId, cookieData = null, quotaDisabled = false, allowCookieFallback = false }) {
      const limit = dailyLimit();
      // limit 0 = the operator turned the per-visitor cap off. Same answer as
      // the dev bypass, but reachable in production because it is config.
      if (quotaDisabled || limit === 0) {
        return { allowed: true, remaining: QUOTA_OFF_SENTINEL, limit };
      }
      const today = new Date().toISOString().split('T')[0];
      const row = userId == null
        ? null
        : db
          .prepare('SELECT daily_quota_used, daily_quota_reset FROM users WHERE id = ?')
          .get(userId);
      if (!row) {
        // A missing row for a userId the identity layer handed us is an error,
        // not a licence to use the cookie — refuse. The cookie only takes over
        // when the caller explicitly said this identity may be DB-free.
        if (!allowCookieFallback) return { allowed: false, reason: 'User not found', limit };
        const used = cookieQuota(cookieData, limit);
        return used >= limit
          ? { allowed: false, remaining: 0, limit }
          : { allowed: true, remaining: limit - used, limit };
      }
      // daily_quota_reset is ISO-8601 TEXT now, not a Date — same day, same
      // answer: a reset stamped on an earlier day starts a fresh count.
      if (dayOf(row.daily_quota_reset) !== today) {
        db.prepare(
          `UPDATE users SET daily_quota_used = 0, daily_quota_reset = ${SQL_NOW} WHERE id = ?`,
        ).run(userId);
        return { allowed: true, remaining: limit, limit };
      }
      if (row.daily_quota_used >= limit) {
        return { allowed: false, remaining: 0, limit };
      }
      return { allowed: true, remaining: limit - row.daily_quota_used, limit };
    },
    consumeQuota({ userId, cookieData = null, quotaDisabled = false, allowCookieFallback = false }) {
      const limit = dailyLimit();
      if (quotaDisabled || limit === 0) {
        return { allowed: true, remaining: QUOTA_OFF_SENTINEL, limit };
      }

      const exists = userId != null &&
        db.prepare('SELECT 1 AS ok FROM users WHERE id = ?').get(userId);

      if (!exists) {
        // Same rule as checkQuota: no row and no explicit DB-free licence is a
        // refusal, so a bogus userId can never buy itself a fresh allowance.
        if (!allowCookieFallback) return { allowed: false, remaining: 0, limit };
        const used = cookieQuota(cookieData, limit);
        if (used >= limit) return { allowed: false, remaining: 0, limit };
        const changed = mirrorToCookie(cookieData, used + 1, limit);
        return { allowed: true, remaining: limit - (used + 1), cookieChanged: changed, limit };
      }

      // The happy path: the atomic conditional UPDATE decides, then the
      // cookie is updated to match so `t` never disagrees with the database.
      const result = consumeQuotaTransaction({ userId, limit });
      const used = result.allowed ? limit - result.remaining : limit;
      const changed = mirrorToCookie(cookieData, used, limit);
      return { ...result, cookieChanged: changed, limit };
    },
    // Kept for dormant legacy modules. Active uploads use consumeQuota(),
    // whose conditional write cannot overrun the limit under concurrency.
    incrementQuota({ userId }) {
      if (devBypass()) return;
      consumeQuotaTransaction({ userId });
    },
    failUpload({ userId, formId, bypassIdentity = false }) {
      if (devBypass() || bypassIdentity) return;
      db.prepare(
        `UPDATE submissions
         SET status = ?, updated_at = ${SQL_NOW}
         WHERE submission_id = ? AND user_id = ?`,
      ).run('failed', formId, userId);
    },
    finalizeUpload({
      userId,
      // eslint-disable-next-line no-unused-vars -- intentional unused variable in test/experimental code
      visitorHash,
      formId,
      submitId,
      filename,
      bridgePath,
      originalName,
      bypassIdentity = false,
    }) {
      if (devBypass() || bypassIdentity) return; // no UPDATE — .output is already on disk
      db.prepare(
        `UPDATE submissions
          SET status      = ?,
          file_name   = ?,
          submit_id   = ?,
          bridge_path = ?,
          updated_at  = ${SQL_NOW}
          WHERE submission_id = ? AND user_id = ?`,
      ).run('processed', originalName || filename, submitId, bridgePath, formId, userId);
    },
  };
}
