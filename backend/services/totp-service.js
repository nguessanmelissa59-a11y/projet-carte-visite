const crypto = require('node:crypto');
const { DB_PATH } = require('../config/env');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SEC = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const ISSUER = 'EVC Melissa';

function getEncryptionKey() {
  const material = String(process.env.TOTP_ENC_KEY || process.env.SESSION_SECRET || `evc-totp:${DB_PATH}`);
  return crypto.scryptSync(material, 'evc-melissa-totp-v1', 32);
}

function encryptSecret(plainBase32) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainBase32), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

function decryptSecret(payload) {
  const raw = String(payload || '');
  if (!raw.startsWith('v1:')) return '';
  const parts = raw.split(':');
  if (parts.length !== 4) return '';
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const data = Buffer.from(parts[3], 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

function generateSecret(byteLength = 20) {
  const bytes = crypto.randomBytes(byteLength);
  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    if (chunk.length < 5) break;
    out += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return out;
}

function base32ToBuffer(secret) {
  const cleaned = String(secret || '')
    .toUpperCase()
    .replace(/=+$/g, '')
    .replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBuf, counter) {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', secretBuf).update(counterBuf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return String(otp).padStart(TOTP_DIGITS, '0');
}

function totpAt(secretBase32, timeMs = Date.now()) {
  const secretBuf = base32ToBuffer(secretBase32);
  if (!secretBuf.length) return '';
  const counter = Math.floor(timeMs / 1000 / TOTP_PERIOD_SEC);
  return hotp(secretBuf, counter);
}

function verifyTotp(secretBase32, code, timeMs = Date.now()) {
  const expected = String(code || '').trim();
  if (!/^\d{6}$/.test(expected)) return false;
  const secretBuf = base32ToBuffer(secretBase32);
  if (!secretBuf.length) return false;

  for (let w = -TOTP_WINDOW; w <= TOTP_WINDOW; w += 1) {
    const counter = Math.floor(timeMs / 1000 / TOTP_PERIOD_SEC) + w;
    const candidate = hotp(secretBuf, counter);
    try {
      if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))) {
        return true;
      }
    } catch {
      // longueurs differentes : ignore
    }
  }
  return false;
}

function buildOtpauthUrl({ secret, email, issuer = ISSUER }) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret: String(secret || ''),
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SEC)
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = {
  TOTP_PERIOD_SEC,
  TOTP_DIGITS,
  ISSUER,
  generateSecret,
  encryptSecret,
  decryptSecret,
  totpAt,
  verifyTotp,
  buildOtpauthUrl
};
