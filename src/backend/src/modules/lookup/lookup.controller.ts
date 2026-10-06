import { Request, Response } from 'express';
import prisma from '../../shared/prisma';
import { normalizeIndicator } from '../threat-analyzer/validators';
import { collectIntelligence, IndicatorType, SourceResult } from '../intelligence/intelligence.service';
import { ThreatScoreResult } from '../threat-analyzer/threat-score.service';
import { setting } from '../../shared/config';

const VERSION = 'real-api-v1';
interface CachedData {
  scoreVersion: string;
  indicator: string;
  type: IndicatorType;
  threatScore: number;
  riskLevel: string;
  analysis: ThreatScoreResult;
  sources: SourceResult[];
  factors: unknown;
  partial: boolean;
  cachedAt: string;
  expiresAt: string;
}
interface CacheRow { data: string; updatedAt: Date }
interface LookupResponse {
  source: 'api' | 'cache';
  indicator: string;
  type: IndicatorType;
  threatScore: number | null;
  riskLevel: string | null;
  analysis: ThreatScoreResult | null;
  data: unknown;
  sources: SourceResult[];
  cachedAt: string;
  expiresAt: string;
  stale: boolean;
  partial: boolean;
  assessmentStatus: string;
  scoreVersion: string;
}
const pending = new Map<string, Promise<LookupResponse>>();
class LookupUnavailable extends Error {
  constructor(public sources: SourceResult[]) { super('Threat intelligence currently unavailable'); }
}
async function readCache(type: IndicatorType, indicator: string): Promise<CacheRow | null> {
  if (type === 'ip') return prisma.ipCache.findUnique({ where: { ip: indicator } });
  if (type === 'domain') return prisma.domainCache.findUnique({ where: { domain: indicator } });
  return prisma.hashCache.findUnique({ where: { hash: indicator } });
}
function parseCache(row: CacheRow | null, type: IndicatorType, indicator: string): CachedData | null {
  if (!row) return null;
  try {
    const data = JSON.parse(row.data) as CachedData;
    if (data.scoreVersion !== VERSION || data.type !== type || data.indicator !== indicator || !Number.isFinite(data.threatScore) || data.threatScore < 0 || data.threatScore > 100 || !data.analysis || data.analysis.score !== data.threatScore || !Array.isArray(data.sources)) return null;
    const collected = Date.parse(data.cachedAt);
    const expires = Date.parse(data.expiresAt);
    if (!Number.isFinite(collected) || !Number.isFinite(expires) || collected > Date.now() || expires <= collected || expires - collected > setting('LOOKUP_CACHE_TTL_SECONDS', 86400, 1, 604800) * 1000) return null;
    return data;
  } catch { return null; }
}
function cachedResponse(data: CachedData, stale = false, failureSources?: SourceResult[]): LookupResponse {
  return { source: 'cache', indicator: data.indicator, type: data.type, threatScore: data.threatScore, riskLevel: data.riskLevel, analysis: data.analysis, data, sources: failureSources ?? data.sources, cachedAt: data.cachedAt, expiresAt: data.expiresAt, stale, partial: stale || data.partial, assessmentStatus: stale ? 'stale' : 'assessed', scoreVersion: VERSION };
}
async function performLookup(type: IndicatorType, indicator: string): Promise<LookupResponse> {
  const cached = parseCache(await readCache(type, indicator), type, indicator);
  if (cached && Date.parse(cached.expiresAt) > Date.now()) return cachedResponse(cached);
  const intelligence = await collectIntelligence(type, indicator);
  if (!intelligence.analysis) {
    if (cached && Date.now() - Date.parse(cached.cachedAt) <= setting('LOOKUP_STALE_MAX_AGE_SECONDS', 172800, 1, 604800) * 1000) return cachedResponse(cached, true, intelligence.sources);
    if (!intelligence.successful) throw new LookupUnavailable(intelligence.sources);
  }
  const now = new Date().toISOString();
  const ttl = intelligence.partial ? setting('LOOKUP_PARTIAL_CACHE_TTL_SECONDS', 300, 1, 604800) : setting('LOOKUP_CACHE_TTL_SECONDS', 86400, 1, 604800);
  const data = { scoreVersion: VERSION, indicator, type, threatScore: intelligence.analysis?.score ?? null, riskLevel: intelligence.analysis?.riskLevel ?? null, analysis: intelligence.analysis, sources: intelligence.sources, factors: intelligence.factors, partial: intelligence.partial, cachedAt: now, expiresAt: new Date(Date.parse(now) + ttl * 1000).toISOString() };
  // Unknown reputation is never persisted as a numeric clean score.
  if (data.threatScore !== null) {
    const value = { threatScore: data.threatScore, data: JSON.stringify(data) };
    if (type === 'ip') await prisma.ipCache.upsert({ where: { ip: indicator }, update: value, create: { ip: indicator, ...value } });
    else if (type === 'domain') await prisma.domainCache.upsert({ where: { domain: indicator }, update: value, create: { domain: indicator, ...value } });
    else await prisma.hashCache.upsert({ where: { hash: indicator }, update: value, create: { hash: indicator, ...value } });
  }
  return { source: 'api', ...data, data, stale: false, assessmentStatus: intelligence.analysis ? 'assessed' : 'insufficient_data' };
}
export const lookupIndicator = async (req: Request, res: Response): Promise<void> => {
  const type = String(req.params.type || 'ip').toLowerCase();
  let indicator: string;
  try { indicator = normalizeIndicator(type, req.params.indicator ?? req.params.ip); }
  catch (error) {
    res.status(400).json({ error: 'Validation Error', message: error instanceof Error ? error.message : 'Invalid indicator' });
    return;
  }
  const key = `${type}:${indicator}`;
  try {
    let request = pending.get(key);
    if (!request) {
      if (pending.size >= 128) { res.status(503).json({ error: 'Lookup capacity exceeded' }); return; }
      request = performLookup(type as IndicatorType, indicator).finally(() => pending.delete(key));
      pending.set(key, request);
    }
    res.json(await request);
  } catch (error) {
    if (error instanceof LookupUnavailable) {
      const retry = Math.min(...error.sources.filter(source => source.retryAfter).map(source => source.retryAfter!));
      if (Number.isFinite(retry)) res.setHeader('Retry-After', retry);
      res.status(503).json({ error: error.message, sources: error.sources, threatScore: null, riskLevel: null, assessmentStatus: 'unavailable' });
    } else {
      console.error('Lookup storage or configuration failure');
      res.status(500).json({ error: 'Failed to process lookup' });
    }
  }
};
export const lookupIp = lookupIndicator;
