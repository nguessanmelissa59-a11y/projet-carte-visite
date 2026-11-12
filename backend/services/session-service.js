const {
  createSession,
  getSessionByToken,
  deleteSession
} = require('../db/auth-repository');
const { SESSION_TTL_MS, SESSION_COOKIE_NAME, IS_PRODUCTION } = require('../config/env');

function parseCookies(headerValue) {
  const out = {};
  const raw = String(headerValue || '');
  if (!raw) return out;
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function buildSessionCookie(token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  return parts.join('; ');
}

function buildClearSessionCookie() {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (IS_PRODUCTION) parts.push('Secure');
  return parts.join('; ');
}

function startSession(userId) {
  return createSession(userId, SESSION_TTL_MS);
}

function resolveSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return getSessionByToken(token);
}

function destroySession(session) {
  if (session?.id) deleteSession(session.id);
}

module.exports = {
  parseCookies,
  buildSessionCookie,
  buildClearSessionCookie,
  startSession,
  resolveSessionFromRequest,
  destroySession
};
