import {
  sessionBypassEnabled,
  agentUploadEnabled,
  headerBypassEnabled,
  ipBypassEnabled,
} from './devbypass.js';

export function headerCheck(req, res, next) {
  // DEV_BYPASS_SESSION: open the gate for automated clients (curl) in dev.
  // ALLOW_AGENT_UPLOAD: same opening, as the all-gates master.
  // Trusted-IP resolution still runs — everything downstream expects it.
  if (sessionBypassEnabled(req) || agentUploadEnabled(req)) {
    req.trustedIp =
      req.edge?.ip || req.ip || req.socket?.remoteAddress || 'unknown';
    return next();
  }
  const userAgent = req.headers['user-agent'];
  if (!userAgent || typeof userAgent !== 'string' || userAgent.length < 5) {
    return res
      .status(400)
      .json({ status: 'rejected', reason: 'Missing or invalid User-Agent' });
  }
  const botPattern = /curl|wget|python|scrapy|bot|crawler|spider|headless/i;
  if (botPattern.test(userAgent)) {
    return res
      .status(403)
      .json({ status: 'rejected', reason: 'Automated access denied' });
  }
  req.trustedIp =
    req.edge?.ip || req.ip || req.socket?.remoteAddress || 'unknown';
  // headerBypassEnabled fails closed unless MODE=development — a stray
  // DEV_BYPASS_HEADER=true in a shipped .env is inert, not an open country gate.
  const bypassHeader = headerBypassEnabled(req);
  const bypassIp = ipBypassEnabled() ? process.env.DEV_BYPASS_IP || '' : '';
  // Behind the tunnel the SOCKET address is always loopback (cloudflared runs
  // on this machine), so matching DEV_BYPASS_IP against it can never hit. Use
  // the edge-resolved address when the request came through the worker —
  // req.edge.ip is only trustworthy because the edge guard already proved the
  // hop. Direct runs keep the socket address, unchanged.
  const reqIp = req.edge?.viaWorker
    ? req.edge.ip
    : req.socket?.remoteAddress || '';
  const isBypassIp =
    bypassIp && (reqIp === bypassIp || reqIp === '::ffff:' + bypassIp);
  // Country enforcement needs a provider authenticated by EDGE_SECRET. This
  // preproduction Site has no Cloudflare Worker, so it is opt-in instead of
  // rejecting direct browsers. Never trust client-supplied geo headers.
  const requireMyanmar = process.env.REQUIRE_MM_COUNTRY === 'true';
  if (requireMyanmar && !bypassHeader && !isBypassIp) {
    const country = req.edge?.country;
    if (country !== 'MM') {
      return res
        .status(403)
        .json({ status: 'rejected', reason: 'Access restricted to Myanmar' });
    }
  }
  next();
}
