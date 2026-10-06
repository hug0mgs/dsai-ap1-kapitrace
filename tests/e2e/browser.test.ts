// Native Chrome DevTools Protocol runner. No browser automation dependency.
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { startTestServer } from '../test-helper';
import { calls } from '../http-fixtures';

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>(resolve => server.close(() => resolve()));
  return port;
}
async function until<T>(check: () => Promise<T>, timeout = 60000): Promise<T> {
  const end = Date.now() + timeout;
  let error: unknown;
  while (Date.now() < end) {
    try { const value = await check(); if (value) return value; } catch (failure) { error = failure; }
    await delay(100);
  }
  throw new Error(`Browser condition timed out: ${String(error || '')}`);
}
async function stop(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  await Promise.race([exited, delay(5000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
  await exited;
}

it('browser: register/login, real lookup, cache HIT, watchlist add/list/delete and visible errors', { timeout: 180000 }, async () => {
  const backend = await startTestServer();
  let frontend: ChildProcess | undefined;
  let chrome: ChildProcess | undefined;
  let socket: WebSocket | undefined;
  const directory = await mkdtemp(path.join(tmpdir(), 'kapitrace-chrome-'));
  let frontendLog = '';
  try {
    const port = await freePort();
    const frontendDirectory = path.resolve(__dirname, '../../src/frontend');
    frontend = spawn(process.execPath, [path.join(frontendDirectory, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: frontendDirectory, env: { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_API_BASE_URL: backend.url }, stdio: ['ignore', 'pipe', 'pipe']
    });
    frontend.stdout?.on('data', chunk => { frontendLog = (frontendLog + chunk).slice(-6000); });
    frontend.stderr?.on('data', chunk => { frontendLog = (frontendLog + chunk).slice(-6000); });
    await until(async () => { const res = await fetch(`http://127.0.0.1:${port}/login`); return res.ok; });
    let endpoint = '';
    chrome = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    chrome.stderr?.on('data', chunk => { const match = String(chunk).match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) endpoint = match[1]; });
    let chromeError: Error | undefined;
    chrome.on('error', error => { chromeError = error; });
    await until(async () => { if (chromeError) throw chromeError; return endpoint; }, 15000);
    socket = new WebSocket(endpoint);
    await new Promise<void>((resolve, reject) => { socket!.addEventListener('open', () => resolve(), { once: true }); socket!.addEventListener('error', () => reject(new Error('CDP connection failed')), { once: true }); });
    let id = 0;
    let sessionId: string | undefined;
    const pending = new Map<number, { resolve: (value: Record<string, any>) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      const operation = pending.get(message.id);
      if (operation) { pending.delete(message.id); clearTimeout(operation.timer); if (message.error) operation.reject(new Error(message.error.message)); else operation.resolve(message.result); }
    });
    const send = (method: string, params: Record<string, unknown> = {}) => new Promise<Record<string, any>>((resolve, reject) => {
      const current = ++id;
      const timer = setTimeout(() => { pending.delete(current); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
      pending.set(current, { resolve, reject, timer });
      socket!.send(JSON.stringify({ id: current, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const target = await send('Target.createTarget', { url: 'about:blank' });
    sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
    await send('Runtime.enable'); await send('Page.enable');
    const evaluate = async (expression: string) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const navigate = async (pathname: string) => {
      await send('Page.navigate', { url: `http://127.0.0.1:${port}${pathname}` });
      await until(async () => await evaluate(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(pathname)}`));
      // Next hydration installs listeners after HTML is loaded.
      await delay(400);
    };
    const button = async (label: string) => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(label)}); if (!button) throw new Error('Button missing'); button.click(); })()`);
    const fill = async (selector: string, value: string) => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, ${JSON.stringify(value)}); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await navigate('/login'); await button('Criar conta');
    await fill('#name', 'Browser Analyst'); await fill('#email', `browser-${Date.now()}@example.com`); await fill('#password', 'BrowserTestOnly-2026!');
    await button('Criar conta e entrar');
    await until(async () => await evaluate(`location.pathname === '/lookup' && Boolean(document.querySelector('[aria-label="Indicador"]'))`));
    await fill('[aria-label="Indicador"]', '8.8.8.8'); await button('Analisar');
    await until(async () => await evaluate(`document.querySelector('[data-testid="lookup-result"]') !== null`));
    assert.equal(await evaluate(`document.querySelector('[data-testid="threat-score"]').textContent`), '75');
    assert.equal(await evaluate(`document.querySelector('[data-testid="lookup-source"]').textContent`), 'api');
    assert.equal(calls.length, 6);
    await button('Analisar');
    await until(async () => await evaluate(`document.querySelector('[data-testid="lookup-source"]')?.textContent === 'cache'`));
    assert.equal(calls.length, 6);
    await button('Adicionar à Watchlist');
    await until(async () => await evaluate(`document.body.textContent.includes('Indicador adicionado à watchlist.')`));
    await navigate('/dashboard');
    await until(async () => await evaluate(`document.querySelector('[data-testid="watchlist-item"]')?.textContent.includes('8.8.8.8')`));
    await button('Remover');
    await until(async () => await evaluate(`document.body.textContent.includes('Nenhum indicador monitorado.')`));
    await navigate('/lookup'); await fill('[aria-label="Indicador"]', '999.1.2.3'); await button('Analisar');
    await until(async () => await evaluate(`document.querySelector('[role="alert"]') !== null`));
    assert.equal(await evaluate(`document.querySelector('[data-testid="lookup-result"]')`), null);
    assert.equal(calls.length, 6);
  } catch (error) { throw new Error(`${String(error)}\nFrontend output:\n${frontendLog}`); }
  finally { socket?.close(); await stop(chrome); await stop(frontend); await backend.close(); await rm(directory, { recursive: true, force: true }); }
});
