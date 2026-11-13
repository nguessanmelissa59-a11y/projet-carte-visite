const crypto = require('node:crypto');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
} = require('../config/env');

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);
const TOKEN_TIMEOUT_MS = 10000;

class GoogleAuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

/**
 * Prepare une demande d'autorisation : state (anti-CSRF), nonce (lie le jeton
 * a ce navigateur) et PKCE (lie le code a ce navigateur).
 */
function createAuthRequest() {
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  });
  return { state, nonce, verifier, url: `${AUTH_ENDPOINT}?${params.toString()}` };
}

function decodeIdTokenClaims(idToken) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new GoogleAuthError('id_token_malformed');
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new GoogleAuthError('id_token_malformed');
  }
}

// Google ne fait autorite sur l'adresse que pour Gmail et les domaines Workspace
// (revendication hd). Pour un autre domaine, l'e-mail ne prouve pas la propriete.
function isAuthoritativeEmail(claims) {
  const email = String(claims.email || '').toLowerCase();
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (GMAIL_DOMAINS.has(domain)) return true;
  return typeof claims.hd === 'string' && claims.hd.toLowerCase() === domain;
}

function validateClaims(claims, expectedNonce) {
  if (!claims || typeof claims !== 'object') throw new GoogleAuthError('id_token_malformed');
  if (!ISSUERS.has(claims.iss)) throw new GoogleAuthError('issuer_mismatch');
  if (claims.aud !== GOOGLE_CLIENT_ID) throw new GoogleAuthError('audience_mismatch');
  if (!(Number(claims.exp) * 1000 > Date.now())) throw new GoogleAuthError('token_expired');
  if (!safeEqual(claims.nonce, expectedNonce)) throw new GoogleAuthError('nonce_mismatch');
  if (typeof claims.email !== 'string' || !claims.email) {
    throw new GoogleAuthError('email_missing');
  }
  if (claims.email_verified !== true && claims.email_verified !== 'true') {
    throw new GoogleAuthError('email_not_verified');
  }
  if (!isAuthoritativeEmail(claims)) throw new GoogleAuthError('email_not_eligible');
}

/**
 * Echange le code d'autorisation contre le jeton d'identite et renvoie le profil.
 * Le jeton arrive directement de Google en TLS, authentifie par le secret client :
 * sa signature n'a pas a etre reverifiee (OpenID Connect Core 3.1.3.7), ses
 * revendications si.
 */
async function fetchGoogleProfile({ code, verifier, nonce }) {
  let response;
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
        code_verifier: verifier
      }).toString(),
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS)
    });
  } catch {
    throw new GoogleAuthError('token_request_failed');
  }
  if (!response.ok) throw new GoogleAuthError('token_exchange_refused');

  let data;
  try {
    data = await response.json();
  } catch {
    throw new GoogleAuthError('token_response_malformed');
  }

  const claims = decodeIdTokenClaims(data && data.id_token);
  validateClaims(claims, nonce);
  return {
    email: claims.email.toLowerCase(),
    firstName: typeof claims.given_name === 'string' ? claims.given_name : '',
    lastName: typeof claims.family_name === 'string' ? claims.family_name : ''
  };
}

module.exports = {
  GoogleAuthError,
  createAuthRequest,
  fetchGoogleProfile,
  safeEqual
};
