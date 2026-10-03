import { encodeCookie } from './codec.js';
import { cookieSecureEnabled, cookieSameSite } from '../gateway/edge.js';

export const IDENTITY_COOKIE = 'userData';
export const IDENTITY_MAX_AGE = 15 * 24 * 60 * 60 * 1000;

/**
 * Write the identity cookie, replacing any copy already queued on this
 * response rather than appending a second one.
 *
 * res.cookie() appends to Set-Cookie, so two writers in one request produced
 * two `userData` headers. That matters more now: the DB-free quota counter
 * lives IN the cookie, so the upload route has to re-emit it after consuming
 * a slot, and the browser must receive exactly one — the final — value.
 */
export function setIdentityCookie(res, cookieData) {
  const existing = res.getHeader('Set-Cookie');
  const others = (Array.isArray(existing) ? existing : existing ? [existing] : [])
    .filter((entry) => !String(entry).startsWith(`${IDENTITY_COOKIE}=`));
  if (others.length) res.setHeader('Set-Cookie', others);
  else res.removeHeader('Set-Cookie');

  res.cookie(IDENTITY_COOKIE, encodeCookie(cookieData), {
    httpOnly: true,
    sameSite: cookieSameSite(),
    secure: cookieSecureEnabled(),
    maxAge: IDENTITY_MAX_AGE,
  });
}
