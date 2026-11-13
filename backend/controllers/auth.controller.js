const { sendJson, readJsonBody } = require('../http/json');
const { OTP_MAX_ATTEMPTS, OTP_TTL_MS, MAIL_CONFIGURED } = require('../config/env');
const {
  validateEmail,
  validateName,
  validateOtpCode,
  validateOtpMethod,
  validatePassword,
  normalizePassword
} = require('../services/auth-validation');
const { issueOtp, issueTotpEnrollment } = require('../services/otp-service');
const { hashPassword, verifyPassword } = require('../services/password-service');
const {
  encryptSecret,
  decryptSecret,
  verifyTotp
} = require('../services/totp-service');
const { isLocked, registerAttempt, clearAttempts } = require('../services/login-throttle');
const {
  startSession,
  resolveSessionFromRequest,
  destroySession,
  buildSessionCookie,
  buildClearSessionCookie
} = require('../services/session-service');
const {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserProfile,
  markUserVerified,
  ensureAdminBootstrap,
  getActiveOtp,
  incrementOtpAttempts,
  consumeOtp,
  parseOtpMeta,
  verifyOtpCode,
  getPasswordHash,
  setPasswordHash,
  getTotpSecretEncrypted,
  setTotpSecretEncrypted,
  deleteSessionsForUser,
  deleteOtherSessionsForUser
} = require('../db/auth-repository');
const { listCardsByUserId } = require('../db/repository');

const OTP_CONSOLE_MESSAGE =
  'Code OTP envoyé. Vérifiez votre e-mail (ou la console serveur en local).';
const OTP_SENT_BY_EMAIL_MESSAGE = 'Code envoyé. Vérifiez votre boîte e-mail.';
const TOTP_ENROLL_MESSAGE =
  'Scannez le QR Code avec votre application authenticator, puis saisissez le code à 6 chiffres.';
const TOTP_LOGIN_MESSAGE = 'Entrez le code à 6 chiffres de votre application authenticator.';
const LOGIN_FAILED_MESSAGE = 'E-mail ou mot de passe incorrect';
const LOGIN_LOCKED_MESSAGE =
  'Trop de tentatives. Réessayez plus tard ou connectez-vous avec un code.';

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: Boolean(user.emailVerified),
    role: user.role === 'admin' ? 'admin' : 'user',
    hasPassword: Boolean(user.hasPassword),
    hasTotp: Boolean(user.hasTotp)
  };
}

