import logger from '../logger.js';
import crypto from 'node:crypto';
import { createOrUpdateCookie } from '../db/cookie.js';
import { decodeCookie } from './codec.js';
import { setIdentityCookie } from './emit.js';
/** 'YYYY-MM-DD' in UTC — the same day boundary the DB quota resets on. */
function utcDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function hashFingerprint(ip, ua, country) {
  const raw = `${ip}::${ua}::${country}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}
export const cookieGenerator = async (req, res, next) => {
  try {
    const cfHeader =
      req.edge?.ip || req.trustedIp || req.ip || req.socket?.remoteAddress || 'unknown';
    const cfCountry = req.edge?.country || null;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const timestampNow = new Date();
    const nowIso = timestampNow.toISOString();
    let cookieData;
    if (!req.cookies.userData) {
      const localStorageToken = crypto.randomBytes(16).toString('hex');
      const visitorId = crypto.randomUUID();
      cookieData = {
        userId: visitorId,
        cfHeader,
        cfCountry,
        userAgent,
        timestamp: nowIso,
        t: 0,
        localStorageToken,
      };
    } else {
      try {
        cookieData = decodeCookie(req.cookies.userData);
        if (!cookieData || !cookieData.userId) throw new Error('bad');
        // UTC day, matching the DB quota reset in backend/db/request.js.
        // toDateString() compares LOCAL days, so the cookie's counter rolled at
        // a different midnight from the quota it shadows — in Asia/Yangon
        // (UTC+6:30) they disagreed for six and a half hours every day.
        if (utcDay(cookieData.timestamp) !== utcDay(timestampNow)) {
          cookieData.t = 0;
        }
        cookieData.timestamp = nowIso;
      } catch {
        const localStorageToken = crypto.randomBytes(16).toString('hex');
        const visitorId = crypto.randomUUID();
        cookieData = {
          userId: visitorId,
          cfHeader,
          cfCountry,
          userAgent,
          timestamp: nowIso,
          t: 0,
          localStorageToken,
        };

      }
    }
    const deviceFingerprint = hashFingerprint(cfHeader, userAgent, cfCountry);
    cookieData.deviceFingerprint = deviceFingerprint;
    // The visitor row is upserted for EVERYONE, bypassed or not.
    //
    // A bypass opens the three gates in front of this — the User-Agent check,
    // the cookie check, and the users-row check — and then drops the request
    // into the same happy path everything else runs. It does not fork into a
    // parallel one. So the row exists, the quota counts against it the way it
    // counts for a browser, and an agent testing the limit is testing the
    // limit, not a stand-in for it.
    //
    // This used to assign a literal dbUserId = 1 and skip the write, which
    // fabricated an id that owned no row: every downstream lookup missed, and
    // checkQuota's "User not found" surfaced to the caller as 429.
    const dbUserId = await createOrUpdateCookie({
      ...cookieData,
      deviceFingerprint,
      localStorageToken: cookieData.localStorageToken,
    });
    cookieData.dbUserId = dbUserId;
    // secure/sameSite come from the EDGE topology, not from a mode variable: a
    // server published through the tunnel is still HTTPS to the browser whatever
    // MODE says, and a `secure:false` cookie on an HTTPS page is a downgrade.
    // Unset COOKIE_SECURE/TRUST_PROXY = not secure, i.e. plain http on
    // localhost — which is right for a bare `node R_Site/index.js`.
    setIdentityCookie(res, cookieData);
    res.setHeader('X-Visitor-Token', cookieData.localStorageToken);
    req.visitorHash = cookieData.userId;
    req.cookieData = cookieData;
    next();
  } catch (err) {
    logger.log('ERROR:', '[CookieGenerator]', err);
    res.status(500).json({ status: 'error', reason: 'Cookie handling failed' });
  }
};
