import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isValidIPv4,
  validateIPv4,
  isValidIPv6,
  validateIPv6,
  isValidHash,
  validateHash,
  isValidDomain,
  validateDomain,
  detectIndicatorType
} from '../../src/backend/src/modules/threat-analyzer/validators';

describe('Unit Tests: Input Validators (RFC-compliant)', () => {
  // ==========================================================================
  // IPv4 Validation
  // ==========================================================================
  describe('IPv4 Validation (RFC 791)', () => {
    it('should validate canonical public and private IPv4 addresses', () => {
      const validIps = [
        '127.0.0.1',
        '8.8.8.8',
        '1.1.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '172.31.255.254',
        '192.168.1.1',
        '0.0.0.0',
        '255.255.255.255',
        '198.51.100.14'
      ];

      for (const ip of validIps) {
        assert.strictEqual(isValidIPv4(ip), true, `Expected "${ip}" to be valid IPv4`);
        const res = validateIPv4(ip);
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(res.version, 4);
      }
    });

    it('should correctly classify IPv4 private, loopback, multicast and link-local ranges', () => {
      assert.strictEqual(validateIPv4('10.200.0.1').isPrivate, true);
      assert.strictEqual(validateIPv4('172.20.10.5').isPrivate, true);
      assert.strictEqual(validateIPv4('192.168.100.50').isPrivate, true);
      assert.strictEqual(validateIPv4('127.0.0.1').isLoopback, true);
      assert.strictEqual(validateIPv4('224.0.0.1').isMulticast, true);
      assert.strictEqual(validateIPv4('169.254.1.1').isLinkLocal, true);
      assert.strictEqual(validateIPv4('8.8.8.8').isPrivate, false);
    });

    it('should strictly reject invalid IPv4 addresses and edge cases', () => {
      const invalidIps = [
        '256.0.0.1',        // Octet > 255
        '192.168.1.256',    // Octet > 255
        '01.2.3.4',         // Leading zero (octal ambiguity)
        '192.168.01.1',     // Leading zero
        '192.168.001.1',    // Leading zeros
        '-1.0.0.1',         // Negative
        '192.168.1',        // Missing octet
        '192.168.1.1.1',    // Extra octet
        '192.168.1.a',      // Non-numeric
        '192.168.1. 1',     // Space inside
        '192.168..1',       // Empty octet
        'abc.def.ghi.jkl',  // Letters
        '',                 // Empty string
        '   ',              // Whitespace only
        '192.168.1.1/24'    // CIDR notation (not pure host IP)
      ];

      for (const ip of invalidIps) {
        assert.strictEqual(isValidIPv4(ip), false, `Expected "${ip}" to be invalid IPv4`);
        const res = validateIPv4(ip);
        assert.strictEqual(res.isValid, false);
        assert.ok(res.error, `Expected diagnostic error for "${ip}"`);
      }
    });
  });

  // ==========================================================================
  // IPv6 Validation
  // ==========================================================================
  describe('IPv6 Validation (RFC 4291 / RFC 5952)', () => {
    it('should validate canonical and compressed IPv6 addresses', () => {
      const validV6 = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3::8a2e:370:7334',
        '::1',
        '::',
        'fe80::1',
        'fe80::200:5aee:feaa:20a2',
        'ff02::1',
        '::ffff:192.0.2.128',
        '2001:4860:4860::8888'
      ];

      for (const ip of validV6) {
        assert.strictEqual(isValidIPv6(ip), true, `Expected "${ip}" to be valid IPv6`);
        const res = validateIPv6(ip);
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(res.version, 6);
      }
    });

    it('should reject malformed IPv6 addresses', () => {
      const invalidV6 = [
        '2001::db8::1',               // Multiple :: compression
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra', // Too many groups
        '2001:0db8:85a3:0000:0000:8a2e:0370', // Too few groups without ::
        '2001:ghij::1',               // Non-hex character
        '2001:00000::1',              // Group length > 4
        ':::1',                       // Triple colon
        '',                           // Empty
        '127.0.0.1'                   // IPv4 passed to IPv6
      ];

      for (const ip of invalidV6) {
        assert.strictEqual(isValidIPv6(ip), false, `Expected "${ip}" to be invalid IPv6`);
      }
    });
  });

  // ==========================================================================
  // Cryptographic Hash Validation
  // ==========================================================================
  describe('Cryptographic Hash Validation (MD5, SHA-1, SHA-256)', () => {
    const sampleMD5 = 'd41d8cd98f00b204e9800998ecf8427e';
    const sampleSHA1 = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
    const sampleSHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    it('should accept valid MD5, SHA-1 and SHA-256 hashes in lower and upper case', () => {
      assert.strictEqual(isValidHash(sampleMD5), true);
      assert.strictEqual(isValidHash(sampleMD5.toUpperCase()), true);
      const resMD5 = validateHash(sampleMD5);
      assert.strictEqual(resMD5.isValid, true);
      assert.strictEqual(resMD5.algorithm, 'md5');
      assert.strictEqual(resMD5.bitLength, 128);

      assert.strictEqual(isValidHash(sampleSHA1), true);
      const resSHA1 = validateHash(sampleSHA1);
      assert.strictEqual(resSHA1.isValid, true);
      assert.strictEqual(resSHA1.algorithm, 'sha1');
      assert.strictEqual(resSHA1.bitLength, 160);

      assert.strictEqual(isValidHash(sampleSHA256), true);
      const resSHA256 = validateHash(sampleSHA256);
      assert.strictEqual(resSHA256.isValid, true);
      assert.strictEqual(resSHA256.algorithm, 'sha256');
      assert.strictEqual(resSHA256.bitLength, 256);
    });

    it('should reject invalid hashes (wrong lengths, non-hex characters)', () => {
      const invalidHashes = [
        'd41d8cd98f00b204e9800998ecf8427',   // 31 chars (1 short of MD5)
        'd41d8cd98f00b204e9800998ecf8427ee', // 33 chars
        sampleMD5.slice(0, 31) + 'z',        // Non-hex 'z'
        sampleSHA1.slice(0, 39) + 'x',       // Non-hex 'x'
        sampleSHA256.slice(0, 63) + 'g',     // Non-hex 'g'
        '',
        'not-a-hash'
      ];

      for (const h of invalidHashes) {
        assert.strictEqual(isValidHash(h), false, `Expected "${h}" to be invalid hash`);
        const res = validateHash(h);
        assert.strictEqual(res.isValid, false);
      }
    });
  });

  // ==========================================================================
  // Domain FQDN Validation
  // ==========================================================================
  describe('Domain FQDN Validation (RFC 1035 / RFC 1123)', () => {
    it('should validate RFC compliant domain names and subdomains', () => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'sec-ops.corp.internal.net',
        'threat-intel.co.uk',
        'a.b.c.d.org',
        'xn--bcher-kva.ch', // Valid Punycode
        'deeply-nested.sub.domain.sample.edu'
      ];

      for (const domain of validDomains) {
        assert.strictEqual(isValidDomain(domain), true, `Expected "${domain}" to be valid domain`);
        const res = validateDomain(domain);
        assert.strictEqual(res.isValid, true);
        assert.ok((res.labelsCount || 0) >= 2);
      }
    });

    it('should reject non-compliant domain names', () => {
      const invalidDomains = [
        '-invalid.com',                      // Starts with hyphen
        'invalid-.com',                      // Ends with hyphen
        'sub.-bad.org',                      // Label starts with hyphen
        'sub.bad-.org',                      // Label ends with hyphen
        'domain..com',                       // Consecutive dots
        'nodot',                             // Single label without TLD
        'domain.c',                          // TLD with single letter
        'domain.123',                        // Numeric TLD
        'a'.repeat(64) + '.com',             // Label > 63 chars
        'a'.repeat(60) + '.' + 'b'.repeat(60) + '.' + 'c'.repeat(60) + '.' + 'd'.repeat(60) + '.' + 'e'.repeat(20) + '.com', // Total > 253 chars
        'domain with spaces.com',            // Spaces
        'http://example.com',                // URL with protocol
        ''
      ];

      for (const d of invalidDomains) {
        assert.strictEqual(isValidDomain(d), false, `Expected "${d}" to be invalid domain`);
        const res = validateDomain(d);
        assert.strictEqual(res.isValid, false);
      }
    });
  });

  // ==========================================================================
  // Automatic Indicator Detection
  // ==========================================================================
  describe('detectIndicatorType', () => {
    it('should detect the correct indicator type automatically', () => {
      assert.strictEqual(detectIndicatorType('192.168.1.1'), 'ip');
      assert.strictEqual(detectIndicatorType('2001:db8::1'), 'ip');
      assert.strictEqual(detectIndicatorType('d41d8cd98f00b204e9800998ecf8427e'), 'hash');
      assert.strictEqual(detectIndicatorType('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'), 'hash');
      assert.strictEqual(detectIndicatorType('malicious-c2.net'), 'domain');
      assert.strictEqual(detectIndicatorType('unknown!@@#$'), 'unknown');
    });
  });
});
