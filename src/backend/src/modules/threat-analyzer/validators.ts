import { isIP } from 'node:net';
import { domainToASCII } from 'node:url';
/**
 * KapiTrace Threat Analyzer — Input Validation Module
 * Conforming to RFC 791 (IPv4), RFC 4291 / RFC 5952 (IPv6), RFC 1035 / RFC 1123 (FQDN),
 * and Cryptographic Hash specifications (MD5, SHA-1, SHA-256).
 */

export interface ValidationResult {
  isValid: boolean;
  type?: 'ipv4' | 'ipv6' | 'domain' | 'hash';
  error?: string;
  details?: Record<string, unknown>;
}

export interface HashValidationResult extends ValidationResult {
  algorithm?: 'md5' | 'sha1' | 'sha256';
  bitLength?: number;
}

export interface DomainValidationResult extends ValidationResult {
  labelsCount?: number;
  tld?: string;
  isPunycode?: boolean;
}

export interface IPValidationResult extends ValidationResult {
  version?: 4 | 6;
  isPrivate?: boolean;
  isLoopback?: boolean;
  isMulticast?: boolean;
  isLinkLocal?: boolean;
}

// ============================================================================
// 1. IPv4 VALIDATION (RFC 791)
// ============================================================================

/**
 * Validates strictly whether an input is a canonical IPv4 address.
 * Rejects leading zeros in octets (e.g. 010.0.0.1) to eliminate octal ambiguity,
 * negative numbers, numbers > 255, non-digits, and incomplete representations.
 */
export function isValidIPv4(ip: string): boolean {
  if (typeof ip !== 'string' || !ip.trim()) {
    return false;
  }

  const trimmed = ip.trim();
  const octets = trimmed.split('.');

  if (octets.length !== 4) {
    return false;
  }

  for (let i = 0; i < 4; i++) {
    const octetStr = octets[i];

    // Must be purely digits
    if (!/^\d+$/.test(octetStr)) {
      return false;
    }

    // Leading zero forbidden if length > 1 (e.g. "01", "002")
    if (octetStr.length > 1 && octetStr.startsWith('0')) {
      return false;
    }

    const octetNum = Number(octetStr);
    if (isNaN(octetNum) || octetNum < 0 || octetNum > 255) {
      return false;
    }
  }

  return true;
}

/**
 * Detailed IPv4 validator providing classification and error feedback.
 */
export function validateIPv4(ip: string): IPValidationResult {
  if (typeof ip !== 'string' || !ip.trim()) {
    return {
      isValid: false,
      error: 'Empty or non-string IPv4 address provided'
    };
  }

  const trimmed = ip.trim();
  const octets = trimmed.split('.');

  if (octets.length !== 4) {
    return {
      isValid: false,
      error: `IPv4 address must have exactly 4 octets, got ${octets.length}`
    };
  }

  const parsedOctets: number[] = [];

  for (let i = 0; i < 4; i++) {
    const octetStr = octets[i];

    if (!/^\d+$/.test(octetStr)) {
      return {
        isValid: false,
        error: `Octet ${i + 1} contains non-numeric characters: "${octetStr}"`
      };
    }

    if (octetStr.length > 1 && octetStr.startsWith('0')) {
      return {
        isValid: false,
        error: `Octet ${i + 1} contains prohibited leading zero: "${octetStr}"`
      };
    }

    const octetNum = parseInt(octetStr, 10);
    if (octetNum < 0 || octetNum > 255) {
      return {
        isValid: false,
        error: `Octet ${i + 1} is out of valid range (0-255): ${octetNum}`
      };
    }

    parsedOctets.push(octetNum);
  }

  const [o1, o2, o3, o4] = parsedOctets;

  // RFC 1918 Private Ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  const isPrivate =
    o1 === 10 ||
    (o1 === 172 && o2 >= 16 && o2 <= 31) ||
    (o1 === 192 && o2 === 168);

  // RFC 1122 Loopback: 127.0.0.0/8
  const isLoopback = o1 === 127;

  // RFC 5771 Multicast: 224.0.0.0/4 (224-239)
  const isMulticast = o1 >= 224 && o1 <= 239;

  // RFC 3927 Link-Local: 169.254.0.0/16
  const isLinkLocal = o1 === 169 && o2 === 254;

  return {
    isValid: true,
    type: 'ipv4',
    version: 4,
    isPrivate,
    isLoopback,
    isMulticast,
    isLinkLocal,
    details: {
      canonical: `${o1}.${o2}.${o3}.${o4}`,
      octets: parsedOctets
    }
  };
}

// ============================================================================
// 2. IPv6 VALIDATION (RFC 4291 / RFC 5952)
// ============================================================================

/**
 * Validates IPv6 addresses according to standard hexadecimal representation,
 * allowing single '::' zero-compression and optional embedded IPv4 notation.
 */
export function isValidIPv6(ip: string): boolean {
  return typeof ip === 'string' && !ip.includes('%') && isIP(ip.trim()) === 6;
}

