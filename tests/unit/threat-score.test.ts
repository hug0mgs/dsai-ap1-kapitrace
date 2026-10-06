import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate_threat_score } from '../../src/backend/src/modules/threat-analyzer/threat-score.service';
import { normalizeProvider } from '../../src/backend/src/modules/intelligence/intelligence.service';

describe('Evidence-based ThreatScore', () => {
  it('does not classify missing or non-finite evidence as clean', () => {
    assert.equal(calculate_threat_score({}), null);
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: NaN, abuseConfidenceScore: Infinity }), null);
    assert.equal(calculate_threat_score({ isC2FeedPresent: true }), null);
    assert.equal(calculate_threat_score({ abuseConfidenceScore: 80 }, 'hash'), null);
  });
  it('renormalizes available weights and reports coverage', () => {
    const result = calculate_threat_score({ abuseConfidenceScore: 80, maliciousDetectionsRatio: 50 })!;
    assert.equal(result.score, 64);
    assert.equal(result.riskLevel, 'HIGH');
    assert.equal(result.confidencePercentage, 75);
    assert.equal(result.factorBreakdowns[2].inputScore, null);
    assert.equal(result.factorBreakdowns[2].weight, 0);
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: 80 }, 'hash')!.score, 80);
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: 80 }, 'hash')!.confidencePercentage, 100);
  });
  it('uses actual response shapes, not words in the indicator', () => {
    const abuse = normalizeProvider('ABUSEIPDB', { data: { ipAddress: '8.8.8.8', abuseConfidenceScore: 80, totalReports: 42 } });
    const vt = normalizeProvider('VIRUSTOTAL', { data: { attributes: { last_analysis_stats: { malicious: 5, harmless: 5, undetected: 0 } } } });
    const score = calculate_threat_score({ ...abuse.factors, ...vt.factors })!;
    assert.equal(score.score, 64);
    assert.equal(abuse.factors.totalReportsCount, 42);
    assert.deepEqual(normalizeProvider('OTX', { pulse_info: { count: 100 } }).factors, {});
    assert.deepEqual(normalizeProvider('IPINFO', { ip: '8.8.8.8', org: 'AS15169 Google LLC' }).factors, {});
  });
  it('preserves exact tier boundaries and clamps scores', () => {
    for (const [value, tier] of [[0,'LOW'],[19,'LOW'],[20,'SUSPICIOUS'],[49,'SUSPICIOUS'],[50,'HIGH'],[79,'HIGH'],[80,'CRITICAL'],[100,'CRITICAL']] as const) {
      assert.equal(calculate_threat_score({ maliciousDetectionsRatio: value }, 'hash')!.riskLevel, tier);
    }
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: 999, isC2FeedPresent: true }, 'hash')!.score, 100);
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: 10, isWhitelistedBenign: true }, 'hash')!.score, 0);
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: -50 }, 'hash')!.score, 0);
    assert.equal(calculate_threat_score({ maliciousDetectionsRatio: 49.4999 }, 'hash')!.score, 49);
  });
  it('requires finite CVSS evidence and deduplicates ports', () => {
    const result = normalizeProvider('SHODAN', { ip_str: '8.8.8.8', ports: [22,22,443], vulns: { A: { cvss: 9 }, B: {}, C: { cvss: 6 } } });
    assert.equal(result.factors.vulnerabilityExposureScore, 30);
    assert.deepEqual(result.details.criticalCves, ['A']);
    assert.deepEqual(normalizeProvider('GREYNOISE', { ip: '8.8.8.8', noise: false, classification: 'unknown' }).factors, {});
    assert.equal(normalizeProvider('GREYNOISE', { ip: '8.8.8.8', noise: true, classification: 'benign' }).factors.suspiciousActivityScore, 0);
  });
  it('rejects malformed schemas and avoids division by zero', () => {
    assert.throws(() => normalizeProvider('ABUSEIPDB', { data: { abuseConfidenceScore: '80' } }));
    assert.throws(() => normalizeProvider('SHODAN', { ip_str: '8.8.8.8', ports: [NaN] }));
    assert.throws(() => normalizeProvider('VIRUSTOTAL', { data: { attributes: { last_analysis_stats: { malicious: -1 } } } }));
    assert.deepEqual(normalizeProvider('VIRUSTOTAL', { data: { attributes: { last_analysis_stats: { malicious: 0, harmless: 0 } } } }).factors, {});
  });
});
