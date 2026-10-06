// Native orchestration: real disposable PostgreSQL, no added Node dependencies.
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const root = fileURLToPath(new URL('../', import.meta.url));
const backend = path.join(root, 'src/backend');
const cli = path.join(backend, 'node_modules/prisma/build/index.js');
const kind = process.argv[2] || 'all';
if (!['all','unit','integration','e2e'].includes(kind)) throw new Error('Unknown test suite');
let container;
let child;
let stopping = false;
let phase = 'configuration';
async function cleanup() {
  if (stopping) return;
  stopping = true;
  if (container) {
    try { execFileSync('docker', ['stop', '--time', '2', container], { stdio: 'ignore' }); } catch { console.error('Could not stop the test container'); }
  }
}
for (const [signal, code] of [['SIGINT',130],['SIGTERM',143]]) process.on(signal, async () => { child?.kill(signal); await cleanup(); process.exit(code); });
function checkTestUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid TEST_DATABASE_URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || /\.supabase\.(com|co)$/.test(url.hostname)) throw new Error('Tests require an isolated PostgreSQL database, not Supabase');
  if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) && !url.pathname.endsWith('_test')) throw new Error('Remote TEST_DATABASE_URL must name a dedicated *_test database');
  return value;
}
try {
  let testUrl = process.env.TEST_DATABASE_URL;
  if (kind !== 'unit') {
    if (testUrl) checkTestUrl(testUrl);
    else {
      const password = randomBytes(32).toString('hex');
      container = `kapitrace-test-${randomUUID()}`;
      phase = 'Docker start';
      execFileSync('docker', ['run','--detach','--rm','--name',container,'--publish','127.0.0.1::5432','--env','POSTGRES_PASSWORD','--env','POSTGRES_USER=kapitrace','--env','POSTGRES_DB=kapitrace_test','postgres:16'], { env: { ...process.env, POSTGRES_PASSWORD: password }, stdio: 'pipe' });
      phase = 'Docker port';
      const port = execFileSync('docker', ['port',container,'5432/tcp'], { encoding: 'utf8' }).trim().split(':').at(-1);
      testUrl = `postgresql://kapitrace:${password}@127.0.0.1:${port}/kapitrace_test?connection_limit=2`;
      phase = 'PostgreSQL TCP readiness';
      const deadline = Date.now()+30000;
      let ready = false;
      while (Date.now()<deadline) {
        try { execFileSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-p','5432','-U','kapitrace','-d','kapitrace_test'],{stdio:'ignore'}); ready = true; break; } catch { await delay(150); }
      }
      if (!ready) throw new Error('PostgreSQL test container did not become ready');
      phase = 'test role setup';
      execFileSync('docker',['exec',container,'psql','-U','kapitrace','-d','kapitrace_test','-v','ON_ERROR_STOP=1','-c','CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;'],{stdio:'pipe'});
      console.log('Disposable PostgreSQL 16 ready; each suite uses a private schema.');
    }
  }
  const generationUrl = testUrl || 'postgresql://unused:unused@127.0.0.1:1/kapitrace_test';
  const env = { ...process.env, NODE_ENV: 'test', KAPITRACE_TEST_SUPABASE_ROLES: container ? '1' : '0', DATABASE_URL: generationUrl, DIRECT_URL: generationUrl, ...(testUrl ? { TEST_DATABASE_URL: testUrl } : {}) };
  phase = 'Prisma generation';
  execFileSync(process.execPath,[cli,'generate'],{cwd:backend,env,stdio:'pipe'});
  const suites = kind==='all' ? ['unit','integration','e2e'] : [kind];
  const files = suites.flatMap(suite => readdirSync(path.join(root,'tests',suite)).filter(file=>file.endsWith('.test.ts')).sort().map(file=>path.join(root,'tests',suite,file)));
  phase = 'test execution';
  child = spawn(process.execPath,['--import','tsx','--test',...files],{cwd:backend,env,stdio:'inherit'});
  process.exitCode = await new Promise(resolve=> { child.once('exit',code=>resolve(code??1)); child.once('error',()=>resolve(1)); });
} catch {
  // Do not print child-process error objects: they may contain connection credentials.
  console.error(`Test setup failed during ${phase}. Verify Docker/PostgreSQL and TEST_DATABASE_URL; production DATABASE_URL is never used by tests.`);
  process.exitCode = 1;
} finally { await cleanup(); }
