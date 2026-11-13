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
  AUTH_EXPOSE_OTP,
  MAIL_CONFIGURED
} = require('../config/env');
const { sendOtpEmail } = require('./mailer');
const { generateSecret, buildOtpauthUrl } = require('./totp-service');

function generateOtpCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function canRequestOtp(email) {
  const since = new Date(Date.now() - OTP_RESEND_WINDOW_MS).toISOString();
  const count = countRecentOtps(email, since);
  if (count >= OTP_MAX_PER_WINDOW) {
    return { ok: false, status: 429, error: 'Trop de demandes. Réessayez dans une minute.' };
  }
  return { ok: true };
}

// Le journal ne contient ni le code ni le destinataire.
function deliverByEmail(email, code) {
  return sendOtpEmail({
    to: email,
    code,
    ttlMinutes: Math.round(OTP_TTL_MS / 60000)
  }).then(
    () => true,
    (err) => {
      const reason = (err && (err.code || err.name)) || 'erreur';
      console.error(`[otp] envoi e-mail impossible (${reason})`);
      return false;
    }
  );
}

/**
 * Cree un code et le transmet : par e-mail si SMTP est configure, sinon dans
 * la console du serveur (developpement local).
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.purpose 'register' ou 'login'.
 * @param {object} [params.meta]
 * @param {boolean} [params.awaitDelivery] false : l'envoi part en arriere-plan,
 *   pour que le temps de reponse ne depende pas de l'existence du compte.
 */
async function issueOtp({ email, purpose, meta, awaitDelivery = true }) {
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

  if (MAIL_CONFIGURED) {
    const delivery = deliverByEmail(cleanEmail, code);
    if (awaitDelivery && !(await delivery)) {
      return {
        ok: false,
        status: 502,
        error: 'Envoi du code impossible pour le moment. Réessayez dans un instant.'
      };
    }
  } else {
    // Aucun envoi d'e-mail configure : repli console pour le developpement local.
    console.log(`[otp] ${purpose} ${cleanEmail} code=${code} ttl=${Math.round(OTP_TTL_MS / 1000)}s`);
  }

  const payload = {
    ok: true,
    email: cleanEmail,
    purpose,
    delivery: MAIL_CONFIGURED ? 'email' : 'console',
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

/**
 * Inscription via application authenticator : secret TOTP + URI otpauth
 * (QR a scanner). Aucun e-mail envoye.
 */
async function issueTotpEnrollment({ email, purpose, meta }) {
  const cleanEmail = normalizeEmail(email);
  const gate = canRequestOtp(cleanEmail);
  if (!gate.ok) return gate;

  const secret = generateSecret();
  // code_hash ne doit pas matcher un code a 6 chiffres saisi au hasard.
  const placeholder = `totp:${crypto.randomBytes(16).toString('hex')}`;
  createOtpChallenge({
    email: cleanEmail,
    purpose,
    code: placeholder,
    ttlMs: OTP_TTL_MS,
    meta: {
      ...(meta || {}),
      method: 'authenticator',
      totpSecret: secret
    }
  });

  return {
    ok: true,
    email: cleanEmail,
    purpose,
    method: 'authenticator',
    delivery: 'authenticator',
    otpauthUrl: buildOtpauthUrl({ secret, email: cleanEmail }),
    // Cle manuelle si le scan QR echoue (meme secret que dans l'URI).
    totpSecret: secret,
    expiresInSec: Math.round(OTP_TTL_MS / 1000)
  };
}

module.exports = {
  issueOtp,
  issueTotpEnrollment,
  getCurrentOtp,
  generateOtpCode
};
