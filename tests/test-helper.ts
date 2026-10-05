import path from 'node:path';

// Set absolute DATABASE_URL before importing Prisma or App
const dbPath = path.resolve(__dirname, '../src/backend/prisma/dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'kapitrace_test_secret_key_2026';

import { app } from '../src/backend/src/app';
import prisma from '../src/backend/src/shared/prisma';
import { Server } from 'node:http';

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