/**
 * Detailed IPv6 validator with diagnostic details.
 */
export function validateIPv6(ip: string): IPValidationResult {
  const valid = isValidIPv6(ip);
  if (!valid) {
    return {
      isValid: false,
      error: 'Invalid IPv6 address format. Violates RFC 4291 / RFC 5952 standard.'
    };
  }

  const trimmed = new URL(`http://[${ip.trim()}]/`).hostname.slice(1, -1);
  const first = parseInt(trimmed.split(':')[0], 16) || 0;
  const isLoopback = trimmed === '::1';
  const isLinkLocal = (first & 0xffc0) === 0xfe80;
  const isMulticast = (first & 0xff00) === 0xff00;

  return {
    isValid: true,
    type: 'ipv6',
    version: 6,
    isPrivate: (first & 0xfe00) === 0xfc00,
    isLoopback,
    isLinkLocal,
    isMulticast,
    details: {
      canonical: trimmed
    }
  };
}

// ============================================================================
// 3. CRYPTOGRAPHIC HASH VALIDATION (MD5, SHA-1, SHA-256)
// ============================================================================

const MD5_REGEX = /^[a-fA-F0-9]{32}$/;
const SHA1_REGEX = /^[a-fA-F0-9]{40}$/;
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;

/**
 * Checks if string is a valid cryptographic hash (MD5, SHA-1, or SHA-256).
 */
export function isValidHash(hash: string): boolean {
  if (typeof hash !== 'string' || !hash.trim()) {
    return false;
  }
  const clean = hash.trim();
  return MD5_REGEX.test(clean) || SHA1_REGEX.test(clean) || SHA256_REGEX.test(clean);
}

/**
 * Validates and identifies the cryptographic hash algorithm and bit length.
 */
export function validateHash(hash: string): HashValidationResult {
  if (typeof hash !== 'string' || !hash.trim()) {
    return {
      isValid: false,
      error: 'Empty or non-string hash value provided'
    };
  }

  const clean = hash.trim().toLowerCase();

  if (MD5_REGEX.test(clean)) {
    return {
      isValid: true,
      type: 'hash',
      algorithm: 'md5',
      bitLength: 128,
      details: { hash: clean }
    };
  }

  if (SHA1_REGEX.test(clean)) {
    return {
      isValid: true,
      type: 'hash',
      algorithm: 'sha1',
      bitLength: 160,
      details: { hash: clean }
    };
  }

  if (SHA256_REGEX.test(clean)) {
    return {
      isValid: true,
      type: 'hash',
      algorithm: 'sha256',
      bitLength: 256,
      details: { hash: clean }
    };
  }

  // Diagnostic feedback for invalid hashes
  let errorMsg = 'Invalid cryptographic hash format.';
  if (!/^[a-f0-9]+$/i.test(clean)) {
    errorMsg = 'Hash contains illegal non-hexadecimal characters.';
  } else {
    errorMsg = `Invalid hash length of ${clean.length} characters (expected 32 for MD5, 40 for SHA-1, or 64 for SHA-256).`;
  }

  return {
    isValid: false,
    error: errorMsg
  };
}

// ============================================================================
// 4. DOMAIN FQDN VALIDATION (RFC 1035 / RFC 1123)
// ============================================================================

/**
 * Validates FQDN (Fully Qualified Domain Name) according to RFC 1035 and RFC 1123.
 * - Total length <= 253 chars
 * - Labels separated by dots, each 1 to 63 chars
 * - Permitted chars: [a-zA-Z0-9-]
 * - Labels cannot begin or end with a hyphen
 * - TLD must be >= 2 characters and strictly alphabetical (or valid punycode xn--)
 * - Rejects double-dots
 */
