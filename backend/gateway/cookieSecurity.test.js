import test from 'node:test';
import assert from 'node:assert/strict';
import { cookieSecurityBanner, cookieSecureEnabled, cookieSameSite } from './edge.js';

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('production with COOKIE_SECURE=false is announced, not silently honoured', () => {
  withEnv({ MODE: 'production', COOKIE_SECURE: 'false', COOKIE_SAMESITE: 'strict' }, () => {
    // The override still applies — forcing it closed would break the
    // documented plain-HTTP preproduction run.
    assert.equal(cookieSecureEnabled(), false);
    const banner = cookieSecurityBanner();
    assert.match(banner, /COOKIE_SECURE=false/);
    assert.match(banner, /without the Secure flag/i);
    assert.match(banner, /before publishing/i);
  });
});

test('production with Secure cookies says nothing', () => {
  withEnv({ MODE: 'production', COOKIE_SECURE: 'true', COOKIE_SAMESITE: 'strict' }, () => {
    assert.equal(cookieSecureEnabled(), true);
    assert.equal(cookieSecurityBanner(), null);
  });
});

test('development with COOKIE_SECURE=false is not flagged', () => {
  withEnv({ MODE: 'development', COOKIE_SECURE: 'false', COOKIE_SAMESITE: 'strict' }, () => {
    assert.equal(cookieSecurityBanner(), null);
  });
});

test('auto mode keeps Secure on in production and behind a trusted proxy', () => {
  withEnv({ MODE: 'production', COOKIE_SECURE: undefined, TRUST_PROXY: undefined }, () => {
    assert.equal(cookieSecureEnabled(), true);
  });
  withEnv({ MODE: 'development', COOKIE_SECURE: undefined, TRUST_PROXY: 'loopback' }, () => {
    assert.equal(cookieSecureEnabled(), true);
  });
  withEnv({ MODE: 'development', COOKIE_SECURE: undefined, TRUST_PROXY: undefined }, () => {
    assert.equal(cookieSecureEnabled(), false);
  });
});

test('a weakened SameSite is announced', () => {
  withEnv({ MODE: 'production', COOKIE_SECURE: 'true', COOKIE_SAMESITE: 'lax' }, () => {
    assert.equal(cookieSameSite(), 'lax');
    assert.match(cookieSecurityBanner(), /COOKIE_SAMESITE=lax/);
  });
  withEnv({ MODE: 'production', COOKIE_SECURE: 'true', COOKIE_SAMESITE: 'nonsense' }, () => {
    assert.equal(cookieSameSite(), 'strict');
    assert.equal(cookieSecurityBanner(), null);
  });
});
