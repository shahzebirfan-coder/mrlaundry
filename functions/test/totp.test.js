'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { base32Encode, base32Decode, hotp, verifyTotp, generateSecret, createRecoveryCodes, normalizeRecoveryCode, hashRecoveryCode, safeEqualHex } = require('../lib/totp');

test('Base32 encoding round-trips bytes', () => {
  const input = Buffer.from('Hello, Mr Laundry', 'utf8');
  assert.deepEqual(base32Decode(base32Encode(input)), input);
});

test('HOTP matches RFC 4226 six-digit vector at counter zero', () => {
  // RFC key "12345678901234567890" encoded as Base32.
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(hotp(secret, 0, 6), '755224');
});

test('TOTP matches RFC 6238 SHA-1 six-digit vector and prevents replay', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  const step = Math.floor(59000 / 30000);
  const code = hotp(secret, step, 6);
  assert.equal(code, '287082');
  assert.equal(verifyTotp(secret, code, 59000, 0, -1), step);
  assert.equal(verifyTotp(secret, code, 59000, 0, step), null);
});

test('Generated recovery codes are unique, normalized, and hashable', () => {
  const codes = createRecoveryCodes(10);
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.match(codes[0], /^[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/);
  assert.equal(normalizeRecoveryCode(codes[0]), codes[0].replace(/-/g, ''));
  const key = Buffer.alloc(32, 7);
  assert.equal(safeEqualHex(hashRecoveryCode(codes[0], key), hashRecoveryCode(codes[0], key)), true);
  assert.equal(safeEqualHex(hashRecoveryCode(codes[0], key), hashRecoveryCode(codes[1], key)), false);
});

test('Generated authenticator secret is decodable and sufficiently long', () => {
  const secret = generateSecret();
  assert.equal(base32Decode(secret).length, 20);
});
