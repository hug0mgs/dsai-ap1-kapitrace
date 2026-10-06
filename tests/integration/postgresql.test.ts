import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { startTestServer, prisma, type TestServer } from '../test-helper';
import { PrismaClient } from '../../src/backend/node_modules/@prisma/client';
import { testSchema } from '../postgres-helper';
import { inspectDatabase, INITIAL_MIGRATION, SECURITY_MIGRATION } from '../../scripts/database-schema.mjs';
describe('PostgreSQL migrations, RLS and safe schema adoption', () => {
  let server: TestServer;
  before(async () => { server = await startTestServer(); });
  after(async () => { await server.close(); });
  it('applies both real migrations and isolates each process in its own schema', async () => {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    assert.deepEqual(rows.map(row=>row.migration_name).sort(), [INITIAL_MIGRATION,SECURITY_MIGRATION]);
    const [{ schema }] = await prisma.$queryRaw<{ schema: string }[]>`SELECT current_schema()::text AS schema`;
    assert.equal(schema, testSchema); assert.notEqual(schema, 'public');
    const result = await inspectDatabase(prisma);
    assert.deepEqual(result.issues, []); assert.equal(result.tables.length,7); assert.ok(result.tables.every((table: { rls_enabled: boolean; backend_access: boolean })=>table.rls_enabled && table.backend_access));
  });
  it('retains ownership relations, uniqueness and rejects out-of-range scores', async () => {
    const user = await prisma.user.create({ data: { email: 'postgres-fixture@example.com', password: 'test-only-placeholder-hash' } });
    const item = await prisma.watchlist.create({ data: { userId: user.id, itemValue: 'example.com', itemType: 'domain' } });
    await assert.rejects(prisma.user.create({ data: { email: user.email, password: 'test-only-placeholder-hash' } }));
    await assert.rejects(prisma.user.delete({ where: { id: user.id } }));
    await assert.rejects(prisma.ipCache.create({ data: { ip: '8.8.8.8', threatScore: 101, data: '{}' } }));
    await prisma.watchlist.delete({ where: { id: item.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
  it('does not grant anonymous or authenticated Data API access when roles exist', async () => {
    const rows = await prisma.$queryRaw<{ allowed: boolean }[]>`
      SELECT has_table_privilege(r.oid,c.oid,'SELECT') AS allowed
      FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE r.rolname IN ('anon','authenticated') AND n.nspname=current_schema()
        AND c.relname IN ('User','AuditLog','Watchlist','IpCache','DomainCache','HashCache','EmailCache')`;
    if (process.env.KAPITRACE_TEST_SUPABASE_ROLES === '1') assert.equal(rows.length, 14);
    assert.ok(rows.every(row=>!row.allowed));
  });
  it('validates an existing schema for baseline without resetting or erasing records', async () => {
    const user = await prisma.user.create({ data: { email: 'baseline-fixture@example.com', password: 'test-only-placeholder-hash' } });
    const root = path.resolve(__dirname,'../..');
    execFileSync(process.execPath,[path.join(root,'scripts/database.mjs'),'baseline'],{cwd:root,env:process.env,stdio:'pipe'});
    assert.ok(await prisma.user.findUnique({ where: { id: user.id } }));
    await prisma.user.delete({ where: { id: user.id } });
  });
  it('adopts SQL-Editor-style tables without migration history and preserves data through deploy', async () => {
    const adoption = `${testSchema}_baseline`;
    const root = path.resolve(__dirname,'../..');
    const backend = path.join(root,'src/backend');
    const url = new URL(process.env.DIRECT_URL!); url.searchParams.set('schema',adoption);
    const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() };
    const target = new PrismaClient({ datasources: { db: { url: url.toString() } } });
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${adoption}"`);
    try {
      execFileSync(process.execPath,[path.join(backend,'node_modules/prisma/build/index.js'),'db','execute','--schema','prisma/schema.prisma','--file','prisma/migrations/20261006000100_initial_postgresql/migration.sql'],{cwd:backend,env,stdio:'pipe'});
      const user = await target.user.create({ data: { email: 'existing-sql-fixture@example.com', password: 'test-only-placeholder-hash' } });
      assert.throws(()=>execFileSync(process.execPath,[path.join(root,'scripts/database.mjs'),'deploy'],{cwd:root,env,stdio:'pipe'}));
      execFileSync(process.execPath,[path.join(root,'scripts/database.mjs'),'baseline'],{cwd:root,env,stdio:'pipe'});
      execFileSync(process.execPath,[path.join(root,'scripts/database.mjs'),'deploy'],{cwd:root,env,stdio:'pipe'});
      const state=await inspectDatabase(target);
      assert.deepEqual(state.issues,[]); assert.ok(state.tables.every((table: { rls_enabled: boolean })=>table.rls_enabled));
      assert.ok(await target.user.findUnique({where:{id:user.id}}));
    } finally { await target.$disconnect(); await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${adoption}" CASCADE`); }
  });
  it('refuses baseline validation for incompatible existing columns', async () => {
    await prisma.$executeRawUnsafe('ALTER TABLE "IpCache" RENAME COLUMN "data" TO "incompatible_data"');
    try { const result=await inspectDatabase(prisma); assert.ok(result.issues.some((issue: string)=>issue.includes('IpCache.data'))); }
    finally { await prisma.$executeRawUnsafe('ALTER TABLE "IpCache" RENAME COLUMN "incompatible_data" TO "data"'); }
  });
});
