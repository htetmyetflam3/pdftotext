import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGINE_KEY_RE,
  checkEngineKey,
  engineConfig,
  createEngineDispatcher,
} from './engine.js';
const KEY = 'a'.repeat(32);
const META = {
  jobToken: 'b'.repeat(32),
  formId: 'form-1',
  submitId: 'submit-1',
  userId: 'user-1',
  sessionId: 'session-1',
  filename: 'stamp__doc.pdf',
  extension: 'txt',
  task: 'analysis',
  job: 'extracting-analysis',
};
test('engine configuration is read-only and optional', () => {
  const blank = engineConfig({});
  assert.equal(blank.jobUrl, '');
  assert.equal(blank.siteToEngineKey, '');
  assert.equal(blank.engineToSiteKey, '');
  assert.equal(blank.acceptTimeoutMs, 3000);
  assert.equal(blank.jobTimeoutMs, 120_000);
  const full = engineConfig({
    ENGINE_JOB_URL: 'https://engine.example/jobs',
    SITE_TO_ENGINE_KEY: KEY,
    ENGINE_TO_SITE_KEY: 'c'.repeat(32),
    ENGINE_ACCEPT_TIMEOUT_MS: '1500',
    ENGINE_JOB_TIMEOUT_MS: '45000',
  });
  assert.equal(full.jobUrl, 'https://engine.example/jobs');
  assert.equal(full.siteToEngineKey, KEY);
  assert.equal(full.engineToSiteKey, 'c'.repeat(32));
  assert.equal(full.acceptTimeoutMs, 1500);
  assert.equal(full.jobTimeoutMs, 45_000);
});
test('engine keys are 32 hex characters, checked by shape', () => {
  assert.equal(checkEngineKey(''), 'missing');
  assert.equal(checkEngineKey(null), 'missing');
  assert.equal(checkEngineKey(KEY), 'ok');
  assert.equal(checkEngineKey('xyz'), 'shape');
  assert.ok(ENGINE_KEY_RE.test(crypto16()));
  function crypto16() {
    return '0123456789abcdef0123456789abcdef';
  }
});
test('a blank ENGINE_JOB_URL keeps the dispatch dormant — never a socket', async () => {
  let calls = 0;
  const dispatcher = createEngineDispatcher({
    jobUrl: '',
    key: KEY,
    fetchImpl: async () => {
      calls += 1;
      throw new Error('must never be called');
    },
    log: () => {},
  });
  assert.equal(dispatcher.configured, false);
  const outcome = await dispatcher.dispatch(META);
  assert.equal(outcome.accepted, false);
  assert.equal(outcome.reason, 'engine-not-configured');
  assert.equal(calls, 0);
});
test('dispatch is metadata-only: allowlisted body, key header, accept-only', async () => {
  const seen = [];
  const dispatcher = createEngineDispatcher({
    jobUrl: 'https://engine.example/jobs',
    key: KEY,
    acceptTimeoutMs: 1000,
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return new Response('{}', { status: 200 });
    },
    log: () => {},
  });
  const dirty = {
    ...META,
    fileUrl: 'https://evil.example/file',
    path: '/etc/passwd',
    apiKey: 'leak',
    cookies: 'sessionid=secret',
    callbackUrl: 'https://evil.example/cb',
  };
  const outcome = await dispatcher.dispatch(dirty);
  assert.equal(outcome.accepted, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://engine.example/jobs');
  assert.equal(seen[0].init.method, 'POST');
  assert.equal(seen[0].init.headers['x-api-key'], KEY);
  assert.equal(seen[0].init.headers['Content-Type'], 'application/json');
  const keyHeaders = Object.keys(seen[0].init.headers).filter((name) => name.toLowerCase() === 'x-api-key');
  assert.equal(keyHeaders.length, 1);
  const body = JSON.parse(seen[0].init.body);
  assert.deepEqual(Object.keys(body).sort(), [
    'extension', 'filename', 'formId', 'job', 'jobToken', 'sessionId', 'submitId', 'task', 'userId',
  ]);
  assert.equal(body.jobToken, META.jobToken);
  assert.equal(body.formId, META.formId);
  const raw = seen[0].init.body;
  for (const needle of ['fileUrl', 'apiKey', 'cookies', 'callbackUrl', 'passwd', 'evil.example']) {
    assert.ok(!raw.includes(needle), `dispatch leaked ${needle}`);
  }
});
test('dispatch refusal and unreachable Engine resolve accepted:false', async () => {
  const refused = createEngineDispatcher({
    jobUrl: 'https://engine.example/jobs',
    key: KEY,
    fetchImpl: async () => new Response('no', { status: 403 }),
    log: () => {},
  });
  assert.deepEqual(await refused.dispatch(META), { accepted: false, status: 403 });
  const down = createEngineDispatcher({
    jobUrl: 'https://engine.example/jobs',
    key: KEY,
    fetchImpl: async () => {
      const error = new Error('fetch failed');
      error.cause = { code: 'ECONNREFUSED' };
      throw error;
    },
    log: () => {},
  });
  const outcome = await down.dispatch(META);
  assert.equal(outcome.accepted, false);
  assert.match(outcome.reason, /ECONNREFUSED/);
});
test('a badly shaped SITE_TO_ENGINE_KEY disables dispatch before any socket', async () => {
  let calls = 0;
  const dispatcher = createEngineDispatcher({
    jobUrl: 'https://engine.example/jobs',
    key: 'too-short',
    fetchImpl: async () => {
      calls += 1;
      return new Response('{}', { status: 200 });
    },
    log: () => {},
  });
  assert.equal((await dispatcher.dispatch(META)).accepted, false);
  assert.equal(calls, 0);
});