const { sendJson, readJsonBody } = require('../http/json');
const { OTP_MAX_ATTEMPTS, OTP_TTL_MS } = require('../config/env');
const {
  validateEmail,
  validateName,
  validateOtpCode
} = require('../services/auth-validation');
const { issueOtp } = require('../services/otp-service');
const {
  startSession,
  resolveSessionFromRequest,
  destroySession,
  buildSessionCookie,
  buildClearSessionCookie
} = require('../services/session-service');
const {
  getUserByEmail,
  createUser,
  updateUserProfile,
  markUserVerified,
  getActiveOtp,
  incrementOtpAttempts,
  consumeOtp,
  parseOtpMeta,
  verifyOtpCode
} = require('../db/auth-repository');
const { listCardsByUserId } = require('../db/repository');

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: Boolean(user.emailVerified)
  };
}

async function handleRegister(req, res) {
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const emailCheck = validateEmail(body.email);
    const firstNameCheck = validateName(body.firstName, 'Prénom');
    const lastNameCheck = validateName(body.lastName, 'Nom');

    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });
    if (!firstNameCheck.ok) return sendJson(res, 400, { error: firstNameCheck.error });
    if (!lastNameCheck.ok) return sendJson(res, 400, { error: lastNameCheck.error });

    const existing = getUserByEmail(emailCheck.value);
    if (existing && existing.emailVerified) {
      return sendJson(res, 409, {
        error: 'Un compte existe déjà pour cet e-mail. Connectez-vous par OTP.'
      });
    }

    if (!existing) {
      createUser({
        email: emailCheck.value,
        firstName: firstNameCheck.value,
        lastName: lastNameCheck.value
      });
    } else {
      updateUserProfile(existing.id, {
        firstName: firstNameCheck.value,
        lastName: lastNameCheck.value
      });
    }

    const otp = issueOtp({
      email: emailCheck.value,
      purpose: 'register',
      meta: {
        firstName: firstNameCheck.value,
        lastName: lastNameCheck.value
      }
    });
    if (!otp.ok) return sendJson(res, 429, { error: otp.error });

    return sendJson(res, 200, {
      ok: true,
      otpIssued: true,
      message: 'Code OTP envoyé. Vérifiez votre e-mail (ou la console serveur en local).',
      email: otp.email,
      purpose: 'register',
      expiresInSec: otp.expiresInSec,
      ...(otp.devOtp ? { devOtp: otp.devOtp } : {})
    });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

async function handleLogin(req, res) {
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const emailCheck = validateEmail(body.email);
    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });

    const user = getUserByEmail(emailCheck.value);
    if (!user) {
      // Même forme de réponse pour limiter l'énumération de comptes.
      return sendJson(res, 200, {
        ok: true,
        otpIssued: true,
        message: 'Si un compte existe, un code OTP a été préparé.',
        email: emailCheck.value,
        purpose: 'login',
        expiresInSec: Math.round(require('../config/env').OTP_TTL_MS / 1000)
      });
    }

    const otp = issueOtp({
      email: emailCheck.value,
      purpose: 'login',
      meta: {}
    });
    if (!otp.ok) return sendJson(res, 429, { error: otp.error });

    return sendJson(res, 200, {
      ok: true,
      otpIssued: true,
      message: 'Code OTP envoyé. Vérifiez votre e-mail (ou la console serveur en local).',
      email: otp.email,
      purpose: 'login',
      expiresInSec: otp.expiresInSec,
      ...(otp.devOtp ? { devOtp: otp.devOtp } : {})
    });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

async function handleVerifyOtp(req, res) {
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const emailCheck = validateEmail(body.email);
    const codeCheck = validateOtpCode(body.code);
    const purpose = body.purpose === 'register' ? 'register' : 'login';

    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });
    if (!codeCheck.ok) return sendJson(res, 400, { error: codeCheck.error });

    const challenge = getActiveOtp(emailCheck.value, purpose);
    if (!challenge) {
      return sendJson(res, 400, { error: 'Code expiré ou introuvable. Demandez un nouveau OTP.' });
    }
    if (Number(challenge.attempts) >= OTP_MAX_ATTEMPTS) {
      return sendJson(res, 429, { error: 'Trop de tentatives. Demandez un nouveau OTP.' });
    }

    if (!verifyOtpCode(challenge, codeCheck.value)) {
      incrementOtpAttempts(challenge.id);
      return sendJson(res, 400, { error: 'Code OTP incorrect' });
    }

    consumeOtp(challenge.id);

    let user = getUserByEmail(emailCheck.value);
    if (!user && purpose === 'register') {
      const meta = parseOtpMeta(challenge);
      user = createUser({
        email: emailCheck.value,
        firstName: meta.firstName || '',
        lastName: meta.lastName || ''
      });
    }
    if (!user) {
      return sendJson(res, 404, { error: 'Compte introuvable' });
    }

    user = markUserVerified(user.id);
    const session = startSession(user.id);

    return sendJson(
      res,
      200,
      {
        ok: true,
        user: publicUser(user),
        expiresAt: session.expiresAt
      },
      { 'Set-Cookie': buildSessionCookie(session.token, session.expiresAt) }
    );
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

function handleMe(req, res) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    return sendJson(res, 401, { error: 'Non authentifié' });
  }
  return sendJson(res, 200, { user: publicUser(session.user) });
}

function handleLogout(req, res) {
  const session = resolveSessionFromRequest(req);
  destroySession(session);
  return sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildClearSessionCookie() });
}

async function handleUpdateProfile(req, res) {
  try {
    const session = resolveSessionFromRequest(req);
    if (!session) return sendJson(res, 401, { error: 'Non authentifié' });

    const body = await readJsonBody(req, 64 * 1024);
    const firstNameCheck = validateName(body.firstName, 'Prénom');
    const lastNameCheck = validateName(body.lastName, 'Nom');
    if (!firstNameCheck.ok) return sendJson(res, 400, { error: firstNameCheck.error });
    if (!lastNameCheck.ok) return sendJson(res, 400, { error: lastNameCheck.error });

    const user = updateUserProfile(session.userId, {
      firstName: firstNameCheck.value,
      lastName: lastNameCheck.value
    });
    return sendJson(res, 200, { user: publicUser(user) });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

function handleMyCards(req, res) {
  const session = resolveSessionFromRequest(req);
  if (!session) return sendJson(res, 401, { error: 'Non authentifié' });
  const cards = listCardsByUserId(session.userId);
  return sendJson(res, 200, { cards });
}

module.exports = {
  handleRegister,
  handleLogin,
  handleVerifyOtp,
  handleMe,
  handleLogout,
  handleUpdateProfile,
  handleMyCards
};
