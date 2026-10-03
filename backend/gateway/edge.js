// FILE: R_Site/Backend/gateway/edge.js
//
// EDGE LAYER — everything that is only true when the site web is reached
// through Cloudflare (Worker → Tunnel → this Express server) instead of
// directly on :3000.
//
// Three separate concerns live here, each its own export, each opt-in by env.
// Nothing in this file changes behaviour when the site runs bare on localhost:
// unset env = the middleware is a no-op passthrough. That is deliberate —
// the tunnel is a deployment topology, not a code path.
//
//   trustProxyValue()  what to hand app.set('trust proxy', …)
//   edgeGuard          refuse requests that did not come through OUR worker
//   edgeContext        stamp req with the edge-derived identity (ip, country, ray)
//
// ── THE HOP CHAIN ─────────────────────────────────────────────────────────
//   browser → Cloudflare edge (Worker) → Cloudflare Tunnel → cloudflared
//           → http://127.0.0.1:3000 (this server)
//
// cloudflared runs ON the same machine as the site web and connects to it over
// loopback. So WITHOUT trust proxy every request appears to come from
// 127.0.0.1: req.ip is useless, req.protocol says "http" (cloudflared speaks
// plain HTTP to the origin even though the public hop was HTTPS), and
// `secure: true` cookies are therefore never sent. The real client identity
// only exists in headers, and headers are forgeable — which is why the guard
// below exists: trust the headers ONLY when the request proved it came through
// the worker.

import crypto from 'node:crypto';

import { isProduction } from '../mode.js';

/** Comma/space separated env list → array. */
function asList(v) {
  if (!v) return [];
  return String(v)
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Value for app.set('trust proxy', …), from TRUST_PROXY.
 *
 * Express accepts several shapes and they are NOT interchangeable:
 *   'loopback'            trust 127.0.0.1/::1 — the right answer for a
 *                         cloudflared running on the same host (the default
 *                         when TRUST_PROXY is any truthy non-numeric value)
 *   <number>              trust N hops back from the socket
 *   <ip>,<ip>/<cidr>…     trust exactly these addresses
 *   false                 trust nothing (unset TRUST_PROXY) — direct exposure
 *
 * `true` (trust everything) is intentionally NOT reachable: with it any client
 * can spoof X-Forwarded-For and become whatever IP it likes, which would hand
 * the quota layer and DEV_BYPASS_IP to the attacker. 'loopback' gives the same
 * result for a same-host tunnel without that hole.
 *
 * @returns {string|number|string[]|false}
 */
export function trustProxyValue() {
  const raw = (process.env.TRUST_PROXY || '').trim();
  if (!raw || raw === 'false' || raw === '0') return false;
  if (raw === 'true') return 'loopback'; // never boolean-true — see above
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  const list = asList(raw);
  return list.length > 1 ? list : raw;
}

/** Human line for the boot banner. */
export function trustProxyBanner() {
  const v = trustProxyValue();
  if (v === false) return null;
  return `[edge] TRUST_PROXY=${JSON.stringify(v)} — req.ip/req.protocol come from X-Forwarded-* on trusted hops.`;
}

/**
 * EDGE GUARD — "did this request actually come through our Worker?"
 *
 * The tunnel hostname (origin.example.com) is a real public DNS name. Anyone
 * who learns it can skip the Worker and hit the origin directly, arriving with
 * whatever CF-Connecting-IP / CF-IPCountry they feel like inventing — which is
 * exactly the input headerCheck and cgen trust. So the Worker signs every
 * request it forwards with a shared secret header, and this refuses anything
 * that lacks it.
 *
 * EDGE_SECRET unset  → guard disabled (no secret = no gate that can validate;
 *                      say so loudly at boot rather than pretend to be closed)
 * EDGE_SECRET set    → header must match, exactly, or 403
 *
 * Exempt: EDGE_GUARD_OPEN_PATHS (default /healthz) — the tunnel's own health
 * probe has no worker in front of it.
 */
export function createEdgeGuard({
  secret = process.env.EDGE_SECRET,
  headerName = (process.env.EDGE_SECRET_HEADER || 'x-edge-secret').toLowerCase(),
  openPaths = asList(process.env.EDGE_GUARD_OPEN_PATHS || '/healthz'),
} = {}) {
  if (!secret) {
    return function edgeGuardDisabled(req, _res, next) {
      req.edgeVerified = false;
      next();
    };
  }
  const expected = Buffer.from(String(secret));
  return function edgeGuard(req, res, next) {
    if (openPaths.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
      req.edgeVerified = false;
      return next();
    }
    const got = typeof req.headers[headerName] === 'string'
      ? Buffer.from(req.headers[headerName])
      : Buffer.alloc(0);
    // Length-first compare keeps the timing signal to "right length or not",
    // which is not a secret. Node's timingSafeEqual throws on length mismatch.
    if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) {
      return res.status(403).json({
        status: 'rejected',
        reason: 'Direct origin access denied — request must arrive through the edge',
      });
    }
    req.edgeVerified = true;
    next();
  };
}