export function isValidDomain(domain: string): boolean {
  if (typeof domain !== 'string' || !domain.trim()) {
    return false;
  }

  let cleaned = domain.trim();

  // Strip trailing dot if present (root zone delimiter)
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  // Total length must not exceed 253 characters
  if (cleaned.length === 0 || cleaned.length > 253) {
    return false;
  }

  // Reject consecutive dots
  if (cleaned.includes('..')) {
    return false;
  }

  const labels = cleaned.split('.');
  if (labels.length < 2) {
    return false;
  }

  // Check each label
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const isTld = i === labels.length - 1;

    if (label.length === 0 || label.length > 63) {
      return false;
    }

    // Label cannot start or end with hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }

    // Validate characters: must be alphanumeric or hyphen
    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return false;
    }

    // If it's the TLD
    if (isTld) {
      // Must be at least 2 chars
      if (label.length < 2) {
        return false;
      }
      // If Punycode (IDN)
      if (label.toLowerCase().startsWith('xn--')) {
        if (!/^[a-zA-Z0-9]+$/.test(label.slice(4))) {
          return false;
        }
      } else {
        // Standard TLD must be strictly letters
        if (!/^[a-zA-Z]+$/.test(label)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Detailed Domain validator with RFC diagnostic information.
 */
export function validateDomain(domain: string): DomainValidationResult {
  if (typeof domain !== 'string' || !domain.trim()) {
    return {
      isValid: false,
      error: 'Empty or non-string domain name provided'
    };
  }

  let cleaned = domain.trim();
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  if (cleaned.length === 0) {
    return {
      isValid: false,
      error: 'Domain name cannot be empty'
    };
  }

  if (cleaned.length > 253) {
    return {
      isValid: false,
      error: `Domain name exceeds maximum permitted RFC length of 253 characters (got ${cleaned.length})`
    };
  }

  if (cleaned.includes('..')) {
    return {
      isValid: false,
      error: 'Domain name contains consecutive dots ("..")'
    };
  }

  const labels = cleaned.split('.');
  if (labels.length < 2) {
    return {
      isValid: false,
      error: 'Domain name must contain at least a name and a top-level domain (TLD)'
    };
  }

  if (!isValidDomain(cleaned)) return { isValid: false, error: 'Invalid RFC domain' };

  const isPunycode = cleaned.toLowerCase().includes('xn--');

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const isTld = i === labels.length - 1;

    if (label.length === 0 || label.length > 63) {
      return {
        isValid: false,
        error: `Label "${label}" length (${label.length}) violates RFC 1035 (must be between 1 and 63 characters)`
      };
    }

    if (label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: `Label "${label}" cannot begin or end with a hyphen`
      };
    }

    if (!/^[a-zA-Z0-9-]+$/.test(label)) {
      return {
        isValid: false,
        error: `Label "${label}" contains illegal characters (only [a-zA-Z0-9-] are allowed)`
      };
    }

    if (isTld) {
      if (label.length < 2) {
        return {
          isValid: false,
          error: `Top-level domain (TLD) "${label}" must be at least 2 characters long`
        };
      }
      if (!label.toLowerCase().startsWith('xn--') && !/^[a-zA-Z]+$/.test(label)) {
        return {
          isValid: false,
          error: `Top-level domain (TLD) "${label}" must contain only alphabetic characters`
        };
      }
    }
  }

  const tld = labels[labels.length - 1].toLowerCase();

  return {
    isValid: true,
    type: 'domain',
    labelsCount: labels.length,
    tld,
    isPunycode,
    details: {
      canonical: cleaned.toLowerCase(),
      labels
    }
  };
}

// ============================================================================
// 5. COMPREHENSIVE INDICATOR TYPE DETECTION
// ============================================================================

/**
 * Detects the indicator category: 'ip', 'domain', 'hash', or 'unknown'.
 */
export function detectIndicatorType(indicator: string): 'ip' | 'domain' | 'hash' | 'unknown' {
  if (typeof indicator !== 'string') {
    return 'unknown';
  }

  const clean = indicator.trim();
  if (!clean) {
    return 'unknown';
  }

  if (isValidIPv4(clean) || isValidIPv6(clean)) {
    return 'ip';
  }

  if (isValidHash(clean)) {
    return 'hash';
  }

  if (isValidDomain(clean)) {
    return 'domain';
  }

  return 'unknown';
}

/** Normalize only valid IOC syntax; never interpret input as a URL. */
export function normalizeIndicator(type: string, input: unknown): string {
  if (typeof input !== 'string' || /[\u0000-\u001f\u007f]/.test(input)) throw new Error('Invalid indicator');
  const value = input.trim().toLowerCase();
  if (type === 'hash' && isValidHash(value)) return value;
  if (type === 'domain') {
    if (!/^[\p{L}\p{N}.\-]+$/u.test(value)) throw new Error('Invalid domain');
    const ascii = domainToASCII(value.replace(/\.$/, ''));
    if (isValidDomain(ascii)) return ascii;
  }
  if (type === 'ip' && isIP(value) && !value.includes('%')) {
    const canonical = isIP(value) === 6 ? new URL(`http://[${value}]/`).hostname.slice(1, -1) : value;
    if (!isPublicIp(canonical)) throw new Error('Only public IP addresses can be queried');
    return canonical;
  }
  throw new Error('Invalid indicator or unsupported type');
}

export function isPublicIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 100 && b >= 64 && b <= 127);
  }
  if (isIP(ip) !== 6) return false;
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  if (canonical === '::' || canonical === '::1') return false;
  if (canonical.startsWith('::ffff:')) {
    const groups = canonical.slice(7).split(':').map(part => parseInt(part, 16));
    if (groups.length !== 2) return false;
    return isPublicIp(`${groups[0] >> 8}.${groups[0] & 255}.${groups[1] >> 8}.${groups[1] & 255}`);
  }
  // Only global unicast; excludes ULA, multicast, link-local and translation/compatible special ranges.
  const first = parseInt(canonical.split(':')[0], 16);
  return first >= 0x2000 && first <= 0x3fff;
}
