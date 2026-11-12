const crypto = require('node:crypto');
const {
  createOtpChallenge,
  getActiveOtp,
  countRecentOtps,
  normalizeEmail
} = require('../db/auth-repository');
const {
  OTP_TTL_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_MAX_PER_WINDOW,
  AUTH_EXPOSE_OTP
} = require('../config/env');

function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function canRequestOtp(email) {
  const since = new Date(Date.now() - OTP_RESEND_WINDOW_MS).toISOString();
  const count = countRecentOtps(email, since);
  if (count >= OTP_MAX_PER_WINDOW) {
    return { ok: false, error: 'Trop de demandes. Réessayez dans une minute.' };
  }
  return { ok: true };
}

function issueOtp({ email, purpose, meta }) {
  const cleanEmail = normalizeEmail(email);
  const gate = canRequestOtp(cleanEmail);
  if (!gate.ok) return gate;

  const code = generateOtpCode();
  createOtpChallenge({
    email: cleanEmail,
    purpose,
    code,
    ttlMs: OTP_TTL_MS,
    meta
  });

  // Pas de fournisseur SMS/SMTP branché : journal serveur + option de debug local.
  console.log(`[otp] ${purpose} ${cleanEmail} code=${code} ttl=${Math.round(OTP_TTL_MS / 1000)}s`);

  const payload = {
    ok: true,
    email: cleanEmail,
    purpose,
    expiresInSec: Math.round(OTP_TTL_MS / 1000)
  };
  if (AUTH_EXPOSE_OTP) {
    payload.devOtp = code;
  }
  return payload;
}

function getCurrentOtp(email, purpose) {
  return getActiveOtp(email, purpose);
}

module.exports = {
  issueOtp,
  getCurrentOtp,
  generateOtpCode
};
