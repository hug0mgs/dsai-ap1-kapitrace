import { Request, Response } from 'express';
import prisma from '../../shared/prisma';
import {
  isValidIPv4,
  isValidIPv6,
  isValidDomain,
  validateHash,
  detectIndicatorType,
  validateIPv4,
  validateIPv6,
  validateDomain
} from '../threat-analyzer/validators';
import {
  calculate_threat_score,
  ThreatFactors,
  ThreatScoreResult
} from '../threat-analyzer/threat-score.service';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL

/**
 * Deterministic helper to simulate intelligence sources for demonstrations/tests
 * based on indicator characteristics, ensuring realistic and reproducible scores.
 */
function deriveThreatFactors(indicator: string, type: 'ip' | 'domain' | 'hash'): ThreatFactors {
  const lower = indicator.toLowerCase();

  // Known test indicators for deterministic simulation
  if (lower.includes('malicious') || lower.includes('evil') || lower.includes('bad') || lower.includes('botnet')) {
    return {
      abuseConfidenceScore: 92,
      maliciousDetectionsRatio: 88,
      vulnerabilityExposureScore: 75,
      suspiciousActivityScore: 80,
      isC2FeedPresent: true,
      isBotnetActor: true,
      totalReportsCount: 142
    };
  }

  if (lower.includes('phish') || lower.includes('scam')) {
    return {
      abuseConfidenceScore: 78,
      maliciousDetectionsRatio: 65,
      vulnerabilityExposureScore: 40,
      suspiciousActivityScore: 60,
      isPhishingHost: true,
      totalReportsCount: 45
    };
  }

  if (lower.includes('clean') || lower.includes('trusted') || lower === '1.1.1.1' || lower === '8.8.8.8' || lower === 'google.com') {
    return {
      abuseConfidenceScore: 0,
      maliciousDetectionsRatio: 0,
      vulnerabilityExposureScore: 0,
      suspiciousActivityScore: 0,
      isWhitelistedBenign: true,
      totalReportsCount: 0
    };
  }

  // Deterministic seed generation from string characters
  let seed = 0;
  for (let i = 0; i < lower.length; i++) {
    seed = (seed * 31 + lower.charCodeAt(i)) & 0xffffffff;
  }
  const positiveSeed = Math.abs(seed);

  const abuse = positiveSeed % 100;
  const detections = (positiveSeed >> 2) % 100;
  const vulns = (positiveSeed >> 4) % 100;
  const activity = (positiveSeed >> 6) % 100;

  return {
    abuseConfidenceScore: abuse,
    maliciousDetectionsRatio: detections,
    vulnerabilityExposureScore: vulns,
    suspiciousActivityScore: activity,
    isC2FeedPresent: abuse > 75,
    isTorExitNode: lower.endsWith('.tor') || lower.startsWith('185.'),
    totalReportsCount: Math.floor(abuse / 5)
  };
}

/**
 * Handle IP Lookup (/api/lookup/ip/:ip)
 */
export const lookupIp = async (req: Request, res: Response): Promise<void> => {
  const { ip } = req.params;

  if (!ip || (!isValidIPv4(ip) && !isValidIPv6(ip))) {
    const errorDetail = isValidIPv4(ip)
      ? 'Valid IPv4'
      : isValidIPv6(ip)
        ? 'Valid IPv6'
        : 'Input is neither valid IPv4 nor valid IPv6 according to RFC 791 / RFC 4291';

    res.status(400).json({
      error: 'Validation Error',
      message: errorDetail,
      indicator: ip
    });
    return;
  }

  const normalizedIp = ip.trim().toLowerCase();

  try {
    // 1. Check Database Cache
    const cached = await prisma.ipCache.findUnique({ where: { ip: normalizedIp } });
    if (cached) {
      const ageMs = Date.now() - cached.updatedAt.getTime();
      const isExpired = ageMs > CACHE_TTL_MS;

      if (!isExpired) {
        let parsedData = {};
        try {
          parsedData = JSON.parse(cached.data);
        } catch {
          parsedData = { raw: cached.data };
        }

        res.json({
          source: 'cache',
          indicator: normalizedIp,
          type: 'ip',
          threatScore: cached.threatScore,
          cachedAt: cached.updatedAt,
          data: parsedData
        });
        return;
      }
    }

    // 2. Cache MISS: Evaluate threat factors and calculate unified ThreatScore
    const factors = deriveThreatFactors(normalizedIp, 'ip');
    const threatScoreResult = calculate_threat_score(factors);

    const apiData = {
      threatDetails: threatScoreResult,
      network: {
        ip: normalizedIp,
        version: isValidIPv6(normalizedIp) ? 'IPv6' : 'IPv4',
        asn: 'AS15169',
        country: 'US',
        organization: 'Sample Net Operator'
      },
      reports: factors.totalReportsCount || 0
    };

    // 3. Upsert to DB Cache
    const saved = await prisma.ipCache.upsert({
      where: { ip: normalizedIp },
      update: {
        threatScore: threatScoreResult.score,
        data: JSON.stringify(apiData)
      },
      create: {
        ip: normalizedIp,
        threatScore: threatScoreResult.score,
        data: JSON.stringify(apiData)
      }
    });

    res.json({
      source: 'api',
      indicator: normalizedIp,
      type: 'ip',
      threatScore: saved.threatScore,
      riskLevel: threatScoreResult.riskLevel,
      data: apiData,
      analysis: threatScoreResult
    });
  } catch (error) {
    console.error('Error during IP lookup:', error);
    res.status(500).json({ error: 'Failed to lookup IP' });
  }
};

