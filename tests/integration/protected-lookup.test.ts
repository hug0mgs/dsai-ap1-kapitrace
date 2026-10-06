import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, loginTestUser, withBearer, prisma, type TestServer } from '../test-helper';
import { calls, resetFixtures } from '../http-fixtures';
import { resetHttpState } from '../../src/backend/src/modules/intelligence/http';
import { signTestJwt, testClaims } from '../jwt-fixtures';
describe('Protected Lookup: authentication before validation, cache and providers', () => {
  let server: TestServer;
  let lookup: TestServer['fetch'];
  before(async () => { server = await startTestServer(); lookup = withBearer(server, await loginTestUser(server)); });
  after(async () => { await server.close(); });
  beforeEach(() => { resetFixtures(); resetHttpState(); });
  it('requires a token on every lookup route and does not create cache', async () => {
    for (const path of ['/api/lookup/ip/8.8.8.8','/api/lookup/domain/auth-required.example.com','/api/lookup/hash/'+'a'.repeat(64),'/api/lookup/ip/invalid']) {
      const response = await server.fetch(path);
      assert.equal(response.status, 401); assert.equal(response.headers.get('www-authenticate'), 'Bearer');
    }
    assert.equal(calls.length, 0);
    assert.equal(await prisma.domainCache.findUnique({ where: { domain: 'auth-required.example.com' } }), null);
  });
  it('rejects invalid, expired, wrongly signed and incomplete tokens before external HTTP', async () => {
    const now = Math.floor(Date.now()/1000);
    const invalid = [
      'not-a-token',
      signTestJwt(testClaims({ iat: now-120, exp: now-60 }), process.env.JWT_SECRET!),
      signTestJwt(testClaims(), 'test-only-different-signing-key-2026'),
      signTestJwt(testClaims({ id: '' }), process.env.JWT_SECRET!),
    ];
    for (const token of invalid) {
      const response = await server.fetch('/api/lookup/domain/rejected.example.com', { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: 'Authentication required. Token missing, expired or invalid.' });
    }
    assert.equal(calls.length, 0);
    assert.equal(await prisma.domainCache.findUnique({ where: { domain: 'rejected.example.com' } }), null);
  });
  it('permits real-login JWT MISS/HIT, and refuses unauthenticated cache access', async () => {
    const path = '/api/lookup/domain/authorized.example.com';
    const first = await lookup(path); assert.equal(first.status, 200);
    const miss = await first.json(); assert.equal(miss.source, 'api'); assert.equal(miss.threatScore, 80);
    const count = calls.length;
    const anonymous = await server.fetch(path); assert.equal(anonymous.status, 401); assert.equal(calls.length, count);
    const hit = await lookup(path); assert.equal(hit.status, 200);
    const body = await hit.json(); assert.equal(body.source, 'cache'); assert.equal(body.threatScore, miss.threatScore); assert.equal(calls.length, count);
  });
});
