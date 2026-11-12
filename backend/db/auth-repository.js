const crypto = require('node:crypto');
const { db, newId } = require('./connection');
const { isAdminEmail } = require('../config/env');

const ROLES = Object.freeze({ USER: 'user', ADMIN: 'admin' });

const stmtGetUserByEmail = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
const stmtGetUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const stmtInsertUser = db.prepare(`
  INSERT INTO users (id, email, first_name, last_name, email_verified, role, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const stmtUpdateUserProfile = db.prepare(`
  UPDATE users
  SET first_name = ?, last_name = ?, updated_at = ?
  WHERE id = ?
`);
const stmtMarkVerified = db.prepare(`
  UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?
`);
const stmtSetUserRole = db.prepare(`
  UPDATE users SET role = ?, updated_at = ? WHERE id = ?
`);
const stmtCountAdmins = db.prepare(`
  SELECT COUNT(*) AS total FROM users WHERE role = 'admin'
`);
const stmtListUsersAdmin = db.prepare(`
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.email_verified,
    u.role,
    u.created_at,
    u.updated_at,
    (
      SELECT COUNT(*) FROM cards c WHERE c.user_id = u.id
    ) AS cards_count
  FROM users u
  ORDER BY u.created_at DESC
`);

const stmtInsertOtp = db.prepare(`
  INSERT INTO otp_challenges (
    id, email, purpose, code_hash, attempts, expires_at, consumed_at, created_at, meta_json
  ) VALUES (?, ?, ?, ?, 0, ?, NULL, ?, ?)
`);
const stmtLatestOtp = db.prepare(`
  SELECT * FROM otp_challenges
  WHERE email = ? COLLATE NOCASE AND purpose = ? AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
`);
const stmtBumpOtpAttempts = db.prepare(`
  UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?
`);
const stmtConsumeOtp = db.prepare(`
  UPDATE otp_challenges SET consumed_at = ? WHERE id = ?
`);
const stmtRecentOtpCount = db.prepare(`
  SELECT COUNT(*) AS total FROM otp_challenges
  WHERE email = ? COLLATE NOCASE AND created_at >= ?
`);

const stmtInsertSession = db.prepare(`
  INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
const stmtGetSessionByTokenHash = db.prepare(`
  SELECT s.*, u.email, u.first_name, u.last_name, u.email_verified, u.role
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ?
`);
const stmtDeleteSession = db.prepare('DELETE FROM sessions WHERE id = ?');
const stmtDeleteExpiredSessions = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
const stmtDeleteUserSessions = db.prepare('DELETE FROM sessions WHERE user_id = ?');

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

function normalizeRole(role) {
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    emailVerified: Boolean(row.email_verified),
    role: normalizeRole(row.role),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getUserByEmail(email) {
  return mapUser(stmtGetUserByEmail.get(normalizeEmail(email)));
}

function getUserById(id) {
  return mapUser(stmtGetUserById.get(id));
}

function createUser({ email, firstName, lastName, role }) {
  const now = new Date().toISOString();
  const id = newId('usr');
  const normalizedEmail = normalizeEmail(email);
  const initialRole = normalizeRole(
    role || (isAdminEmail(normalizedEmail) ? ROLES.ADMIN : ROLES.USER)
  );
  stmtInsertUser.run(
    id,
    normalizedEmail,
    String(firstName || '').trim().slice(0, 80),
    String(lastName || '').trim().slice(0, 80),
    0,
    initialRole,
    now,
    now
  );
  return getUserById(id);
}

function ensureAdminBootstrap(user) {
  if (!user) return null;
  if (isAdminEmail(user.email) && user.role !== ROLES.ADMIN) {
    return setUserRole(user.id, ROLES.ADMIN);
  }
  return user;
}

function setUserRole(userId, role) {
  const nextRole = normalizeRole(role);
  stmtSetUserRole.run(nextRole, new Date().toISOString(), userId);
  return getUserById(userId);
}

function countAdmins() {
  const row = stmtCountAdmins.get();
  return Number(row?.total) || 0;
}

function listUsersForAdmin() {
  return stmtListUsersAdmin.all().map((row) => ({
    ...mapUser(row),
    cardsCount: Number(row.cards_count) || 0
  }));
}

function updateUserProfile(userId, { firstName, lastName }) {
  const now = new Date().toISOString();
  stmtUpdateUserProfile.run(
    String(firstName || '').trim().slice(0, 80),
    String(lastName || '').trim().slice(0, 80),
    now,
    userId
  );
  return getUserById(userId);
}

function markUserVerified(userId) {
  stmtMarkVerified.run(new Date().toISOString(), userId);
  return getUserById(userId);
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function createOtpChallenge({ email, purpose, code, ttlMs, meta }) {
  const now = Date.now();
  const id = newId('otp');
  stmtInsertOtp.run(
    id,
    normalizeEmail(email),
    purpose,
    hashValue(code),
    new Date(now + ttlMs).toISOString(),
    new Date(now).toISOString(),
    JSON.stringify(meta || {})
  );
  return stmtLatestOtp.get(normalizeEmail(email), purpose);
}

function getActiveOtp(email, purpose) {
  const row = stmtLatestOtp.get(normalizeEmail(email), purpose);
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) return null;
  return row;
}

function countRecentOtps(email, sinceIso) {
  const row = stmtRecentOtpCount.get(normalizeEmail(email), sinceIso);
  return Number(row?.total) || 0;
}

function incrementOtpAttempts(otpId) {
  stmtBumpOtpAttempts.run(otpId);
}

function consumeOtp(otpId) {
  stmtConsumeOtp.run(new Date().toISOString(), otpId);
}

function createSession(userId, ttlMs) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const id = newId('ses');
  const now = Date.now();
  stmtInsertSession.run(
    id,
    userId,
    hashValue(rawToken),
    new Date(now + ttlMs).toISOString(),
    new Date(now).toISOString()
  );
  return { id, token: rawToken, expiresAt: new Date(now + ttlMs).toISOString() };
}

function getSessionByToken(rawToken) {
  if (!rawToken) return null;
  stmtDeleteExpiredSessions.run(new Date().toISOString());
  const row = stmtGetSessionByTokenHash.get(hashValue(rawToken));
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) {
    stmtDeleteSession.run(row.id);
    return null;
  }
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    user: {
      id: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      emailVerified: Boolean(row.email_verified)
    }
  };
}

function deleteSession(sessionId) {
  if (!sessionId) return;
  stmtDeleteSession.run(sessionId);
}

function deleteSessionsForUser(userId) {
  stmtDeleteUserSessions.run(userId);
}

function parseOtpMeta(row) {
  if (!row || !row.meta_json) return {};
  try {
    return JSON.parse(row.meta_json);
  } catch {
    return {};
  }
}

function verifyOtpCode(row, code) {
  if (!row) return false;
  const expected = row.code_hash;
  const actual = hashValue(String(code || '').trim());
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
  } catch {
    return false;
  }
}

module.exports = {
  normalizeEmail,
  getUserByEmail,
  getUserById,
  createUser,
  updateUserProfile,
  markUserVerified,
  createOtpChallenge,
  getActiveOtp,
  countRecentOtps,
  incrementOtpAttempts,
  consumeOtp,
  createSession,
  getSessionByToken,
  deleteSession,
  deleteSessionsForUser,
  parseOtpMeta,
  verifyOtpCode,
  hashValue
};
