// Runtime-only JWT fixtures using native crypto. Never serialize tokens to logs/files.
import { createHmac } from 'node:crypto';
export const identity = { id: 'unit-test-user', email: 'unit@example.com', role: 'analyst' };
export function testClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { ...identity, iat: now, exp: now + 60, iss: 'kapitrace', aud: 'kapitrace-web', ...overrides };
}
export function signTestJwt(payload: unknown, key: string, algorithm = 'HS256'): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const data = `${encode({ alg: algorithm, typ: 'JWT' })}.${encode(payload)}`;
  const signature = algorithm === 'none' ? '' : createHmac(algorithm === 'HS384' ? 'sha384' : 'sha256', key).update(data).digest('base64url');
  return `${data}.${signature}`;
}
