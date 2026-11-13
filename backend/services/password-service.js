const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEM = 64 * 1024 * 1024;
const DUMMY_SALT = crypto.randomBytes(SALT_LENGTH);

function derive(password, salt, params) {
  return scrypt(String(password), salt, KEY_LENGTH, { ...params, maxmem: MAX_MEM });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return [
    'scrypt',
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64'),
    key.toString('base64')
  ].join('$');
}

function parseHash(stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  // Parametres bornes : une ligne corrompue ne doit pas imposer un cout arbitraire.
  if (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return null;
  const salt = Buffer.from(parts[4], 'base64');
  const key = Buffer.from(parts[5], 'base64');
  if (salt.length !== SALT_LENGTH || key.length !== KEY_LENGTH) return null;
  return { N, r, p, salt, key };
}

/**
 * Compare un mot de passe au hash stocke.
 * Sans hash exploitable, un calcul equivalent est quand meme effectue pour que
 * le temps de reponse ne revele pas l'existence du compte.
 */
async function verifyPassword(password, stored) {
  const parsed = parseHash(stored);
  if (!parsed) {
    await derive(password, DUMMY_SALT, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    return false;
  }
  const actual = await derive(password, parsed.salt, { N: parsed.N, r: parsed.r, p: parsed.p });
  return crypto.timingSafeEqual(actual, parsed.key);
}

module.exports = {
  hashPassword,
  verifyPassword
};
