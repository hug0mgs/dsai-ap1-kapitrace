import path from 'node:path';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { installHttpFixtures } from './http-fixtures';
import { Server } from 'node:http';

const directory = mkdtempSync(path.join(tmpdir(), 'kapitrace-test-'));
process.env.DATABASE_URL = `file:${path.join(directory, 'test.db')}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.LOOKUP_REQUESTS_PER_MINUTE = '10000';
for (const provider of ['ABUSEIPDB','VIRUSTOTAL','SHODAN','GREYNOISE','OTX','URLSCAN','IPINFO']) {
  process.env[provider === 'IPINFO' ? 'IPINFO_TOKEN' : `${provider}_API_KEY`] = 'test-only-key';
  process.env[`${provider}_MIN_INTERVAL_MS`] = '0';
}
installHttpFixtures();
execFileSync(process.execPath, [path.resolve(__dirname, '../src/backend/node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], { cwd: path.resolve(__dirname, '../src/backend'), env: process.env, stdio: 'pipe' });
const { app } = require('../src/backend/src/app') as typeof import('../src/backend/src/app');
export const prisma = (require('../src/backend/src/shared/prisma') as typeof import('../src/backend/src/shared/prisma')).default;
process.on('exit', () => rmSync(directory, { recursive: true, force: true }));

export interface TestServer {
  url: string;
  close: () => Promise<void>;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
}

/**
 * Spawns an ephemeral test HTTP server on an available dynamic OS port.
 * Allows clean, parallelizable and reproducible integration testing.
 */
export function startTestServer(): Promise<TestServer> {
  return new Promise((resolve) => {
    const server: Server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4000;
      const url = `http://127.0.0.1:${port}`;

      resolve({
        url,
        close: async () => {
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
          await new Promise<void>((done) => {
            server.close(() => done());
          });
          await prisma.$disconnect();
        },
        fetch: (path: string, init: RequestInit = {}) => {
          const targetUrl = path.startsWith('http')
            ? path
            : `${url}${path.startsWith('/') ? '' : '/'}${path}`;
          const headers = new Headers(init.headers || {});
          if (!headers.has('Connection')) {
            headers.set('Connection', 'close');
          }
          return fetch(targetUrl, { ...init, headers });
        }
      });
    });
  });
}

/** Explicit login through the real Auth API. server.fetch stays anonymous by default. */
export async function loginTestUser(server: TestServer): Promise<string> {
  const credentials = { email: `lookup-${randomUUID()}@example.com`, password: 'TestOnlyLogin-2026!' };
  const init = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  const register = await server.fetch('/api/auth/register', { ...init, body: JSON.stringify(credentials) });
  assert.equal(register.status, 201);
  const login = await server.fetch('/api/auth/login', { ...init, body: JSON.stringify(credentials) });
  assert.equal(login.status, 200);
  const body = await login.json();
  assert.equal(typeof body.token, 'string');
  return body.token;
}
export function withBearer(server: TestServer, token: string): TestServer['fetch'] {
  return (path, options = {}) => {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return server.fetch(path, { ...options, headers });
  };
}
