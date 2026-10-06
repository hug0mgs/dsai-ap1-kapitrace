/**
 * KapiTrace Threat Analyzer — ThreatScore Unified Engine
 * Implements deterministic linear combination weighting, modifier evaluation,
 * strict clamping [0, 100], and risk categorization adhering to SPEC-2026-10-01.
 */

export type RiskLevel = 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL';

export interface ThreatFactors {
  /** Abuse confidence score from AbuseIPDB or similar reputation feed (0 to 100) */
  abuseConfidenceScore?: number;

  /** Ratio of security engines reporting malicious activity (0 to 100) */
  maliciousDetectionsRatio?: number;

  /** Vulnerability and port exposure score based on Shodan / open CVEs (0 to 100) */
  vulnerabilityExposureScore?: number;

  /** Noise, suspicious scanning or unsolicited activity score (0 to 100) */
  suspiciousActivityScore?: number;

  /** Active command-and-control (C2) botnet feed presence (+25 modifier) */
  isC2FeedPresent?: boolean;

  /** Associated with confirmed botnet or DDoS campaign (+15 modifier) */
  isBotnetActor?: boolean;

  /** Associated with active phishing or credential harvesting (+15 modifier) */
  isPhishingHost?: boolean;

  /** Operating as an active Tor exit node (+10 modifier) */
  isTorExitNode?: boolean;

  /** Explicitly whitelisted or recognized canonical public service (-40 modifier) */
  isWhitelistedBenign?: boolean;

  /** Verified legitimate cloud / CDN infrastructure provider (-20 modifier) */
  isVerifiedInfrastructure?: boolean;

  /** Optional raw reports count */
  totalReportsCount?: number;
}

export interface FactorBreakdown {
  name: string;
  weight: number;
  inputScore: number | null;
  weightedScore: number;
  description: string;
}

export interface ModifierBreakdown {
  name: string;
  modifier: number;
  description: string;
}

export interface ThreatScoreResult {
  /** Unified final score strictly bounded between 0 and 100 */
  score: number;

  /** Raw unbounded computed score prior to clamping */
  rawScore: number;

  /** Categorized risk tier */
  riskLevel: RiskLevel;

  /** Human-readable risk description */
  riskDescription: string;

  /** Recommended incident response action */
  recommendedAction: string;

  /** UI color badge identifier */
  badgeColor: string;

  /** Detailed component metrics contributing to the score */
  factorBreakdowns: FactorBreakdown[];

  /** Additive and subtractive modifiers triggered */
  modifiersApplied: ModifierBreakdown[];

  /** Confidence calculation metric (0 to 100%) */
  confidencePercentage: number;
}

// Normalized weights conforming to SPEC-2026-10-01
export const WEIGHT_ABUSE = 0.35;
export const WEIGHT_MALICIOUS_DETECTIONS = 0.40;
export const WEIGHT_VULNERABILITY = 0.15;
export const WEIGHT_ACTIVITY = 0.10;

/**
 * Pure calculation function for the unified ThreatScore.
 * Adheres to:
 * S_raw = sum(w_i * M_i) / sum(available w_i) + sum(B_k)
 * ThreatScore = min(100, max(0, round(S_raw)))
 */
