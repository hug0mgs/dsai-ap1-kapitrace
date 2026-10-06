import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '../src/backend/node_modules/@prisma/client';

const raw = process.env.TEST_DATABASE_URL;
if (!raw) throw new Error('Run npm test: TEST_DATABASE_URL is required and must be isolated from production');
const base = new URL(raw);
if (!['postgres:', 'postgresql:'].includes(base.protocol) || /\.supabase\.(com|co)$/.test(base.hostname) || !['localhost','127.0.0.1','[::1]'].includes(base.hostname) && !base.pathname.endsWith('_test')) {
  throw new Error('Unsafe test database: use local PostgreSQL or a dedicated *_test database, never Supabase');
}
export const testSchema = `kapitrace_test_${randomUUID().replaceAll('-', '')}`;
assert.match(testSchema, /^kapitrace_test_[a-f0-9]{32}$/);
const scoped = new URL(base);
scoped.searchParams.set('schema', testSchema);
scoped.searchParams.set('connection_limit', '2');
process.env.DATABASE_URL = scoped.toString();
process.env.DIRECT_URL = scoped.toString();
const backend = path.resolve(__dirname, '../src/backend');
try {
  execFileSync(process.execPath,[path.join(backend,'node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:backend,env:process.env,stdio:'pipe'});
} catch { throw new Error('Could not deploy PostgreSQL test migrations (credentials suppressed)'); }
export async function removeTestSchema(): Promise<void> {
  const admin = new PrismaClient({ datasources: { db: { url: base.toString() } } });
  try { await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`); }
  finally { await admin.$disconnect(); }
}
