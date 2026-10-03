import logger from '../logger.js';
import { db } from '../db/db.js';
import { decodeCookie } from './codec.js';
import {
  sessionBypassEnabled,
  agentUploadEnabled,
  devIdentity,
} from './devbypass.js';
export async function cookieDBCheck(req, res, next) {
  try {
    // DEV_BYPASS_SESSION: no users lookup — the DB is not available in dev.
    // Identity still comes from the real cookie cookieGenerator just built or
    // decoded (same visitor uuid a browser would carry), so a round trip sees
    // the same visitor signature on both sides.
    if (sessionBypassEnabled(req) || agentUploadEnabled(req)) {
      const identity = devIdentity(req);
      req.userId = identity.userId;
      req.user = identity.user;
      req.visitorHash = identity.visitorHash;
      req.cookieData = identity.cookieData;
      return next();
    }
    // There is deliberately no address-only bypass here any more. DEV_BYPASS_IP
    // is the pairing key for the flags above, not a credential: handing every
    // request from that address a fabricated userId = 1 would mean that merely
    // pairing an agent opened an identity hole nothing asked for — and the
    // fabricated id owns no users row, so the quota layer answered 429 for it.
    const rawCookie = req.cookies.userData;
    if (!rawCookie) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const parsed = decodeCookie(rawCookie);
    if (!parsed || !parsed.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const cookieHash = parsed.userId;
    const user = db
      .prepare(
        'SELECT id, cookie_hash, t, last_submission_date FROM users WHERE cookie_hash = ?',
      )
      .get(cookieHash);
    if (!user) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    parsed.timestamp = new Date().toISOString();
    // No res.cookie here. cookieGenerator runs immediately before this on every
    // /api route and has ALREADY refreshed userData with a fresher payload
    // (dbUserId, deviceFingerprint, the rolled `t` counter). Setting it a second
    // time emitted two Set-Cookie: userData headers on every single request —
    // including read-only GETs and the status poll loop — and cost a second
    // AES-256-GCM encryption to send a strictly staler value.
    //
    // req.cookieData is likewise left alone: overwriting it with `parsed` here
    // replaced cookieGenerator's enriched object with the raw decoded request
    // cookie, silently dropping dbUserId for anything downstream that reads it.
    req.userId = user.id;
    req.user = user;
    req.visitorHash = cookieHash;
    if (!req.cookieData) req.cookieData = parsed;
    next();
  } catch (err) {
    logger.log('ERROR:', '[cookieDBCheck]', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
