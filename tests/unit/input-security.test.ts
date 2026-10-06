import { it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIndicator, isValidIPv6 } from '../../src/backend/src/modules/threat-analyzer/validators';
it('canonicalizes IPv6, domain IDN/root dot and all supported hash sizes', () => {
  assert.equal(normalizeIndicator('ip', '2001:4860:0000:0000:0000:0000:0000:8888'), '2001:4860::8888');
  assert.equal(normalizeIndicator('domain', ' BÜCHER.ch. '), 'xn--bcher-kva.ch');
  for (const length of [32,40,64]) assert.equal(normalizeIndicator('hash', 'A'.repeat(length)), 'a'.repeat(length));
});
it('rejects private/special IPs including mapped IPv6 and injection syntax', () => {
  for (const input of ['10.0.0.1','127.0.0.1','169.254.2.3','172.16.0.1','192.168.0.1','224.1.1.1','0.0.0.0','::1','::','fc00::1','fe90::1','ff02::1','::ffff:192.168.0.1','::ffff:c0a8:1']) assert.throws(() => normalizeIndicator('ip', input), input);
  for (const input of ['example.com:80','http://example.com','a.com/path','x@y.com','a.com\u0000','a..com', '-a.com', 'a'.repeat(64)+'.com', 'example.xn--']) assert.throws(() => normalizeIndicator('domain', input), input);
  assert.throws(() => normalizeIndicator('email', 'a@example.com'));
  assert.equal(isValidIPv6('fe80::1%eth0'), false);
  assert.equal(isValidIPv6(':192.0.2.1'), false);
});
