import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startTestServer, TestServer } from '../test-helper';

describe('Integration Tests: Watchlist Management (/api/watchlist)', () => {
  let server: TestServer;
  let user1Token = '';
  let user2Token = '';
  let createdItemId = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = await startTestServer();

    // 1. Create User 1 & Login
    const user1Email = `analyst1_${Date.now()}@kapitrace.sec`;
    await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'Password123!', name: 'Analyst One' })
    });
    const login1Res = await server.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user1Email, password: 'Password123!' })
    });
    const login1Data = await login1Res.json();
    user1Token = login1Data.token;

    // 2. Create User 2 & Login
    const user2Email = `analyst2_${Date.now()}@kapitrace.sec`;
    await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2Email, password: 'Password123!', name: 'Analyst Two' })
    });
    const login2Res = await server.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user2Email, password: 'Password123!' })
    });
    const login2Data = await login2Res.json();
    user2Token = login2Data.token;
  });

  after(async () => {
    if (server) {
      await server.close();
    }
  });

  it('should block unauthenticated access to watchlist with HTTP 401', async () => {
    const getRes = await server.fetch('/api/watchlist');
    assert.strictEqual(getRes.status, 401);

    const postRes = await server.fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemValue: '198.51.100.1', itemType: 'ip' })
    });
    assert.strictEqual(postRes.status, 401);
  });

  it('should allow authenticated analyst to add a monitored indicator to watchlist', async () => {
    const res = await server.fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        itemValue: 'malicious-c2-botnet.org',
        itemType: 'domain'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.ok(body.id, 'Expected id for created watchlist item');
    assert.strictEqual(body.itemValue, 'malicious-c2-botnet.org');
    assert.strictEqual(body.itemType, 'domain');

    createdItemId = body.id;
  });

  it('should reject adding invalid indicator formats to watchlist', async () => {
    const res = await server.fetch('/api/watchlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`
      },
      body: JSON.stringify({
        itemValue: 'invalid..domain',
        itemType: 'domain'
      })
    });

    assert.strictEqual(res.status, 400);
  });

  it('should list all watchlist items belonging to authenticated user', async () => {
    const res = await server.fetch('/api/watchlist', {
      headers: {
        Authorization: `Bearer ${user1Token}`
      }
    });

    assert.strictEqual(res.status, 200);
    const items = await res.json();
    assert.ok(Array.isArray(items));
    const found = items.find((i: any) => i.id === createdItemId);
    assert.ok(found, 'Created item should be present in user watchlist');
  });

  it('should prevent User 2 from deleting an item owned by User 1', async () => {
    const res = await server.fetch(`/api/watchlist/${createdItemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user2Token}` // User 2 trying to delete User 1's item
      }
    });

    assert.strictEqual(res.status, 404);
  });

  it('should allow User 1 to delete their own watchlist item', async () => {
    const res = await server.fetch(`/api/watchlist/${createdItemId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${user1Token}`
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.message, 'Removed successfully');

    // Confirm deletion
    const listRes = await server.fetch('/api/watchlist', {
      headers: { Authorization: `Bearer ${user1Token}` }
    });
    const list = await listRes.json();
    assert.strictEqual(list.some((i: any) => i.id === createdItemId), false);
  });
});
