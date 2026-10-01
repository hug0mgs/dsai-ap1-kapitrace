import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { startTestServer, TestServer } from '../test-helper';

describe('Integration Tests: Authentication Module (/api/auth)', () => {
  let server: TestServer;
  const testEmail = `analyst_${Date.now()}@kapitrace.sec`;
  const testPassword = 'StrongSecurityPassword123!';
  let authToken = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = await startTestServer();
  });

  after(async () => {
    if (server) {
      await server.close();
    }
  });

  it('should successfully register a new security analyst user', async () => {
    const res = await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Lead Threat Analyst',
        role: 'analyst'
      })
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.message, 'User created successfully');
    assert.ok(body.userId, 'Expected user id to be returned');
  });

  it('should reject duplicate user registration with status 400', async () => {
    const res = await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Duplicate Attempt'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, 'User already exists');
  });

  it('should reject registration with invalid email or weak password', async () => {
    // 1. Invalid email
    const badEmailRes = await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: testPassword
      })
    });
    assert.strictEqual(badEmailRes.status, 400);

    // 2. Weak password (< 8 chars)
    const weakPassRes = await server.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `valid_${Date.now()}@test.com`,
        password: 'short'
      })
    });
    assert.strictEqual(weakPassRes.status, 400);
  });

  it('should authenticate user and return JWT session token on valid login', async () => {
    const res = await server.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.token, 'Expected JWT token in response');
    assert.strictEqual(body.user.email, testEmail);
    assert.strictEqual(body.user.role, 'analyst');

    authToken = body.token;
  });

  it('should reject login attempt with incorrect credentials', async () => {
    const res = await server.fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!'
      })
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error, 'Invalid credentials');
  });

  it('should renew and refresh token via /api/auth/refresh when authenticated', async () => {
    assert.ok(authToken, 'Auth token should exist from previous login test');

    const res = await server.fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.token, 'Expected renewed JWT token');
    assert.strictEqual(body.user.email, testEmail);
  });

  it('should reject token refresh with status 401 when no token is provided', async () => {
    const res = await server.fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    assert.strictEqual(res.status, 401);
  });
});
