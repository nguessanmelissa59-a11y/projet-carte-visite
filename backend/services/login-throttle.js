const { LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_WINDOW_MS } = require('../config/env');

// Compteur en memoire : remis a zero au redemarrage, valable pour un seul processus.
const MAX_TRACKED_KEYS = 10000;
const attempts = new Map();

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase();
}

function currentEntry(key) {
  const entry = attempts.get(key);
  if (!entry) return null;
  if (entry.resetAt <= Date.now()) {
    attempts.delete(key);
    return null;
  }
  return entry;
}

function makeRoom() {
  if (attempts.size < MAX_TRACKED_KEYS) return;
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
  while (attempts.size >= MAX_TRACKED_KEYS) {
    attempts.delete(attempts.keys().next().value);
  }
}

function isLocked(rawKey) {
  const entry = currentEntry(normalizeKey(rawKey));
  return Boolean(entry) && entry.count >= LOGIN_MAX_ATTEMPTS;
}

/**
 * A appeler avant la verification du mot de passe, pour que des requetes
 * paralleles ne depassent pas le plafond pendant le calcul du hash.
 */
function registerAttempt(rawKey) {
  const key = normalizeKey(rawKey);
  const entry = currentEntry(key);
  if (entry) {
    entry.count += 1;
    return;
  }
  makeRoom();
  attempts.set(key, { count: 1, resetAt: Date.now() + LOGIN_LOCK_WINDOW_MS });
}

function clearAttempts(rawKey) {
  attempts.delete(normalizeKey(rawKey));
}

module.exports = {
  isLocked,
  registerAttempt,
  clearAttempts
};
