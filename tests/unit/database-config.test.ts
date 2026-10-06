import { it } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl } from '../../src/backend/src/shared/config';
it('rejects absent, SQLite, invalid URLs, insecure Supabase and transaction administrative URLs without leaking configuration', () => {
  const original = { DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL };
  try {
    for (const value of [undefined,'file:./dev.db','not a url','https://example.com/db','postgresql://user:fake-password@fake.pooler.supabase.com:6543/postgres','postgresql://user:fake-password@fake.pooler.supabase.com:6543/postgres?sslmode=require']) {
      if (value === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = value;
      assert.throws(databaseUrl, (error: unknown) => error instanceof Error && !error.message.includes('fake-password') && !error.message.includes('file:'));
    }
    process.env.DATABASE_URL='postgresql://test-only@127.0.0.1:5432/kapitrace_test'; assert.ok(databaseUrl() === process.env.DATABASE_URL);
    process.env.DATABASE_URL='postgresql://test-only@fake.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require'; assert.ok(databaseUrl() === process.env.DATABASE_URL);
    process.env.DIRECT_URL=process.env.DATABASE_URL; assert.throws(()=>databaseUrl('DIRECT_URL'));
    process.env.DIRECT_URL='postgresql://test-only@fake.pooler.supabase.com:5432/postgres?sslmode=require'; assert.ok(databaseUrl('DIRECT_URL')===process.env.DIRECT_URL);
  } finally { for (const [name,value] of Object.entries(original)) if (value===undefined) delete process.env[name]; else process.env[name]=value; }
});
