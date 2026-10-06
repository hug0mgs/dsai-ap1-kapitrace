// Prisma 5 CLI wrapper with native .env loading and sanitized failures.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inspectDatabase, expectedTables, INITIAL_MIGRATION } from './database-schema.mjs';
const backend = fileURLToPath(new URL('../src/backend/', import.meta.url));
const require = createRequire(path.join(backend, 'package.json'));
const { PrismaClient } = require('@prisma/client');
const operation = process.argv[2];
let client;
let phase = operation;
function configuration(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} required`);
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.hostname || url.pathname.length <= 1 || url.hash) throw new Error('Invalid PostgreSQL connection configuration');
  if (/\.supabase\.(com|co)$/.test(url.hostname)) {
    if (!['require','verify-ca','verify-full'].includes(url.searchParams.get('sslmode') || '')) throw new Error('Supabase connection requires TLS');
    if (url.port === '6543' && (name === 'DIRECT_URL' || url.searchParams.get('pgbouncer') !== 'true')) throw new Error('Use administrative direct/session mode and runtime pgbouncer=true');
  }
  return value;
}
function prisma(args) {
  return execFileSync(process.execPath,[path.join(backend,'node_modules/prisma/build/index.js'),...args],{cwd:backend,env:process.env,stdio:'pipe',encoding:'utf8'});
}
try {
  const envPath = path.join(backend,'.env');
  if (existsSync(envPath)) loadEnvFile(envPath);
  configuration('DATABASE_URL');
  configuration('DIRECT_URL');
  if (operation === 'validate') { prisma(['validate']); console.log('PostgreSQL Prisma schema and connection configuration are valid.'); }
  else if (['deploy','baseline','check'].includes(operation)) {
    client = new PrismaClient({ datasources: { db: { url: configuration(operation === 'check' ? 'DATABASE_URL' : 'DIRECT_URL') } } });
    await client.$queryRaw`SELECT 1`;
    if (operation === 'baseline' || operation === 'check') {
      const state = await inspectDatabase(client);
      if (state.issues.length) { console.error(state.issues.join('\n')); throw new Error('Incompatible existing model tables'); }
      if (operation === 'check') {
        if (state.tables.some(table => !table.rls_enabled || !table.backend_access)) throw new Error('RLS/backend role configuration incomplete');
        console.log('PostgreSQL runtime connection, seven model tables and backend-only RLS verified.');
      } else {
        const [{ exists }] = await client.$queryRaw`SELECT to_regclass(format('%I.%I', current_schema(), '_prisma_migrations')) IS NOT NULL AS exists`;
        const rows = exists ? await client.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ${INITIAL_MIGRATION} AND finished_at IS NOT NULL AND rolled_back_at IS NULL` : [];
        if (!rows.length) prisma(['migrate','resolve','--applied',INITIAL_MIGRATION]);
        console.log('Existing model tables verified; initial migration baselined without deleting data. Run db:deploy for security migrations.');
      }
    } else {
      const rows = await client.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = current_schema()`;
      if (!rows.some(row => row.tablename === '_prisma_migrations') && rows.some(row => row.tablename in expectedTables)) {
        throw new Error('Existing tables require reviewed db:baseline');
      }
      phase = 'migrate deploy';
      prisma(['migrate','deploy']);
      console.log('PostgreSQL migrations deployed.');
    }
  } else throw new Error('Unknown database operation');
} catch {
  // No raw Prisma/child errors: messages can contain credentials or connection URLs.
  console.error(`Database ${phase || 'operation'} failed. Check private DATABASE_URL/DIRECT_URL, access permissions and schema. For pre-existing model tables review db:baseline; no reset or data-loss operation was performed.`);
  process.exitCode = 1;
} finally { await client?.$disconnect(); }