// Le cookie SameSite=Lax ne couvre pas une page servie par le meme site sur une
// autre origine : on refuse donc toute origine differente de l'hote appele.
function isSameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function handleRegister(req, res) {
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const emailCheck = validateEmail(body.email);
    const firstNameCheck = validateName(body.firstName, 'Prénom');
    const lastNameCheck = validateName(body.lastName, 'Nom');
    const methodCheck = validateOtpMethod(body.method);

    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });
    if (!firstNameCheck.ok) return sendJson(res, 400, { error: firstNameCheck.error });
    if (!lastNameCheck.ok) return sendJson(res, 400, { error: lastNameCheck.error });
    if (!methodCheck.ok) return sendJson(res, 400, { error: methodCheck.error });

    const existing = getUserByEmail(emailCheck.value);
    if (existing && existing.emailVerified) {
      return sendJson(res, 409, {
        error: 'Un compte existe déjà pour cet e-mail. Connectez-vous.'
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

    const meta = {
      firstName: firstNameCheck.value,
      lastName: lastNameCheck.value
    };

    if (methodCheck.value === 'authenticator') {
      const otp = await issueTotpEnrollment({
        email: emailCheck.value,
        purpose: 'register',
        meta
      });
      if (!otp.ok) return sendJson(res, otp.status || 429, { error: otp.error });

      return sendJson(res, 200, {
        ok: true,
        otpIssued: true,
        method: 'authenticator',
        message: TOTP_ENROLL_MESSAGE,
        email: otp.email,
        purpose: 'register',
        expiresInSec: otp.expiresInSec,
        otpauthUrl: otp.otpauthUrl,
        totpSecret: otp.totpSecret
      });
    }

    const otp = await issueOtp({
      email: emailCheck.value,
      purpose: 'register',
      meta
    });
    if (!otp.ok) return sendJson(res, otp.status || 429, { error: otp.error });

    return sendJson(res, 200, {
      ok: true,
      otpIssued: true,
      method: 'email',
      message: MAIL_CONFIGURED ? OTP_SENT_BY_EMAIL_MESSAGE : OTP_CONSOLE_MESSAGE,
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
    const methodCheck = validateOtpMethod(body.method || 'email');
    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });
    if (!methodCheck.ok) return sendJson(res, 400, { error: methodCheck.error });

    if (methodCheck.value === 'authenticator') {
      // Reponse uniforme : ne pas reveler si le compte a un TOTP.
      return sendJson(res, 200, {
        ok: true,
        otpIssued: true,
        method: 'authenticator',
        message: TOTP_LOGIN_MESSAGE,
        email: emailCheck.value,
        purpose: 'login',
        expiresInSec: Math.round(OTP_TTL_MS / 1000)
      });
    }

    const user = getUserByEmail(emailCheck.value);

    if (MAIL_CONFIGURED) {
      // Envoi reel : meme reponse et meme delai que le compte existe ou non.
      // L'envoi part en arriere-plan, un plafond atteint n'est pas signale.
      if (user) {
        await issueOtp({
          email: emailCheck.value,
          purpose: 'login',
          meta: {},
          awaitDelivery: false
        });
      }
      return sendJson(res, 200, {
        ok: true,
        otpIssued: true,
        method: 'email',
        message: 'Si un compte existe pour cet e-mail, un code vient d’être envoyé.',
        email: emailCheck.value,
        purpose: 'login',
        expiresInSec: Math.round(OTP_TTL_MS / 1000)
      });
    }

    if (!user) {
      // Même forme de réponse pour limiter l'énumération de comptes.
      return sendJson(res, 200, {
        ok: true,
        otpIssued: true,
        method: 'email',
        message: 'Si un compte existe, un code OTP a été préparé.',
        email: emailCheck.value,
        purpose: 'login',
        expiresInSec: Math.round(OTP_TTL_MS / 1000)
      });
    }

    const otp = await issueOtp({
      email: emailCheck.value,
      purpose: 'login',
      meta: {}
    });
    if (!otp.ok) return sendJson(res, otp.status || 429, { error: otp.error });

    return sendJson(res, 200, {
      ok: true,
      otpIssued: true,
      method: 'email',
      message: OTP_CONSOLE_MESSAGE,
      email: otp.email,
      purpose: 'login',
      expiresInSec: otp.expiresInSec,
      ...(otp.devOtp ? { devOtp: otp.devOtp } : {})
    });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

async function completeAuthAfterOtp({
  email,
  purpose,
  challengeMeta,
  enrollTotpSecret,
  passwordCheck
}) {
  let user = getUserByEmail(email);
  if (!user && purpose === 'register') {
    user = createUser({
      email,
      firstName: (challengeMeta && challengeMeta.firstName) || '',
      lastName: (challengeMeta && challengeMeta.lastName) || ''
    });
  }
  if (!user) {
    return { ok: false, status: 404, error: 'Compte introuvable' };
  }

  user = markUserVerified(user.id);

  if (enrollTotpSecret) {
    setTotpSecretEncrypted(user.id, encryptSecret(enrollTotpSecret));
    user = getUserById(user.id);
  }

  if (passwordCheck) {
    // Seul le detenteur du code choisit le mot de passe ; les sessions anterieures tombent.
    setPasswordHash(user.id, await hashPassword(passwordCheck.value));
    deleteSessionsForUser(user.id);
    clearAttempts(user.email);
    user = getUserById(user.id);
  }

  user = ensureAdminBootstrap(user);
  const session = startSession(user.id);
  return { ok: true, user, session };
}

async function handleVerifyOtp(req, res) {
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const emailCheck = validateEmail(body.email);
    const codeCheck = validateOtpCode(body.code);
    const purpose = body.purpose === 'register' ? 'register' : 'login';
    const methodCheck = validateOtpMethod(body.method || 'email');

    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });
    if (!codeCheck.ok) return sendJson(res, 400, { error: codeCheck.error });
    if (!methodCheck.ok) return sendJson(res, 400, { error: methodCheck.error });

    // Inscription : mot de passe obligatoire avec l'OTP. Connexion : facultatif
    // (definir / remplacer). Valide avant de toucher au code pour ne pas le consommer.
    let passwordCheck = null;
    const passwordProvided =
      body.password !== undefined && body.password !== null && body.password !== '';
    if (purpose === 'register' || passwordProvided) {
      passwordCheck = validatePassword(body.password);
      if (!passwordCheck.ok) {
        return sendJson(res, 400, {
          error:
            purpose === 'register' && !passwordProvided
              ? 'Mot de passe requis pour créer le compte'
              : passwordCheck.error
        });
      }
    }

    // Connexion TOTP deja enrole : pas de challenge e-mail, throttle par e-mail.
    if (methodCheck.value === 'authenticator' && purpose === 'login') {
      if (isLocked(emailCheck.value)) {
        return sendJson(res, 429, { error: LOGIN_LOCKED_MESSAGE });
      }
      registerAttempt(emailCheck.value);

      const found = getUserByEmail(emailCheck.value);
      const encrypted = found && found.emailVerified ? getTotpSecretEncrypted(found.id) : '';
      const secret = encrypted ? decryptSecret(encrypted) : '';
      const valid = Boolean(secret) && verifyTotp(secret, codeCheck.value);
      if (!valid) {
        return sendJson(res, 400, { error: 'Code OTP incorrect' });
      }

      clearAttempts(emailCheck.value);
      const done = await completeAuthAfterOtp({
        email: emailCheck.value,
        purpose,
        challengeMeta: {},
        enrollTotpSecret: null,
        passwordCheck
      });
      if (!done.ok) return sendJson(res, done.status, { error: done.error });

      return sendJson(
        res,
        200,
        {
          ok: true,
          user: publicUser(done.user),
          expiresAt: done.session.expiresAt
        },
        { 'Set-Cookie': buildSessionCookie(done.session.token, done.session.expiresAt) }
      );
    }

    const challenge = getActiveOtp(emailCheck.value, purpose);
    if (!challenge) {
      return sendJson(res, 400, { error: 'Code expiré ou introuvable. Demandez un nouveau OTP.' });
    }
    if (Number(challenge.attempts) >= OTP_MAX_ATTEMPTS) {
      return sendJson(res, 429, { error: 'Trop de tentatives. Demandez un nouveau OTP.' });
    }

    const meta = parseOtpMeta(challenge);
    const challengeMethod = meta.method === 'authenticator' ? 'authenticator' : 'email';
    if (challengeMethod !== methodCheck.value) {
      return sendJson(res, 400, {
        error: 'Méthode de vérification incorrecte. Reprenez depuis le début.'
      });
    }

    let codeOk = false;
    let enrollTotpSecret = null;
    if (challengeMethod === 'authenticator') {
      const secret = String(meta.totpSecret || '');
      codeOk = Boolean(secret) && verifyTotp(secret, codeCheck.value);
      if (codeOk && purpose === 'register') {
        enrollTotpSecret = secret;
      }
    } else {
      codeOk = verifyOtpCode(challenge, codeCheck.value);
    }

    if (!codeOk) {
      incrementOtpAttempts(challenge.id);
      return sendJson(res, 400, { error: 'Code OTP incorrect' });
    }

    consumeOtp(challenge.id);

    const done = await completeAuthAfterOtp({
      email: emailCheck.value,
      purpose,
      challengeMeta: meta,
      enrollTotpSecret,
      passwordCheck
    });
    if (!done.ok) return sendJson(res, done.status, { error: done.error });

    return sendJson(
      res,
      200,
      {
        ok: true,
        user: publicUser(done.user),
        expiresAt: done.session.expiresAt
      },
      { 'Set-Cookie': buildSessionCookie(done.session.token, done.session.expiresAt) }
    );
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

async function handlePasswordLogin(req, res) {
  try {
    const body = await readJsonBody(req, 64 * 1024);
    const emailCheck = validateEmail(body.email);
    if (!emailCheck.ok) return sendJson(res, 400, { error: emailCheck.error });

    const password = normalizePassword(body.password);
    if (!password) return sendJson(res, 401, { error: LOGIN_FAILED_MESSAGE });

    if (isLocked(emailCheck.value)) {
      return sendJson(res, 429, { error: LOGIN_LOCKED_MESSAGE });
    }
    registerAttempt(emailCheck.value);

    // Compte inconnu, non verifie ou sans mot de passe : meme calcul, meme reponse.
    const found = getUserByEmail(emailCheck.value);
    const storedHash = found && found.emailVerified ? getPasswordHash(found.id) : '';
    const valid = await verifyPassword(password, storedHash);
    if (!valid) return sendJson(res, 401, { error: LOGIN_FAILED_MESSAGE });

    clearAttempts(emailCheck.value);

    // Mot de passe OK : 2e facteur OTP obligatoire (pas de session ici).
    if (found.hasTotp) {
      return sendJson(res, 200, {
        ok: true,
        otpIssued: true,
        method: 'authenticator',
        message: TOTP_LOGIN_MESSAGE,
        email: emailCheck.value,
        purpose: 'login',
        expiresInSec: Math.round(OTP_TTL_MS / 1000)
      });
    }

    const otp = await issueOtp({
      email: emailCheck.value,
      purpose: 'login',
      meta: { afterPassword: true }
    });
    if (!otp.ok) return sendJson(res, otp.status || 429, { error: otp.error });

    return sendJson(res, 200, {
      ok: true,
      otpIssued: true,
      method: 'email',
      message: MAIL_CONFIGURED
        ? OTP_SENT_BY_EMAIL_MESSAGE
        : OTP_CONSOLE_MESSAGE,
      email: otp.email,
      purpose: 'login',
      expiresInSec: otp.expiresInSec,
      ...(otp.devOtp ? { devOtp: otp.devOtp } : {})
    });
  } catch {
    return sendJson(res, 400, { error: 'Requête invalide' });
  }
}

async function handleSetPassword(req, res) {
  try {
    if (!isSameOriginRequest(req)) {
      return sendJson(res, 403, { error: 'Origine non autorisée' });
    }
    const session = resolveSessionFromRequest(req);
    if (!session) return sendJson(res, 401, { error: 'Non authentifié' });

    const body = await readJsonBody(req, 64 * 1024);
    const passwordCheck = validatePassword(body.password);
    if (!passwordCheck.ok) return sendJson(res, 400, { error: passwordCheck.error });

    const currentHash = getPasswordHash(session.userId);
    if (currentHash) {
      const throttleKey = session.user.email;
      if (isLocked(throttleKey)) {
        return sendJson(res, 429, { error: LOGIN_LOCKED_MESSAGE });
      }
      registerAttempt(throttleKey);
      const current = normalizePassword(body.currentPassword);
      if (!current || !(await verifyPassword(current, currentHash))) {
        return sendJson(res, 403, { error: 'Mot de passe actuel incorrect' });
      }
      clearAttempts(throttleKey);
    }

    setPasswordHash(session.userId, await hashPassword(passwordCheck.value));
    deleteOtherSessionsForUser(session.userId, session.id);
    return sendJson(res, 200, { ok: true, user: publicUser(getUserById(session.userId)) });
  } catch {
    return sendJson(res, 400, { error: 'Requête invalide' });
  }
}

function handleMe(req, res) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    return sendJson(res, 401, { error: 'Non authentifié' });
  }
  const user = ensureAdminBootstrap(session.user);
  return sendJson(res, 200, {
    user: publicUser(user),
    idleTimeoutMs: session.idleTimeoutMs
  });
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
  handlePasswordLogin,
  handleVerifyOtp,
  handleSetPassword,
  handleMe,
  handleLogout,
  handleUpdateProfile,
  handleMyCards
};
