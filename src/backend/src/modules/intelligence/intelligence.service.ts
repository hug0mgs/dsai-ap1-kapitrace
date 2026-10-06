import { isIP } from 'node:net';
import { ThreatFactors, calculate_threat_score } from '../threat-analyzer/threat-score.service';
import { getJson, ProviderError, SourceStatus } from './http';
import { setting } from '../../shared/config';
export type IndicatorType = 'ip' | 'domain' | 'hash';
export interface SourceResult {
  name: string;
  status: SourceStatus;
  details?: Record<string, unknown>;
  retryAfter?: number;
}
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const text = (value: unknown): string | undefined => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 256) : undefined;
function requireShape(valid: boolean): void { if (!valid) throw new ProviderError('invalid_response'); }

// Extract only documented evidence: unknown/missing values never become clean scores.
export function normalizeProvider(name: string, payload: unknown): { factors: ThreatFactors; details: Record<string, unknown> } {
  const root = record(payload);
  const factors: ThreatFactors = {};
  let details: Record<string, unknown> = {};
  if (name === 'ABUSEIPDB') {
    const data = record(root.data);
    requireShape(typeof data.ipAddress === 'string' && finite(data.abuseConfidenceScore) && data.abuseConfidenceScore <= 100);
    factors.abuseConfidenceScore = data.abuseConfidenceScore as number;
    if (finite(data.totalReports)) factors.totalReportsCount = data.totalReports;
    details = { abuseConfidenceScore: factors.abuseConfidenceScore, totalReports: factors.totalReportsCount, country: text(data.countryCode), isp: text(data.isp) };
  } else if (name === 'VIRUSTOTAL') {
    const attributes = record(record(root.data).attributes);
    requireShape(Object.keys(attributes).length > 0);
    const stats = record(attributes.last_analysis_stats);
    const counts = Object.values(stats);
    if (counts.length && counts.every(finite) && finite(stats.malicious)) {
      const total = (counts as number[]).reduce((a, b) => a + b, 0);
      if (Number.isFinite(total) && total > 0) factors.maliciousDetectionsRatio = stats.malicious / total * 100;
      details = { malicious: stats.malicious, engines: total };
    } else if (counts.length) throw new ProviderError('invalid_response');
    details = { ...details, country: text(attributes.country), asn: finite(attributes.asn) ? attributes.asn : undefined, organization: text(attributes.as_owner), fileType: text(attributes.type_description) };
  } else if (name === 'SHODAN') {
    requireShape(typeof root.ip_str === 'string' && Array.isArray(root.ports) && root.ports.every(port => finite(port) && Number.isInteger(port) && port <= 65535));
    const ports = [...new Set(root.ports as number[])];
    const vulns = record(root.vulns);
    const critical = Object.entries(vulns).filter(([, value]) => finite(record(value).cvss) && (record(value).cvss as number) >= 7).map(([cve]) => cve);
    factors.vulnerabilityExposureScore = Math.min(100, ports.filter(port => [22, 23, 445, 3389].includes(port)).length * 10 + critical.length * 20);
    details = { ports, criticalCves: critical, organization: text(root.org), country: text(root.country_code) };
  } else if (name === 'GREYNOISE') {
    requireShape(typeof root.ip === 'string' && typeof root.noise === 'boolean' && ['benign', 'malicious', 'unknown'].includes(String(root.classification)));
    if (root.classification === 'malicious') factors.suspiciousActivityScore = 100;
    if (root.classification === 'benign') factors.suspiciousActivityScore = 0;
    details = { classification: root.classification, noise: root.noise, riot: root.riot === true };
  } else if (name === 'OTX') {
    const pulse = record(root.pulse_info);
    requireShape(finite(pulse.count));
    details = { pulseCount: pulse.count }; // A pulse is not proof of C2 or benignity.
  } else if (name === 'URLSCAN') {
    requireShape(Array.isArray(root.results));
    details = { resultCount: (root.results as unknown[]).length }; // Search metadata is not a phishing verdict.
  } else if (name === 'IPINFO') {
    requireShape(typeof root.ip === 'string');
    details = { country: text(root.country), city: text(root.city), organization: text(root.org), hostname: text(root.hostname) };
  } else throw new ProviderError('invalid_response');
  return { factors, details };
}

export async function collectIntelligence(type: IndicatorType, indicator: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), setting('LOOKUP_DEADLINE_MS', 10000, 1, 120000));
  const factors: ThreatFactors = {};
  const encoded = encodeURIComponent(indicator);
  const ipv6 = isIP(indicator) === 6;
  const providers = [
    { name: 'ABUSEIPDB', key: 'ABUSEIPDB_API_KEY', applies: type === 'ip', url: `https://api.abuseipdb.com/api/v2/check?ipAddress=${encoded}&maxAgeInDays=90`, header: 'Key' },
    { name: 'VIRUSTOTAL', key: 'VIRUSTOTAL_API_KEY', applies: true, url: `https://www.virustotal.com/api/v3/${type === 'ip' ? 'ip_addresses' : type === 'domain' ? 'domains' : 'files'}/${encoded}`, header: 'x-apikey' },
    { name: 'SHODAN', key: 'SHODAN_API_KEY', applies: type === 'ip', url: `https://api.shodan.io/shodan/host/${encoded}`, header: '' },
    { name: 'GREYNOISE', key: 'GREYNOISE_API_KEY', applies: type === 'ip' && !ipv6, url: `https://api.greynoise.io/v3/community/${encoded}`, header: 'key' },
    { name: 'OTX', key: 'OTX_API_KEY', applies: true, url: `https://otx.alienvault.com/api/v1/indicators/${type === 'ip' ? ipv6 ? 'IPv6' : 'IPv4' : type === 'hash' ? 'file' : 'domain'}/${encoded}/general`, header: 'X-OTX-API-KEY' },
    { name: 'URLSCAN', key: 'URLSCAN_API_KEY', applies: type === 'domain', url: `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(`page.domain:"${indicator}"`)}&size=10`, header: 'API-Key' },
    { name: 'IPINFO', key: 'IPINFO_TOKEN', applies: type === 'ip', url: `https://ipinfo.io/${encoded}/json`, header: 'Authorization' }
  ];
  try {
    const sources: SourceResult[] = await Promise.all(providers.map(async provider => {
      if (!provider.applies) return { name: provider.name, status: 'not_applicable' as const };
      const key = process.env[provider.key]?.trim();
      if (!key) return { name: provider.name, status: 'not_configured' as const };
      try {
        const url = new URL(provider.url);
        const headers: Record<string, string> = {};
        if (provider.header) headers[provider.header] = provider.name === 'IPINFO' ? `Bearer ${key}` : key;
        else url.searchParams.set('key', key);
        const normalized = normalizeProvider(provider.name, await getJson(provider.name, url, headers, controller.signal));
        Object.assign(factors, normalized.factors);
        return { name: provider.name, status: 'ok' as const, details: normalized.details };
      } catch (error) {
        const failure = error instanceof ProviderError ? error : new ProviderError('unavailable');
        return { name: provider.name, status: failure.status, retryAfter: failure.retryAfter };
      }
    }));
    const analysis = calculate_threat_score(factors, type);
    const applicable = sources.filter(source => source.status !== 'not_applicable');
    return { factors, analysis, sources, partial: applicable.some(source => source.status !== 'ok'), successful: applicable.some(source => source.status === 'ok' || source.status === 'not_found') };
  } finally { clearTimeout(timer); }
}
