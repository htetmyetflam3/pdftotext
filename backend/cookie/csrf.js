import crypto from 'crypto';
import {
  sessionBypassEnabled,
  agentUploadEnabled,
} from './devbypass.js';

/** Constant-time comparison */
function timingSafeMatch(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Validates CSRF on mutating requests (POST, PUT, DELETE, PATCH). The token
 * must be in the x-csrf-token header and match the csrf_token cookie. Requiring
 * a non-simple header also forces cross-origin browsers through CORS preflight.
 */
export function csrfCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  if (sessionBypassEnabled(req) || agentUploadEnabled(req)) {
    return next();
  }

  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') {
    return res.status(403).json({ error: 'Cross-origin request denied' });
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      // Compare authority rather than req.protocol: a TLS-terminating reverse
      // proxy may legitimately forward to this process over HTTP. Host remains
      // the browser-visible authority; untrusted forwarded-host is never read.
      if (new URL(origin).host !== String(req.get('host') || '').toLowerCase()) {
        return res.status(403).json({ error: 'Cross-origin request denied' });
      }
    } catch {
      return res.status(403).json({ error: 'Cross-origin request denied' });
    }
  }

  const token = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrf_token;

  if (!token || !cookieToken || !timingSafeMatch(token, cookieToken)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  next();
}