/**
 * EDGE CONTEXT — resolve the caller's real identity once, from the edge
 * headers, and hang it off req so every downstream gate reads the same values.
 *
 * Only meaningful after the guard: these headers are trustworthy because the
 * guard proved the hop, not because the header name starts with CF-.
 */
export function edgeContext(req, res, next) {
  const verified = req.edgeVerified === true;
  req.edge = {
    verified,
    ip: verified
      ? req.headers['cf-connecting-ip'] ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        'unknown'
      : req.ip || req.socket?.remoteAddress || 'unknown',
    country: verified
      ? req.headers['cf-ipcountry'] || req.headers['x-verified-country'] || null
      : null,
    ray: verified ? req.headers['cf-ray'] || null : null,
    requestId: verified
      ? req.headers['x-request-id'] || req.headers['cf-ray'] || null
      : null,
    viaWorker: verified && req.headers['x-edge-worker'] === '1',
    proto: verified ? req.headers['x-forwarded-proto'] || req.protocol : req.protocol,
  };
  // Echo the id back so a failing request can be found in the worker log, the
  // cloudflared log and access.log with one grep.
  if (req.edge.requestId) res.setHeader('X-Request-Id', req.edge.requestId);
  next();
}

/**
 * Are we serving over HTTPS as far as the BROWSER is concerned?
 * cloudflared speaks http to the origin, so req.protocol lies unless trust
 * proxy is on. Cookies must key their `secure` flag off this, not off a mode
 * variable — a server behind the tunnel is on HTTPS publicly whatever MODE or
 * NODE_ENV says, and a `secure:false` cookie on an HTTPS page is a downgrade.
 */
export function cookieSecureEnabled() {
  const raw = (process.env.COOKIE_SECURE || '').trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // auto: secure when the public hop is TLS (tunnel/worker) or in the repo's
  // production mode. MODE, not NODE_ENV: NODE_ENV belongs to the ecosystem
  // (express, vite and wrangler all set it) and this repo no longer reads it.
  // See Backend/mode.js.
  return trustProxyValue() !== false || isProduction();
}

/**
 * SameSite for the visitor cookies. 'strict' breaks nothing today (same-origin
 * SPA) and stays the default; expose the knob because the moment the SPA is
 * served from a DIFFERENT hostname than the API, strict cookies stop being
 * sent and the whole cookie chain silently dies.
 */
export function cookieSameSite() {
  const raw = (process.env.COOKIE_SAMESITE || '').trim().toLowerCase();
  return ['strict', 'lax', 'none'].includes(raw) ? raw : 'strict';
}

/**
 * Boot banner for cookie flags that have been weakened below what this MODE
 * would otherwise pick.
 *
 * The shipped .env sets COOKIE_SECURE=false *and* MODE=production, because the
 * preproduction artifact is expected to be exercised over plain HTTP on
 * localhost — auto mode would return true there and the whole cookie chain
 * would silently stop working. That combination is legitimate, and it is also
 * exactly how a production deployment ends up serving Secure-less cookies over
 * HTTPS: the override is honoured, nothing objects, and the downgrade is
 * invisible.
 *
 * So the override stays honoured (forcing it closed would break the documented
 * local run) and is announced instead — the same thing edge.js already does for
 * a missing EDGE_SECRET, and devbypass.js for an ignored DEV_BYPASS_* flag.
 */
export function cookieSecurityBanner() {
  const lines = [];
  const explicitSecure = (process.env.COOKIE_SECURE || '').trim();
  if (isProduction() && explicitSecure === 'false') {
    lines.push(
      '[security] COOKIE_SECURE=false in production MODE — session and identity ' +
        'cookies are sent WITHOUT the Secure flag. Correct for a plain-HTTP ' +
        'preproduction run; a credential downgrade on any HTTPS host. ' +
        'Set COOKIE_SECURE=true (or unset it to auto-detect) before publishing.',
    );
  }
  if (cookieSameSite() !== 'strict') {
    lines.push(
      `[security] COOKIE_SAMESITE=${cookieSameSite()} — weaker than the 'strict' ` +
        'default. A cross-site top-level navigation will carry these cookies.',
    );
  }
  return lines.length ? lines.join('\n') : null;
}
