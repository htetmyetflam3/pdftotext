// FILE: Server/cookie/devbypass.js
//
// TEMPORARY, DEVELOPMENT-ONLY bypass for the cookie + session gate.
//
// Why this exists
// ───────────────
// The /api stack is deliberately hostile to curl. Three separate gates stop it:
//
//   1. headerCheck    — rejects any bot-shaped User-Agent (curl|wget|python|…)
//   2. cookieGenerator— needs the DB to upsert the visitor row
//   3. cookieDBCheck  — needs a real userData cookie AND a matching users row
//
// DEV_BYPASS_QUOTA already makes the whole request/quota layer DB-free, and
// DEV_BYPASS_IP/DEV_BYPASS_HEADER cover the IP and country checks — but nothing
// opens gate 1 or gate 3, so an agent testing an upload over curl gets a 403
// before a single byte of the pipeline runs.
//
// DEV_BYPASS_SESSION opens exactly those two gates and nothing else.
//
// What it does NOT do
// ───────────────────
// It does not fabricate an anonymous identity when a real one is available:
// the cookie is still generated, decoded and carried, and the session id is
// still minted by express-session. The gate stops *rejecting*; it does not stop
// *working*. Everything downstream (visitorHash, session id, userId) receives a
// real value, so anything derived from those three later behaves the same as it
// does for a browser.
//
// PRODUCTION
// ──────────
// This can never be on in production. enabled() hard-returns false unless the
// repo's OWN switch says development — `MODE=development` (Backend/mode.js) —
// so shipping a stray DEV_BYPASS_SESSION=true in a live .env is inert, not a
// hole. index.js prints a loud warning at boot in both cases (on in dev /
// ignored in prod).
//
// NODE_ENV IS NOT THE SWITCH. It used to be, and that was the bug: NODE_ENV
// belongs to the whole Node ecosystem, Cloudflare's tooling sets it too, and
// dotenv does not override a shell-exported value — so a wrangler command in the
// same shell, or a line in a shared .env, could flip this repo's gates. MODE is
// ours alone; NODE_ENV is ignored here in both directions.
//
// MASTER SWITCH
// ─────────────
// ALLOW_AGENT_UPLOAD=true opens every gate at once — headerCheck (bot UAs
// included), cookieGenerator's visitor upsert, cookieDBCheck's cookie→users
// lookup, the MemoryStore session, the request/quota layer, and the hidden
// raw disk-resolve. It duplicates today's all-flags-on behavior in one flag
// for agents, and like SESSION it fail-closes unless MODE=development.
// The specific DEV_BYPASS_* flags are untouched and independent: each opens
// only its own layer, so one layer (e.g. quota) can be tested with the rest
// still enforced. Separate checks, not a single fraud system.

import { isProduction, modeLabel } from '../mode.js';

const FLAG = 'DEV_BYPASS_SESSION';
const MASTER = 'ALLOW_AGENT_UPLOAD';

/**
 * DEV_BYPASS_IP — the pairing key for every bypass in this file.
 *
 * A bypass is a hole in the security gates. Process-wide, it is open to
 * whoever reaches the port. Paired to an address it is open to ONE caller:
 * the agent working on the box. Everyone else walks the full chain, so a
 * developer can keep a browser session honest in the same process that an
 * agent is driving over curl.
 *
 * Unset = no pairing is possible = every bypass stays shut. That is the
 * fail-closed direction, and it matches how the MODE guard already behaves.
 */
export function bypassIp() {
  if (!bypassesAllowed()) return '';        // production pairs nobody
  return String(process.env.DEV_BYPASS_IP || '').trim();
}

/** Strip the IPv4-mapped IPv6 prefix so ::ffff:127.0.0.1 === 127.0.0.1. */
const normaliseIp = (value) => String(value || '').replace(/^::ffff:/i, '');

/**
 * Did this request come from the paired address?
 *
 * Behind the worker the socket is always loopback (cloudflared runs here), so
 * the edge-resolved address is used — and only when the edge guard already
 * proved the hop. A direct run compares the socket address, unchanged.
 */
