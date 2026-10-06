// Native HTTP boundary stub; application, scoring and persistence stay real.
import assert from 'node:assert/strict';
const nativeFetch = globalThis.fetch;
export const calls: URL[] = [];
export const responses = new Map<string, (url: URL, init?: RequestInit) => Response | Promise<Response>>();
export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
export function installHttpFixtures(): void {
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return nativeFetch(input, init);
    calls.push(url);
    const custom = responses.get(url.hostname);
    if (custom) return custom(url, init);
    const headers = new Headers(init?.headers);
    if (url.hostname === 'www.virustotal.com') {
      assert.equal(headers.get('x-apikey'), 'test-only-key');
      return json({ data: { attributes: { last_analysis_stats: { malicious: 8, harmless: 2, suspicious: 0, undetected: 0, timeout: 0 }, country: 'US' } } });
    }
    if (url.hostname === 'api.abuseipdb.com') {
      assert.equal(headers.get('Key'), 'test-only-key');
      return json({ data: { ipAddress: url.searchParams.get('ipAddress'), abuseConfidenceScore: 80, totalReports: 42, countryCode: 'US' } });
    }
    if (url.hostname === 'api.shodan.io') { assert.equal(url.searchParams.get('key'), 'test-only-key'); return json({ ip_str: '8.8.8.8', ports: [22, 443], vulns: { 'CVE-2024-EXAMPLE': { cvss: 9 } } }); }
    if (url.hostname === 'api.greynoise.io') { assert.equal(headers.get('key'), 'test-only-key'); return json({ ip: '8.8.8.8', classification: 'malicious', noise: true, riot: false }); }
    if (url.hostname === 'otx.alienvault.com') { assert.equal(headers.get('X-OTX-API-KEY'), 'test-only-key'); return json({ pulse_info: { count: 2 } }); }
    if (url.hostname === 'urlscan.io') { assert.equal(headers.get('API-Key'), 'test-only-key'); return json({ results: [] }); }
    if (url.hostname === 'ipinfo.io') { assert.equal(headers.get('Authorization'), 'Bearer test-only-key'); return json({ ip: '8.8.8.8', country: 'US', org: 'AS15169 Google LLC' }); }
    throw new Error(`Unmocked external HTTP forbidden: ${url.hostname}`);
  };
}
export function resetFixtures(): void { calls.length = 0; responses.clear(); }
