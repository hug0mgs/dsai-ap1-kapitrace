import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { calls } from '../http-fixtures';
import { startTestServer, loginTestUser, withBearer, TestServer } from '../test-helper';

describe('Integration Tests: Threat Lookup & Cache Validation (/api/lookup)', () => {
  let server: TestServer;
  let lookup: TestServer['fetch'];

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = await startTestServer();
    lookup = withBearer(server, await loginTestUser(server));
  });

  after(async () => {
    if (server) {
      await server.close();
    }
  });

  // Unique indicators to avoid collision with prior test runs
  const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const testDomain = `c2-threat-${Date.now()}.net`;
  const testHash = 'd41d8cd98f00b204e9800998ecf8427e';

  it('should return source: "api" (Cache MISS) on first lookup of an IP address', async () => {
    const res = await lookup(`/api/lookup/ip/${testIp}`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.source, 'api');
    assert.strictEqual(body.indicator, testIp);
    assert.strictEqual(body.type, 'ip');
    assert.ok(typeof body.threatScore === 'number');
    assert.ok(body.threatScore >= 0 && body.threatScore <= 100);
    assert.ok(body.analysis);
  });

  it('should return source: "cache" (Cache HIT) on subsequent lookup of the same IP', async () => {
    const count = calls.length;
    const res = await lookup(`/api/lookup/ip/${testIp}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(calls.length, count, 'Cache HIT must make zero external requests');

    const body = await res.json();
    assert.strictEqual(body.source, 'cache', 'Expected Cache HIT on second lookup');
    assert.strictEqual(body.indicator, testIp);
    assert.ok(body.cachedAt);
  });

  it('should perform domain lookup with Cache MISS then Cache HIT behavior', async () => {
    // 1. First call -> Cache MISS
    const resMiss = await lookup(`/api/lookup/domain/${testDomain}`);
    assert.strictEqual(resMiss.status, 200);
    const bodyMiss = await resMiss.json();
    assert.strictEqual(bodyMiss.source, 'api');
    assert.strictEqual(bodyMiss.indicator, testDomain);
    assert.strictEqual(bodyMiss.type, 'domain');

    // 2. Second call -> Cache HIT
    const resHit = await lookup(`/api/lookup/domain/${testDomain}`);
    assert.strictEqual(resHit.status, 200);
    const bodyHit = await resHit.json();
    assert.strictEqual(bodyHit.source, 'cache');
    assert.strictEqual(bodyHit.indicator, testDomain);
    assert.strictEqual(bodyHit.threatScore, bodyMiss.threatScore);
  });

  it('should perform cryptographic hash lookup with valid algorithm identification', async () => {
    const res = await lookup(`/api/lookup/hash/${testHash}`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.indicator, testHash);
    assert.strictEqual(body.type, 'hash');
    assert.ok(typeof body.threatScore === 'number');
  });

  it('should reject malformed IP addresses with HTTP 400 Bad Request', async () => {
    const badIps = ['999.1.2.3', '192.168.01.1', 'not-an-ip', '10.0.0.1.1'];

    for (const badIp of badIps) {
      const res = await lookup(`/api/lookup/ip/${badIp}`);
      assert.strictEqual(res.status, 400, `Expected 400 for IP "${badIp}"`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Validation Error');
    }
  });

  it('should reject malformed domain names with HTTP 400 Bad Request', async () => {
    const badDomains = ['-starts-with-hyphen.com', 'has..double-dots.org', 'no-tld'];

    for (const badDomain of badDomains) {
      const res = await lookup(`/api/lookup/domain/${badDomain}`);
      assert.strictEqual(res.status, 400, `Expected 400 for domain "${badDomain}"`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Validation Error');
    }
  });

  it('should reject invalid cryptographic hashes with HTTP 400 Bad Request', async () => {
    const badHashes = ['tooshort', 'd41d8cd98f00b204e9800998ecf8427z']; // Non-hex 'z'

    for (const badHash of badHashes) {
      const res = await lookup(`/api/lookup/hash/${badHash}`);
      assert.strictEqual(res.status, 400, `Expected 400 for hash "${badHash}"`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Validation Error');
    }
  });
});
