// Node's native environment loader is run by server.ts before app imports.
export function setting(name: string, fallback: number, min = 1, max = 604800000): number {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`Invalid configuration: ${name}`);
  }
  return value;
}
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return secret;
}
export function validateConfig(): void {
  jwtSecret();
  setting('PORT', 4000, 1, 65535);
  setting('EXTERNAL_API_TIMEOUT_MS', 5000, 1, 60000);
  setting('LOOKUP_DEADLINE_MS', 10000, 1, 120000);
  setting('EXTERNAL_API_MAX_RETRIES', 1, 0, 1);
  setting('EXTERNAL_API_MAX_CONCURRENCY', 8, 1, 64);
  setting('LOOKUP_REQUESTS_PER_MINUTE', 30, 1, 10000);
  for (const name of ['LOOKUP_CACHE_TTL_SECONDS', 'LOOKUP_PARTIAL_CACHE_TTL_SECONDS', 'LOOKUP_STALE_MAX_AGE_SECONDS']) setting(name, 86400, 1, 604800);
  for (const name of ['ABUSEIPDB', 'VIRUSTOTAL', 'SHODAN', 'GREYNOISE', 'OTX', 'URLSCAN', 'IPINFO']) setting(`${name}_MIN_INTERVAL_MS`, 1000, 0, 86400000);
}