/**
 * Generic Unified Indicator Lookup (/api/lookup/:type/:indicator)
 * Supports 'ip', 'domain', 'hash'.
 */
export const lookupIndicator = async (req: Request, res: Response): Promise<void> => {
  const { type, indicator } = req.params;

  if (!indicator) {
    res.status(400).json({ error: 'Indicator parameter is required' });
    return;
  }

  const cleanIndicator = indicator.trim().toLowerCase();
  const lowerType = (type || '').toLowerCase();

  // Validate according to type
  if (lowerType === 'ip') {
    if (!isValidIPv4(cleanIndicator) && !isValidIPv6(cleanIndicator)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid IP address format (must be standard IPv4 or IPv6)',
        indicator
      });
      return;
    }
  } else if (lowerType === 'domain') {
    if (!isValidDomain(cleanIndicator)) {
      const validation = validateDomain(cleanIndicator);
      res.status(400).json({
        error: 'Validation Error',
        message: validation.error || 'Invalid domain format conforming to RFC 1035',
        indicator
      });
      return;
    }
  } else if (lowerType === 'hash') {
    const hashValidation = validateHash(cleanIndicator);
    if (!hashValidation.isValid) {
      res.status(400).json({
        error: 'Validation Error',
        message: hashValidation.error || 'Invalid cryptographic hash (expected MD5, SHA-1, or SHA-256)',
        indicator
      });
      return;
    }
  } else {
    // If unknown type parameter, try auto-detection
    const detected = detectIndicatorType(cleanIndicator);
    if (detected === 'unknown') {
      res.status(400).json({
        error: 'Validation Error',
        message: `Unsupported or invalid indicator format for type "${type}"`,
        indicator
      });
      return;
    }
  }

  try {
    const effectiveType = lowerType === 'ip' || lowerType === 'domain' || lowerType === 'hash'
      ? lowerType
      : detectIndicatorType(cleanIndicator);

    // Cache lookup based on indicator type
    let cachedItem: { threatScore: number; data: string; updatedAt: Date } | null = null;

    if (effectiveType === 'ip') {
      cachedItem = await prisma.ipCache.findUnique({ where: { ip: cleanIndicator } });
    } else if (effectiveType === 'domain') {
      cachedItem = await prisma.domainCache.findUnique({ where: { domain: cleanIndicator } });
    } else if (effectiveType === 'hash') {
      cachedItem = await prisma.hashCache.findUnique({ where: { hash: cleanIndicator } });
    }

    if (cachedItem) {
      const ageMs = Date.now() - cachedItem.updatedAt.getTime();
      if (ageMs <= CACHE_TTL_MS) {
        let parsedData = {};
        try {
          parsedData = JSON.parse(cachedItem.data);
        } catch {
          parsedData = { raw: cachedItem.data };
        }

        res.json({
          source: 'cache',
          indicator: cleanIndicator,
          type: effectiveType,
          threatScore: cachedItem.threatScore,
          cachedAt: cachedItem.updatedAt,
          data: parsedData
        });
        return;
      }
    }

    // Cache MISS: Compute fresh threat intelligence
    const factors = deriveThreatFactors(cleanIndicator, effectiveType as 'ip' | 'domain' | 'hash');
    const threatScoreResult = calculate_threat_score(factors);

    const apiData = {
      indicator: cleanIndicator,
      type: effectiveType,
      threatScore: threatScoreResult.score,
      riskLevel: threatScoreResult.riskLevel,
      factors,
      threatAnalysis: threatScoreResult,
      generatedAt: new Date().toISOString()
    };

    const stringifiedData = JSON.stringify(apiData);

    // Save to relevant cache table
    if (effectiveType === 'ip') {
      await prisma.ipCache.upsert({
        where: { ip: cleanIndicator },
        update: { threatScore: threatScoreResult.score, data: stringifiedData },
        create: { ip: cleanIndicator, threatScore: threatScoreResult.score, data: stringifiedData }
      });
    } else if (effectiveType === 'domain') {
      await prisma.domainCache.upsert({
        where: { domain: cleanIndicator },
        update: { threatScore: threatScoreResult.score, data: stringifiedData },
        create: { domain: cleanIndicator, threatScore: threatScoreResult.score, data: stringifiedData }
      });
    } else if (effectiveType === 'hash') {
      await prisma.hashCache.upsert({
        where: { hash: cleanIndicator },
        update: { threatScore: threatScoreResult.score, data: stringifiedData },
        create: { hash: cleanIndicator, threatScore: threatScoreResult.score, data: stringifiedData }
      });
    }

    res.json({
      source: 'api',
      indicator: cleanIndicator,
      type: effectiveType,
      threatScore: threatScoreResult.score,
      riskLevel: threatScoreResult.riskLevel,
      data: apiData,
      analysis: threatScoreResult
    });
  } catch (error) {
    console.error('Error during indicator lookup:', error);
    res.status(500).json({ error: 'Failed to lookup indicator' });
  }
};
