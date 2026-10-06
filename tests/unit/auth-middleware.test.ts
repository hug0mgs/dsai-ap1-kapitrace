import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import type { Response } from '../../src/backend/node_modules/@types/express';
import { authenticate, authorize, type AuthRequest } from '../../src/backend/src/middleware/auth';
import { identity, signTestJwt, testClaims } from '../jwt-fixtures';
const key = randomBytes(48).toString('hex');
process.env.JWT_SECRET = key;
function run(header?: string) {
  let nextCalls = 0;
  let status = 200;
  let body: unknown;
  const headers = new Map<string, string>();
  const req = { header: () => header, user: { ...identity, role: 'admin' } } as unknown as AuthRequest;
  const res = { setHeader(name: string, value: string) { headers.set(name, value); }, status(value: number) { status = value; return this; }, json(value: unknown) { body = value; return this; } } as unknown as Response;
  authenticate(req, res, () => { nextCalls++; });
  return { req, res, status, body, headers, nextCalls };
}
describe('authenticate: JWT validation and identity', () => {
  it('accepts only a valid token and calls next once with a typed identity', () => {
    const result = run(`bEaReR ${signTestJwt(testClaims(), key)}`);
    assert.equal(result.status, 200); assert.equal(result.nextCalls, 1); assert.deepEqual(result.req.user, identity);
  });
  it('rejects absent, malformed and oversized Bearer headers without next', () => {
    const token = signTestJwt(testClaims(), key);
    for (const header of [undefined, '', 'Bearer ', token, `Basic ${token}`, `Bearer ${token} extra`, `Bearer ${token},Bearer ${token}`, `Bearer ${'x'.repeat(8193)}`]) {
      const result = run(header);
      assert.equal(result.status, 401); assert.equal(result.nextCalls, 0); assert.equal(result.req.user, undefined); assert.equal(result.headers.get('WWW-Authenticate'), 'Bearer');
    }
  });
  it('rejects expired, future, unsigned, tampered and wrongly signed tokens', () => {
    const now = Math.floor(Date.now()/1000);
    const token = signTestJwt(testClaims(), key);
    const [header,,signature] = token.split('.');
    const altered = `${header}.${Buffer.from(JSON.stringify(testClaims({ role: 'admin' }))).toString('base64url')}.${signature}`;
    for (const candidate of [
      signTestJwt(testClaims({ iat: now-120, exp: now-60 }), key),
      signTestJwt(testClaims({ nbf: now+60 }), key),
      signTestJwt(testClaims({ iat: now+60, exp: now+120 }), key),
      signTestJwt(testClaims(), key, 'none'), altered,
      signTestJwt(testClaims(), randomBytes(48).toString('hex')),
      signTestJwt(testClaims(), key, 'HS384'),
    ]) { const result = run(`Bearer ${candidate}`); assert.equal(result.status, 401); assert.equal(result.nextCalls, 0); }
  });
  it('rejects incompatible issuer/audience and incomplete identity/expiration claims', () => {
    const now = Math.floor(Date.now()/1000);
    for (const overrides of [{ iss: 'other-app' }, { aud: 'other-app' }, { id: '' }, { email: '' }, { role: 'owner' }, { iat: undefined }, { exp: undefined }, { exp: now+90000 }, { iat: now+0.1 }, { exp: now+59.5 }, { id: 123 }, { email: {} }, { role: ['admin'] }]) {
      const result = run(`Bearer ${signTestJwt(testClaims(overrides), key)}`);
      assert.equal(result.status, 401); assert.equal(result.nextCalls, 0);
      assert.deepEqual(result.body, { error: 'Authentication required. Token missing, expired or invalid.' });
    }
    assert.equal(run(`Bearer ${signTestJwt('unstructured identity', key)}`).status, 401);
  });
  it('continues to enforce role authorization separately', () => {
    const result = run(`Bearer ${signTestJwt(testClaims(), key)}`);
    let next = 0;
    let status = 200;
    const res = { status(value: number) { status = value; return this; }, json() {} } as unknown as Response;
    authorize(['admin'])(result.req, res, () => next++);
    assert.equal(status, 403); assert.equal(next, 0);
    authorize(['analyst'])(result.req, res, () => next++); assert.equal(next, 1);
  });
});
