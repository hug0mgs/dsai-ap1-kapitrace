import { setTimeout as delay } from 'node:timers/promises';
import { setting } from '../../shared/config';

export type SourceStatus = 'ok' | 'not_found' | 'not_configured' | 'not_applicable' | 'rate_limited' | 'timeout' | 'unavailable' | 'invalid_response';
export class ProviderError extends Error {
  constructor(public status: SourceStatus, public retryAfter?: number) { super(status); }
}
const allowedHosts = new Set(['api.abuseipdb.com', 'www.virustotal.com', 'api.shodan.io', 'api.greynoise.io', 'otx.alienvault.com', 'urlscan.io', 'ipinfo.io']);
const cooldown = new Map<string, number>();
const nextRequest = new Map<string, number>();
let active = 0;
export function resetHttpState(): void { cooldown.clear(); nextRequest.clear(); }
export function retryAfterSeconds(value: string | null, now = Date.now()): number {
  if (!value) return 60;
  const seconds = /^\d+$/.test(value.trim()) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) ? Math.min(604800, Math.max(1, Math.ceil(seconds))) : 60;
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.headers.get('content-type')?.toLowerCase().includes('json')) throw new ProviderError('invalid_response');
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError('invalid_response');
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); throw new ProviderError('invalid_response'); }
      parts.push(value);
    }
    try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
    catch { throw new ProviderError('invalid_response'); }
  } finally { reader.releaseLock(); }
}

export async function getJson(provider: string, url: URL, headers: Record<string, string>, signal: AbortSignal): Promise<unknown> {
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username || url.password) throw new ProviderError('unavailable');
  const remaining = (cooldown.get(provider) ?? 0) - Date.now();
  if (remaining > 0) throw new ProviderError('rate_limited', Math.ceil(remaining / 1000));
  const retries = setting('EXTERNAL_API_MAX_RETRIES', 1, 0, 1);
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal.aborted) throw new ProviderError('timeout');
    if (active >= setting('EXTERNAL_API_MAX_CONCURRENCY', 8, 1, 64)) throw new ProviderError('unavailable');
    const wait = (nextRequest.get(provider) ?? 0) - Date.now();
    if (wait > 0) throw new ProviderError('rate_limited', Math.ceil(wait / 1000));
    const interval = setting(`${provider}_MIN_INTERVAL_MS`, provider === 'VIRUSTOTAL' ? 15000 : 1000, 0, 86400000);
    nextRequest.set(provider, Date.now() + interval);
    active++;
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), setting('EXTERNAL_API_TIMEOUT_MS', 5000, 1, 60000));
    const requestSignal = AbortSignal.any([signal, timeout.signal]);
    let failure: ProviderError | undefined;
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'KapiTrace/1.0', ...headers }, signal: requestSignal, redirect: 'error' });
      if (!response.ok) {
        const retryAfter = retryAfterSeconds(response.headers.get('retry-after'));
        await response.body?.cancel();
        if (response.status === 429 || response.status === 503) cooldown.set(provider, Date.now() + retryAfter * 1000);
        if (response.status === 429) throw new ProviderError('rate_limited', retryAfter);
        if (response.status === 404) throw new ProviderError('not_found');
        if (![502, 503, 504].includes(response.status)) throw new ProviderError('unavailable');
        failure = new ProviderError('unavailable', response.status === 503 ? retryAfter : undefined);
      } else { return await readJson(response); }
    } catch (error) {
      if (requestSignal.aborted) throw new ProviderError('timeout');
      if (error instanceof ProviderError) throw error;
      failure = new ProviderError('unavailable');
    } finally { clearTimeout(timer); active--; }
    if (attempt === retries || cooldown.has(provider) && cooldown.get(provider)! > Date.now()) throw failure;
    // Respect both retry backoff and the configured provider interval.
    try { await delay(Math.max(100 + Math.floor(Math.random() * 100), (nextRequest.get(provider) ?? 0) - Date.now()), undefined, { signal }); }
    catch { throw new ProviderError('timeout'); }
  }
  throw new ProviderError('unavailable');
}
