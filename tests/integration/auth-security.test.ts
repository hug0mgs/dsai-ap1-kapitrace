import { it } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../test-helper';
it('public registration cannot request admin privileges and invalid JWT returns 401', async () => {
  const server = await startTestServer();
  try {
    const credentials = { email: `no-admin-${Date.now()}@example.com`, password: 'TestOnlyPassword-2026!' };
    const registration = await server.fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...credentials, role: 'admin' }) });
    assert.equal(registration.status, 201);
    const login = await (await server.fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })).json();
    assert.equal(login.user.role, 'analyst');
    assert.equal((await server.fetch('/api/watchlist', { headers: { Authorization: 'Bearer not-a-token' } })).status, 401);
  } finally { await server.close(); }
});