export function bypassIpMatches(req) {
  const allowed = normaliseIp(bypassIp());
  if (!allowed) return false;
  // Exactly the rule headerCheck already uses, and for the same reason: the
  // edge-resolved address counts ONLY once the edge guard proved the hop
  // (viaWorker). Otherwise the socket address is the only thing a caller
  // cannot choose — not req.ip, which follows `trust proxy` and can therefore
  // be steered by X-Forwarded-For, and not req.edge.ip, which is only as good
  // as the verification behind it.
  const observed = req?.edge?.viaWorker ? req.edge.ip : req?.socket?.remoteAddress;
  return Boolean(observed) && normaliseIp(observed) === allowed;
}

/**
 * THE MASTER OVERRIDE.
 *
 * Every bypass in this repo passes through here first. MODE=production — or
 * MODE unset, or MODE set to anything unrecognised, which mode.js resolves to
 * production — closes all of them, whatever DEV_BYPASS_IP says and whatever
 * any individual flag is set to. There is no flag, no address and no
 * combination that reopens them.
 *
 * It is a single function rather than a repeated `if (isProduction())` so a
 * bypass added later cannot forget the guard: it has to come through this door
 * to exist at all.
 */
export function bypassesAllowed() {
  return !isProduction();                   // MODE, never NODE_ENV
}

/** A flag is live when MODE allows it, it is set, and the caller is paired. */
function flagLive(name, req) {
  if (!bypassesAllowed()) return false;
  if (process.env[name] !== 'true') return false;
  return bypassIpMatches(req);
}

/** Set, and MODE allows it — but says nothing about the caller's address. */
function flagArmed(name) {
  return bypassesAllowed() && process.env[name] === 'true';
}

/**
 * Is the cookie+session bypass live FOR THIS REQUEST?
 *
 * Takes the request because the answer is per-caller now: the flag arms the
 * bypass, DEV_BYPASS_IP decides who gets it.
 */
export function sessionBypassEnabled(req) {
  return flagLive(FLAG, req);
}

/** Armed but unpaired: the flag is set and MODE allows it, no address given. */
export function sessionBypassArmed() {
  return flagArmed(FLAG);
}

/** True when the flag was set but is being ignored because this is production. */
export function sessionBypassIgnored() {
  return isProduction() && process.env[FLAG] === 'true';
}

/**
 * DEV_BYPASS_HEADER — opens headerCheck's IP/country gate. Never in production.
 *
 * SESSION and the ALLOW_AGENT_UPLOAD master already fail closed when the repo
 * is not in development mode, but HEADER and QUOTA were raw `=== 'true'` reads
 * scattered across four files with no such guard. A .env carried from a dev
 * box to a real server therefore kept the country gate and the whole quota
 * layer disabled — silently, because nothing said so at boot. These two
 * helpers give them the same fail-closed shape as the other flags, so
 * "flags on" can never mean "gates off in production".
 */
export function headerBypassEnabled(req) {
  return flagLive('DEV_BYPASS_HEADER', req);
}

/** True when DEV_BYPASS_HEADER was set but is being ignored (production). */
export function headerBypassIgnored() {
  return isProduction() && process.env.DEV_BYPASS_HEADER === 'true';
}

/**
 * Is an address paired at all?
 *
 * DEV_BYPASS_IP is ONLY the pairing key now — it decides *who* a flag applies
 * to, and grants nothing on its own. It used to double as a bypass in its own
 * right (cookieDBCheck handed any request from that address a fabricated
 * userId = 1), which stopped being tenable the moment every flag required the
 * variable to be set: pairing an agent would have silently opened an identity
 * hole that no flag asked for.
 */
export function ipBypassEnabled() {
  return Boolean(bypassIp());
}

/**
 * DEV_BYPASS_QUOTA — switch the limit OFF entirely. Never in production.
 *
 * ALLOW_AGENT_UPLOAD deliberately does NOT imply this. The master opens the
 * header and cookie gates so an agent can reach the upload at all; the limit
 * stays on so the agent can drive the real 3/day and the real 429. Turning
 * the limit off is a separate, explicit decision.
 */
export function quotaBypassEnabled(req) {
  return flagLive('DEV_BYPASS_QUOTA', req);
}

/** True when DEV_BYPASS_QUOTA was set but is being ignored (production). */
export function quotaBypassIgnored() {
  return isProduction() && process.env.DEV_BYPASS_QUOTA === 'true';
}

