import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculate_threat_score,
  WEIGHT_ABUSE,
  WEIGHT_MALICIOUS_DETECTIONS,
  WEIGHT_VULNERABILITY,
  WEIGHT_ACTIVITY
} from '../../src/backend/src/modules/threat-analyzer/threat-score.service';

describe('Unit Tests: ThreatScore Unified Calculation Algorithm', () => {
  it('should return score 0 and LOW risk for zero/clean factors', () => {
    const res = calculate_threat_score({});
    assert.strictEqual(res.score, 0);
    assert.strictEqual(res.riskLevel, 'LOW');
    assert.strictEqual(res.rawScore, 0);
    assert.strictEqual(res.badgeColor, '#22c55e');
  });

  it('should calculate individual factor weights accurately', () => {
    // 1. Abuse alone at 100 -> 35
    const abuseOnly = calculate_threat_score({ abuseConfidenceScore: 100 });
    assert.strictEqual(abuseOnly.score, 35);
    assert.strictEqual(abuseOnly.riskLevel, 'SUSPICIOUS');

    // 2. Malicious detections alone at 100 -> 40
    const maliciousOnly = calculate_threat_score({ maliciousDetectionsRatio: 100 });
    assert.strictEqual(maliciousOnly.score, 40);
    assert.strictEqual(maliciousOnly.riskLevel, 'SUSPICIOUS');

    // 3. Vulnerability alone at 100 -> 15
    const vulnOnly = calculate_threat_score({ vulnerabilityExposureScore: 100 });
    assert.strictEqual(vulnOnly.score, 15);
    assert.strictEqual(vulnOnly.riskLevel, 'LOW');

    // 4. Activity alone at 100 -> 10
    const activityOnly = calculate_threat_score({ suspiciousActivityScore: 100 });
    assert.strictEqual(activityOnly.score, 10);
    assert.strictEqual(activityOnly.riskLevel, 'LOW');
  });

  it('should correctly sum all normalized factors to 100 when all factors are at 100', () => {
    const res = calculate_threat_score({
      abuseConfidenceScore: 100,
      maliciousDetectionsRatio: 100,
      vulnerabilityExposureScore: 100,
      suspiciousActivityScore: 100
    });

    assert.strictEqual(res.score, 100);
    assert.strictEqual(res.riskLevel, 'CRITICAL');
    assert.strictEqual(res.badgeColor, '#ef4444');
  });

  it('should correctly compute composite cumulative scores and severity tiers', () => {
    // Moderate risk: 50 * 0.35 (17.5) + 50 * 0.4 (20) = 37.5 -> round to 38
    const mod = calculate_threat_score({
      abuseConfidenceScore: 50,
      maliciousDetectionsRatio: 50
    });
    assert.strictEqual(mod.score, 38);
    assert.strictEqual(mod.riskLevel, 'SUSPICIOUS');

    // High risk: 70 * 0.35 (24.5) + 80 * 0.40 (32) + 60 * 0.15 (9) = 65.5 -> 66
    const high = calculate_threat_score({
      abuseConfidenceScore: 70,
      maliciousDetectionsRatio: 80,
      vulnerabilityExposureScore: 60
    });
    assert.strictEqual(high.score, 66);
    assert.strictEqual(high.riskLevel, 'HIGH');
    assert.strictEqual(high.badgeColor, '#f97316');
  });

  it('should apply additive modifiers (C2, Botnet, Phishing, Tor)', () => {
    // Base: 40 + C2 (+25) = 65 -> HIGH
    const c2Result = calculate_threat_score({
      maliciousDetectionsRatio: 100, // 40
      isC2FeedPresent: true          // +25
    });
    assert.strictEqual(c2Result.score, 65);
    assert.strictEqual(c2Result.modifiersApplied.length, 1);
    assert.strictEqual(c2Result.modifiersApplied[0].modifier, 25);

    // Botnet (+15) and Tor Exit Node (+10)
    const multiModifiers = calculate_threat_score({
      abuseConfidenceScore: 40,      // 14
      isBotnetActor: true,           // +15
      isTorExitNode: true            // +10
    });
    assert.strictEqual(multiModifiers.score, 39); // 14 + 15 + 10 = 39
    assert.strictEqual(multiModifiers.riskLevel, 'SUSPICIOUS');
  });

  it('should apply subtractive modifiers for whitelisted or verified infrastructure', () => {
    // Base 50 - 40 (Whitelisted) = 10 -> LOW
    const whitelisted = calculate_threat_score({
      maliciousDetectionsRatio: 100, // 40
      vulnerabilityExposureScore: 66.67, // 10
      isWhitelistedBenign: true     // -40
    });
    assert.strictEqual(whitelisted.score, 10);
    assert.strictEqual(whitelisted.riskLevel, 'LOW');
  });

  it('should strictly clamp upper bound at 100 and lower bound at 0', () => {
    // Upper bound overflow
    const overflow = calculate_threat_score({
      abuseConfidenceScore: 100,
      maliciousDetectionsRatio: 100,
      vulnerabilityExposureScore: 100,
      isC2FeedPresent: true,
      isBotnetActor: true
    });
    assert.strictEqual(overflow.score, 100);
    assert.ok(overflow.rawScore > 100);

    // Lower bound underflow
    const underflow = calculate_threat_score({
      abuseConfidenceScore: 10,
      isWhitelistedBenign: true // -40
    });
    assert.strictEqual(underflow.score, 0);
    assert.ok(underflow.rawScore < 0);
  });

  it('should clamp out-of-range input parameters gracefully', () => {
    const outOfBounds = calculate_threat_score({
      abuseConfidenceScore: 999, // Should be clamped to 100
      maliciousDetectionsRatio: -50 // Should be clamped to 0
    });
    assert.strictEqual(outOfBounds.score, 35); // 100 * 0.35 + 0
  });

  it('should calculate confidence percentage based on data completeness', () => {
    const minimal = calculate_threat_score({ abuseConfidenceScore: 50 });
    assert.ok(minimal.confidencePercentage > 0 && minimal.confidencePercentage <= 30);

    const full = calculate_threat_score({
      abuseConfidenceScore: 80,
      maliciousDetectionsRatio: 90,
      vulnerabilityExposureScore: 40,
      suspiciousActivityScore: 30,
      isC2FeedPresent: true
    });
    assert.strictEqual(full.confidencePercentage, 100);
  });
});
