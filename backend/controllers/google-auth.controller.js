const { sendJson } = require('../http/json');
const {
  GOOGLE_CONFIGURED,
  GOOGLE_REDIRECT_URI,
  MAIL_CONFIGURED,
  IS_PRODUCTION
} = require('../config/env');
const { validateEmail, validateName } = require('../services/auth-validation');
const {
  createAuthRequest,
  fetchGoogleProfile,
  safeEqual
} = require('../services/google-oauth');
const {
  parseCookies,
  startSession,
  buildSessionCookie
} = require('../services/session-service');
const {
  getUserByEmail,
  createUser,
  updateUserProfile,
  markUserVerified,
  ensureAdminBootstrap
} = require('../db/auth-repository');

const OAUTH_COOKIE_NAME = 'vcard_oauth';
const OAUTH_COOKIE_PATH = '/api/auth/google';
const OAUTH_COOKIE_MAX_AGE_SEC = 600;
const SAFE_NEXT_RE = /^\/(?![/\\])[\x21-\x7E]{0,511}$/;

function redirectUriHost() {
  try {
    return new URL(GOOGLE_REDIRECT_URI).host;
  } catch {
    return '';
  }
}

// Google renvoie vers l'hote declare : le bouton n'a de sens que sur cet hote,
// sinon le cookie de session serait pose ailleurs que la ou l'utilisateur navigue.
function isGoogleAvailable(req) {
  return GOOGLE_CONFIGURED && Boolean(req.headers.host) && req.headers.host === redirectUriHost();
}

function safeNextPath(next) {
  return typeof next === 'string' && SAFE_NEXT_RE.test(next) ? next : '/';
}

function buildOauthCookie(value, maxAgeSec) {
  const parts = [
    `${OAUTH_COOKIE_NAME}=${value}`,
    `Path=${OAUTH_COOKIE_PATH}`,
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  return parts.join('; ');
}

function readOauthCookie(req) {
  const raw = parseCookies(req.headers.cookie)[OAUTH_COOKIE_NAME];
  if (!raw) return null;
  try {
    const data = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (!data || typeof data.state !== 'string' || typeof data.nonce !== 'string') return null;
    if (typeof data.verifier !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

function redirect(res, location, cookies = []) {
  const headers = { Location: location, 'Cache-Control': 'no-store' };
  if (cookies.length) headers['Set-Cookie'] = cookies;
  res.writeHead(302, headers);
  res.end();
}

function failRedirect(res, reason) {
  return redirect(res, `/auth.html?error=${reason}`, [buildOauthCookie('', 0)]);
}

function cleanName(value) {
  const check = validateName(value, 'Nom');
  return check.ok ? check.value : '';
}

function handleAuthProviders(req, res) {
  return sendJson(res, 200, {
    google: isGoogleAvailable(req),
    emailDelivery: MAIL_CONFIGURED
  });
}

function handleGoogleStart(req, res) {
  if (!isGoogleAvailable(req)) {
    return redirect(res, '/auth.html?error=google_unavailable');
  }
  const url = new URL(req.url || '/', 'http://localhost');
  const request = createAuthRequest();
  const payload = Buffer.from(
    JSON.stringify({
      state: request.state,
      nonce: request.nonce,
      verifier: request.verifier,
      next: safeNextPath(url.searchParams.get('next'))
    })
  ).toString('base64url');
  return redirect(res, request.url, [buildOauthCookie(payload, OAUTH_COOKIE_MAX_AGE_SEC)]);
}

async function handleGoogleCallback(req, res) {
  try {
    if (!isGoogleAvailable(req)) return failRedirect(res, 'google_unavailable');

    const url = new URL(req.url || '/', 'http://localhost');
    const pending = readOauthCookie(req);
    if (!pending || !safeEqual(url.searchParams.get('state'), pending.state)) {
      return failRedirect(res, 'google_failed');
    }
    if (url.searchParams.get('error')) return failRedirect(res, 'google_cancelled');

    const code = url.searchParams.get('code');
    if (!code) return failRedirect(res, 'google_failed');

    let profile;
    try {
      profile = await fetchGoogleProfile({
        code,
        verifier: pending.verifier,
        nonce: pending.nonce
      });
    } catch (err) {
      const reason = (err && err.code) || 'erreur';
      console.error(`[google] connexion refusee (${reason})`);
      return failRedirect(res, reason === 'email_not_eligible' ? 'google_email' : 'google_failed');
    }

    const emailCheck = validateEmail(profile.email);
    if (!emailCheck.ok) return failRedirect(res, 'google_failed');

    const firstName = cleanName(profile.firstName);
    const lastName = cleanName(profile.lastName);

    let user = getUserByEmail(emailCheck.value);
    if (!user) {
      user = createUser({ email: emailCheck.value, firstName, lastName });
    } else if (!user.emailVerified && firstName && lastName) {
      // Compte jamais confirme : les noms saisis par un tiers ne sont pas conserves.
      user = updateUserProfile(user.id, { firstName, lastName });
    }
    user = markUserVerified(user.id);
    user = ensureAdminBootstrap(user);

    const session = startSession(user.id);
    return redirect(res, safeNextPath(pending.next), [
      buildSessionCookie(session.token, session.expiresAt),
      buildOauthCookie('', 0)
    ]);
  } catch {
    return failRedirect(res, 'google_failed');
  }
}

module.exports = {
  handleAuthProviders,
  handleGoogleStart,
  handleGoogleCallback
};
