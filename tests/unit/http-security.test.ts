import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getJson, ProviderError, retryAfterSeconds, resetHttpState } from '../../src/backend/src/modules/intelligence/http';
import { jwtSecret, validateConfig } from '../../src/backend/src/shared/config';
it('parses Retry-After seconds/dates with safe bounded defaults', () => {
  assert.equal(retryAfterSeconds('120'), 120);
  assert.equal(retryAfterSeconds('Tue, 06 Oct 2026 10:02:00 GMT', Date.parse('2026-10-06T10:00:00Z')), 120);
  assert.equal(retryAfterSeconds('invalid'), 60);
  assert.equal(retryAfterSeconds(null), 60);
  assert.equal(retryAfterSeconds('999999999999'), 604800);
});
it('refuses arbitrary hosts and non-HTTPS URLs before fetch', async () => {
  for (const url of ['http://api.shodan.io/test','https://evil.example.com/test','https://user:password@api.shodan.io/test']) {
    await assert.rejects(getJson('SHODAN', new URL(url), {}, new AbortController().signal), ProviderError);
  }
});
it('requires explicit JWT secret and valid configuration', () => {
  const original = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET; assert.throws(jwtSecret);
    process.env.JWT_SECRET = 'short'; assert.throws(jwtSecret);
    process.env.JWT_SECRET = 'test-only-credential-with-over-32-characters'; assert.equal(jwtSecret(), process.env.JWT_SECRET);
    process.env.EXTERNAL_API_MAX_RETRIES = '50'; assert.throws(validateConfig);
  } finally { if (original === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original; delete process.env.EXTERNAL_API_MAX_RETRIES; }
});
it('aborts stalled response bodies and refuses cross-host redirects', async () => {
  const native = globalThis.fetch;
  process.env.TEST_MIN_INTERVAL_MS = '0'; process.env.EXTERNAL_API_TIMEOUT_MS = '20';
  try {
    let cancelled = false;
    globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
      start(controller) { init!.signal!.addEventListener('abort', () => { cancelled = true; controller.error(new Error('aborted')); }, { once: true }); },
    }), { headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(getJson('TEST', new URL('https://api.shodan.io/test'), {}, new AbortController().signal), (error: unknown) => error instanceof ProviderError && error.status === 'timeout');
    assert.equal(cancelled, true);
    globalThis.fetch = async (_input, init) => { assert.equal(init?.redirect, 'error'); return new Response('', { status: 302, headers: { Location: 'https://evil.example.com' } }); };
    await assert.rejects(getJson('TEST', new URL('https://api.shodan.io/test'), {}, new AbortController().signal), ProviderError);
  } finally { globalThis.fetch = native; delete process.env.TEST_MIN_INTERVAL_MS; delete process.env.EXTERNAL_API_TIMEOUT_MS; resetHttpState(); }
});
