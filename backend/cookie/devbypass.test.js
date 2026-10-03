import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bypassIpMatches,
  sessionBypassEnabled,
  agentUploadEnabled,
  quotaBypassEnabled,
  headerBypassEnabled,
  sessionBypassArmed,
  agentUploadArmed,
  agentUploadBanner,
  bypassesAllowed,
  ipBypassEnabled,
} from './devbypass.js';

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try { return fn(); } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}
const reqFrom = (ip, extra = {}) => ({ ip, socket: { remoteAddress: ip }, ...extra });
const DEV = { MODE: 'development', DEV_BYPASS_IP: '127.0.0.1' };

test('a bypass is inert until DEV_BYPASS_IP pairs a caller', () => {
  withEnv({ MODE: 'development', DEV_BYPASS_IP: undefined, ALLOW_AGENT_UPLOAD: 'true' }, () => {
    assert.equal(agentUploadArmed(), true, 'the flag is armed');
    assert.equal(agentUploadEnabled(reqFrom('127.0.0.1')), false, 'but nobody is paired');
    assert.match(agentUploadBanner(), /INERT/);
  });
});

test('only the paired address gets through', () => {
  withEnv({ ...DEV, ALLOW_AGENT_UPLOAD: 'true' }, () => {
    assert.equal(agentUploadEnabled(reqFrom('127.0.0.1')), true);
    assert.equal(agentUploadEnabled(reqFrom('::ffff:127.0.0.1')), true, 'IPv4-mapped IPv6');
    assert.equal(agentUploadEnabled(reqFrom('203.0.113.9')), false, 'anyone else');
    assert.equal(agentUploadEnabled(undefined), false, 'no request at all');
  });
});

test('production ignores every flag, paired or not', () => {
  withEnv({
    MODE: 'production', DEV_BYPASS_IP: '127.0.0.1',
    ALLOW_AGENT_UPLOAD: 'true', DEV_BYPASS_SESSION: 'true',
    DEV_BYPASS_QUOTA: 'true', DEV_BYPASS_HEADER: 'true',
  }, () => {
    const req = reqFrom('127.0.0.1');
    assert.equal(agentUploadEnabled(req), false);
    assert.equal(sessionBypassEnabled(req), false);
    assert.equal(quotaBypassEnabled(req), false);
    assert.equal(headerBypassEnabled(req), false);
    assert.equal(sessionBypassArmed(), false);
  });
});

test('ALLOW_AGENT_UPLOAD does NOT turn the quota off', () => {
  withEnv({ ...DEV, ALLOW_AGENT_UPLOAD: 'true', DEV_BYPASS_QUOTA: undefined }, () => {
    const req = reqFrom('127.0.0.1');
    assert.equal(agentUploadEnabled(req), true, 'header + cookie gates open');
    assert.equal(quotaBypassEnabled(req), false, 'but the limit stays on, so it can be tested');
  });
  withEnv({ ...DEV, ALLOW_AGENT_UPLOAD: 'true', DEV_BYPASS_QUOTA: 'true' }, () => {
    assert.equal(quotaBypassEnabled(reqFrom('127.0.0.1')), true, 'explicit opt-out still works');
  });
});

test('behind a verified worker the edge address is what pairs', () => {
  withEnv({ MODE: 'development', DEV_BYPASS_IP: '203.0.113.9', ALLOW_AGENT_UPLOAD: 'true' }, () => {
    const viaWorker = { ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' },
      edge: { viaWorker: true, ip: '203.0.113.9' } };
    assert.equal(bypassIpMatches(viaWorker), true, 'the real client, not the tunnel');
    const spoofed = { ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' },
      edge: { viaWorker: false, ip: '203.0.113.9' } };
    assert.equal(bypassIpMatches(spoofed), false, 'unverified edge headers are not trusted');
  });
});

test('MODE=production overrides every flag, every combination, paired or not', () => {
  const FLAGS = ['ALLOW_AGENT_UPLOAD', 'DEV_BYPASS_SESSION', 'DEV_BYPASS_QUOTA', 'DEV_BYPASS_HEADER'];
  // Every subset of the flags, crossed with paired / unpaired / unset IP.
  for (let mask = 0; mask < 1 << FLAGS.length; mask++) {
    const env = { MODE: 'production' };
    FLAGS.forEach((f, i) => { env[f] = mask & (1 << i) ? 'true' : undefined; });
    for (const ip of ['127.0.0.1', '203.0.113.9', undefined]) {
      withEnv({ ...env, DEV_BYPASS_IP: ip }, () => {
        const req = reqFrom('127.0.0.1');
        const where = `mask=${mask} ip=${ip}`;
        assert.equal(bypassesAllowed(), false, where);
        assert.equal(agentUploadEnabled(req), false, where);
        assert.equal(sessionBypassEnabled(req), false, where);
        assert.equal(quotaBypassEnabled(req), false, where);
        assert.equal(headerBypassEnabled(req), false, where);
        assert.equal(ipBypassEnabled(), false, where);
        assert.equal(bypassIpMatches(req), false, where);
        assert.equal(agentUploadArmed(), false, where);
        assert.equal(sessionBypassArmed(), false, where);
      });
    }
  }
});

test('an unset or unrecognised MODE is production, so it also closes everything', () => {
  for (const mode of [undefined, '', 'prod', 'Production ', 'dev', '0', 'DEVELOPMENT ']) {
    withEnv({ MODE: mode, ALLOW_AGENT_UPLOAD: 'true', DEV_BYPASS_IP: '127.0.0.1' }, () => {
      const open = agentUploadEnabled(reqFrom('127.0.0.1'));
      // Only the exact, trimmed, lower-cased 'development' may open anything.
      const expected = String(mode ?? '').trim().toLowerCase() === 'development';
      assert.equal(open, expected, `MODE=${JSON.stringify(mode)}`);
    });
  }
});

test('DEV_BYPASS_IP on its own grants nothing — it only pairs', () => {
  withEnv({ MODE: 'development', DEV_BYPASS_IP: '127.0.0.1',
    ALLOW_AGENT_UPLOAD: undefined, DEV_BYPASS_SESSION: undefined,
    DEV_BYPASS_QUOTA: undefined, DEV_BYPASS_HEADER: undefined }, () => {
    const req = reqFrom('127.0.0.1');
    assert.equal(bypassIpMatches(req), true, 'the address is paired');
    assert.equal(agentUploadEnabled(req), false, 'but no flag is set');
    assert.equal(sessionBypassEnabled(req), false);
    assert.equal(quotaBypassEnabled(req), false);
    assert.equal(headerBypassEnabled(req), false);
  });
});