/**
 * The identity a bypassed request runs as.
 *
 * Prefers the identity cookieGenerator just built (req.cookieData) so the
 * request carries a real visitor uuid and a real session id; only falls back to
 * fixed dev constants when there is genuinely nothing to read.
 */
export function devIdentity(req) {
  const cookieData = req.cookieData || null;
  const visitorHash = cookieData?.userId || 'dev-bypass-visitor';

  // cookieGenerator upserted a real users row for this visitor before the gate
  // was skipped, so dbUserId is a genuine primary key, not a stand-in. The
  // bypass opens the gates; it does not invent an identity.
  return {
    userId: cookieData?.dbUserId ?? null,
    visitorHash,
    sessionId: req.sessionID || req.session?.id || null,
    user: {
      id: cookieData?.dbUserId ?? null,
      cookie_hash: visitorHash,
      t: Number(cookieData?.t) || 0,
    },
    cookieData: cookieData || {
      userId: visitorHash,
      timestamp: new Date().toISOString(),
    },
  };
}

/** One-line boot banner, or null when there is nothing to say. */
export function sessionBypassBanner() {
  if (sessionBypassIgnored()) {
    return `[devbypass] ${FLAG}=true IGNORED — ${modeLabel()}. Cookie/session gate is ENFORCED.`;
  }
  if (sessionBypassArmed()) {
    return bypassIp()
      ? `[devbypass] ${FLAG}=true — cookie/session gate OPEN for ${bypassIp()} only. Development only.`
      : `[devbypass] ${FLAG}=true INERT — DEV_BYPASS_IP is unset, so no caller is paired. Set DEV_BYPASS_IP to the agent's address.`;
  }
  return null;
}

/**
 * The agent master, for THIS request. Never true in production.
 *
 * Opens the header gate (bot User-Agents) and the cookie/identity gate. It
 * does NOT open the quota layer — see quotaBypassEnabled.
 */
export function agentUploadEnabled(req) {
  return flagLive(MASTER, req);
}

/** Armed but unpaired: set and MODE allows it, no address given. */
export function agentUploadArmed() {
  return flagArmed(MASTER);
}

/** True when the master was set but is being ignored (production). */
export function agentUploadIgnored() {
  return isProduction() && process.env[MASTER] === 'true';
}

/** One-line boot banner for the master, or null when silent. */
export function agentUploadBanner() {
  if (agentUploadIgnored()) {
    return `[devbypass] ${MASTER}=true IGNORED — ${modeLabel()}. Every gate is ENFORCED.`;
  }
  if (agentUploadArmed()) {
    return bypassIp()
      ? `[devbypass] ${MASTER}=true — header + cookie gates OPEN for ${bypassIp()} only. ` +
        'The daily quota stays ENFORCED (counted in the cookie) so it can be tested; ' +
        'add DEV_BYPASS_QUOTA=true to switch the limit off.'
      : `[devbypass] ${MASTER}=true INERT — DEV_BYPASS_IP is unset, so no caller is paired. Set DEV_BYPASS_IP to the agent's address.`;
  }
  return null;
}

/**
 * Banner for the two flags that previously had NO production guard.
 * Says so loudly in both directions: active in dev, ignored in production.
 */
export function gateBypassBanner() {
  const ignored = [];
  const active = [];
  if (headerBypassIgnored()) ignored.push('DEV_BYPASS_HEADER');
  else if (flagArmed('DEV_BYPASS_HEADER')) active.push('DEV_BYPASS_HEADER');
  if (quotaBypassIgnored()) ignored.push('DEV_BYPASS_QUOTA');
  else if (flagArmed('DEV_BYPASS_QUOTA')) active.push('DEV_BYPASS_QUOTA');

  const lines = [];
  if (ignored.length) {
    lines.push(
      `[devbypass] ${ignored.join(' + ')}=true IGNORED — ${modeLabel()}. Those gates are ENFORCED.`,
    );
  }
  if (active.length) {
    lines.push(
      bypassIp()
        ? `[devbypass] ${active.join(' + ')}=true — country/quota gate OPEN for ${bypassIp()} only.`
        : `[devbypass] ${active.join(' + ')}=true INERT — DEV_BYPASS_IP is unset, so no caller is paired.`,
    );
  }
  return lines.length ? lines.join('\n') : null;
}
