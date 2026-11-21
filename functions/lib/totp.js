'use strict';

const crypto = require('node:crypto');
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(input) {
  const bytes = Buffer.from(input);
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(text) {
  const clean = String(text || '').toUpperCase().replace(/=+$/g, '').replace(/[\s-]/g, '');
  if (!clean || /[^A-Z2-7]/.test(clean)) throw new Error('Invalid Base32 secret');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateSecret(byteLength = 20) {
  return base32Encode(crypto.randomBytes(byteLength));
}

function hotp(secret, counter, digits = 6) {
  const key = base32Decode(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % (10 ** digits)).padStart(digits, '0');
}

function verifyTotp(secret, token, nowMs = Date.now(), window = 1, lastAcceptedStep = -1) {
  const code = String(token || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const currentStep = Math.floor(nowMs / 30000);
  const supplied = Buffer.from(code);
  for (let step = currentStep - window; step <= currentStep + window; step++) {
    if (step <= lastAcceptedStep || step < 0) continue;
    const expected = Buffer.from(hotp(secret, step, 6));
    if (expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)) return step;
  }
  return null;
}

function makeOtpAuthUrl(secret, username, issuer = 'Mr Laundry') {
  const label = encodeURIComponent(`${issuer}:${username}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30'
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

function createRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
  });
}

function normalizeRecoveryCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hashRecoveryCode(code, key) {
  return crypto.createHmac('sha256', key)
    .update(normalizeRecoveryCode(code))
    .digest('hex');
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b)) return false;
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

module.exports = {
  base32Encode,
  base32Decode,
  generateSecret,
  hotp,
  verifyTotp,
  makeOtpAuthUrl,
  createRecoveryCodes,
  normalizeRecoveryCode,
  hashRecoveryCode,
  safeEqualHex
};