export function calculate_threat_score(factors: ThreatFactors = {}, type: 'ip' | 'domain' | 'hash' = 'ip'): ThreatScoreResult | null {
  // Normalize input factors, ensuring they reside within [0, 100]
  const clampInput = (val?: number): number => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return 0;
    return Math.min(100, Math.max(0, val));
  };

  const abuse = clampInput(factors.abuseConfidenceScore);
  const malicious = clampInput(factors.maliciousDetectionsRatio);
  const vulnerability = clampInput(factors.vulnerabilityExposureScore);
  const activity = clampInput(factors.suspiciousActivityScore);

  // Compute weighted factor contributions
  const factorBreakdowns: FactorBreakdown[] = [
    {
      name: 'Abuse Confidence Index',
      weight: WEIGHT_ABUSE,
      inputScore: abuse,
      weightedScore: Number((abuse * WEIGHT_ABUSE).toFixed(2)),
      description: 'Historical abuse reports, complaint frequency and reporter credibility'
    },
    {
      name: 'Malicious Engine Detections',
      weight: WEIGHT_MALICIOUS_DETECTIONS,
      inputScore: malicious,
      weightedScore: Number((malicious * WEIGHT_MALICIOUS_DETECTIONS).toFixed(2)),
      description: 'Consensus from multi-vendor antivirus and threat intelligence engines'
    },
    {
      name: 'Vulnerability & Port Exposure',
      weight: WEIGHT_VULNERABILITY,
      inputScore: vulnerability,
      weightedScore: Number((vulnerability * WEIGHT_VULNERABILITY).toFixed(2)),
      description: 'Perimeter scanning, open critical ports, and unpatched CVEs'
    },
    {
      name: 'Suspicious Activity & Scans',
      weight: WEIGHT_ACTIVITY,
      inputScore: activity,
      weightedScore: Number((activity * WEIGHT_ACTIVITY).toFixed(2)),
      description: 'Internet-wide telemetry, port scanning activity, and Honeypot triggers'
    }
  ];

  const supplied = [factors.abuseConfidenceScore, factors.maliciousDetectionsRatio, factors.vulnerabilityExposureScore, factors.suspiciousActivityScore];
  const applicable = type === 'ip' ? [true, true, true, true] : [false, true, false, false];
  const available = supplied.map((value, index) => applicable[index] && typeof value === 'number' && Number.isFinite(value));
  const availableWeight = factorBreakdowns.reduce((sum, factor, index) => sum + (available[index] ? factor.weight : 0), 0);
  if (!availableWeight) return null;
  const applicableWeight = type === 'ip' ? 1 : WEIGHT_MALICIOUS_DETECTIONS;
  factorBreakdowns.forEach((factor, index) => {
    factor.inputScore = available[index] ? factor.inputScore : null;
    factor.weight = available[index] ? factor.weight / availableWeight : 0;
    factor.weightedScore = factor.inputScore === null ? 0 : factor.inputScore * factor.weight;
  });
  const baseWeightedSum = factorBreakdowns.reduce((acc, f) => acc + f.weightedScore, 0);

  // Modifiers evaluation
  const modifiersApplied: ModifierBreakdown[] = [];

  if (factors.isC2FeedPresent) {
    modifiersApplied.push({
      name: 'Active C2 Infrastructure',
      modifier: 25,
      description: 'Confirmed presence in active Command and Control botnet feed'
    });
  }

  if (factors.isBotnetActor) {
    modifiersApplied.push({
      name: 'Botnet / DDoS Campaign Actor',
      modifier: 15,
      description: 'Host identified participating in automated brute-force or DDoS swarms'
    });
  }

  if (factors.isPhishingHost) {
    modifiersApplied.push({
      name: 'Active Phishing Host',
      modifier: 15,
      description: 'Domain or IP hosting active phishing or brand credential lures'
    });
  }

  if (factors.isTorExitNode) {
    modifiersApplied.push({
      name: 'Tor Exit Node',
      modifier: 10,
      description: 'Anonymized routing exit point frequently abused for evasive traffic'
    });
  }

  if (factors.isWhitelistedBenign) {
    modifiersApplied.push({
      name: 'Whitelisted Benign Entity',
      modifier: -40,
      description: 'Globally trusted major infrastructure (e.g. Quad9, Cloudflare, Root DNS)'
    });
  }

  if (factors.isVerifiedInfrastructure) {
    modifiersApplied.push({
      name: 'Verified Enterprise Infrastructure',
      modifier: -20,
      description: 'Authentic recognized cloud service or corporate mail relay'
    });
  }

  const modifiersSum = modifiersApplied.reduce((acc, m) => acc + m.modifier, 0);

  const rawScore = baseWeightedSum + modifiersSum;
  const boundedScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Risk Tier classification
  let riskLevel: RiskLevel;
  let riskDescription: string;
  let recommendedAction: string;
  let badgeColor: string;

  if (boundedScore >= 80) {
    riskLevel = 'CRITICAL';
    riskDescription = 'Critical Threat: Confirmed malicious entity posing imminent organizational risk.';
    recommendedAction = 'Immediate automated perimeter firewall drop and proactive host isolation.';
    badgeColor = '#ef4444'; // Red
  } else if (boundedScore >= 50) {
    riskLevel = 'HIGH';
    riskDescription = 'High Risk: Strong indicators of malicious activity, abuse, or serious exposure.';
    recommendedAction = 'Quarantine or enforce strict ingress/egress filtering and monitor closely.';
    badgeColor = '#f97316'; // Orange
  } else if (boundedScore >= 20) {
    riskLevel = 'SUSPICIOUS';
    riskDescription = 'Suspicious: Anomalous telemetry, moderate scan activity, or low-confidence reports.';
    recommendedAction = 'Log telemetry, flag in SIEM, and place indicator on active watchlist.';
    badgeColor = '#eab308'; // Yellow
  } else {
    riskLevel = 'LOW';
    riskDescription = 'Low / Clean: Indicator exhibits clean reputation with no significant malicious telemetry.';
    recommendedAction = 'Standard operational posture; no restriction or mitigation needed.';
    badgeColor = '#22c55e'; // Green
  }

  // Confidence reports evidence coverage, never modifier count.
  const confidencePercentage = Math.min(100, Math.round(availableWeight / applicableWeight * 100));

  return {
    score: boundedScore,
    rawScore,
    riskLevel,
    riskDescription,
    recommendedAction,
    badgeColor,
    factorBreakdowns,
    modifiersApplied,
    confidencePercentage
  };
}
