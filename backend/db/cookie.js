import { db, SQL_NOW } from './db.js';
/**
 * Upsert a user row keyed by cookie_hash.
 * Also stores fingerprint, geo, localStorage token, and last-seen timestamps.
 *
 * The lookup-then-insert-or-update is wrapped in ONE SQLite transaction.
 * Request-level identity logs are not written: they add no authorization value
 * and would create an unbounded privacy-sensitive growth path. The MySQL version could not do this without
 * checking out a pooled connection first.
 */
export const createOrUpdateCookie = db.transaction((cookieData) => {
  const hash = cookieData.userId;
  const visitorId = cookieData.userId;
  const cfHeader = cookieData.cfHeader || 'unknown';
  const cfCountry = cookieData.cfCountry || 'unknown';
  const userAgent = cookieData.userAgent || 'unknown';
  const deviceFingerprint = cookieData.deviceFingerprint || '';
  const localStorageToken = cookieData.localStorageToken || '';
  const existing = db
    .prepare(
      `SELECT id, cf_header_ip, cf_country, user_agent, device_fingerprint,
              local_storage_token
         FROM users WHERE cookie_hash = ?`,
    )
    .get(hash);
  let userId;
  if (!existing) {
    const result = db
      .prepare(
        `INSERT INTO users
           (cookie_hash, visitor_id, cf_header_ip, cf_country, user_agent,
            device_fingerprint, local_storage_token, t, daily_quota_used,
            daily_quota_reset, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${SQL_NOW}, ${SQL_NOW}, ${SQL_NOW})`,
      )
      .run(
        hash,
        visitorId,
        cfHeader,
        cfCountry,
        userAgent,
        deviceFingerprint,
        localStorageToken,
        0,
        0,
      );
    userId = Number(result.lastInsertRowid);
  } else {
    userId = existing.id;
    // Only write when something actually changed. cookieGenerator runs on every
    // /api request, so an unconditional UPDATE meant one row write per request
    // — including read-only GETs and the once-per-second status poll, which
    // turned a polling browser into a steady stream of WAL writes for a row
    // whose contents were identical every time.
    const changed =
      existing.cf_header_ip !== cfHeader ||
      existing.cf_country !== cfCountry ||
      existing.user_agent !== userAgent ||
      existing.device_fingerprint !== deviceFingerprint ||
      existing.local_storage_token !== localStorageToken;
    if (changed) {
      db.prepare(
        `UPDATE users
           SET cf_header_ip        = ?,
               cf_country            = ?,
               user_agent            = ?,
               device_fingerprint    = ?,
               local_storage_token   = ?,
               updated_at            = ${SQL_NOW}
           WHERE id = ?`,
      ).run(cfHeader, cfCountry, userAgent, deviceFingerprint, localStorageToken, userId);
    }
  }
  return userId;
});