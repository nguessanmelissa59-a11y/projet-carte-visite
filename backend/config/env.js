const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// Secrets locaux : fichier .env a la racine, ignore par git. Les variables deja
// definies gardent la priorite ; le fichier n'est jamais lu pendant les tests.
const ENV_FILE = path.resolve(__dirname, '..', '..', '.env');
if (process.env.NODE_ENV !== 'test' && fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

function detectLanIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (/vethernet|wsl|vmware|vbox|virtual|loopback/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_ROOT = path.resolve(__dirname, '..', '..');
const DB_DIR = path.resolve(process.env.DB_DIR || path.join(__dirname, '..', 'data'));
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'cards.sqlite');
const CACHED_LAN_IP = detectLanIpAddress();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'vcard_sid';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 30 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS) || 10 * 60 * 1000;
const OTP_RESEND_WINDOW_MS = Number(process.env.OTP_RESEND_WINDOW_MS) || 60 * 1000;
const OTP_MAX_PER_WINDOW = Number(process.env.OTP_MAX_PER_WINDOW) || 3;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;

const SMTP_HOST = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = String(process.env.SMTP_USER || '').trim();
// Google affiche ses mots de passe d'application par groupes separes d'espaces.
const SMTP_PASS =
  SMTP_HOST === 'smtp.gmail.com'
    ? String(process.env.SMTP_PASS || '').replace(/\s+/g, '')
    : String(process.env.SMTP_PASS || '');
const MAIL_FROM = String(process.env.MAIL_FROM || SMTP_USER).trim();
const MAIL_CONFIGURED = Boolean(SMTP_USER && SMTP_PASS);

// Des que l'envoi d'e-mails est configure, le code n'est plus renvoye dans la
// reponse HTTP, meme hors production (sauf demande explicite AUTH_EXPOSE_OTP=1).
const AUTH_EXPOSE_OTP =
  process.env.AUTH_EXPOSE_OTP === '1' ||
  (!IS_PRODUCTION && !MAIL_CONFIGURED && process.env.AUTH_EXPOSE_OTP !== '0');

const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_CLIENT_SECRET = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
const GOOGLE_REDIRECT_URI = String(
  process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`
).trim();
const GOOGLE_CONFIGURED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOGIN_LOCK_WINDOW_MS = Number(process.env.LOGIN_LOCK_WINDOW_MS) || 15 * 60 * 1000;

const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;
  return ADMIN_EMAILS.includes(normalized);
}

function getLanIpAddress() {
  return CACHED_LAN_IP;
}

module.exports = {
  PORT,
  HOST,
  PUBLIC_ROOT,
  DB_DIR,
  DB_PATH,
  IS_PRODUCTION,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  OTP_TTL_MS,
  OTP_RESEND_WINDOW_MS,
  OTP_MAX_PER_WINDOW,
  OTP_MAX_ATTEMPTS,
  AUTH_EXPOSE_OTP,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_CONFIGURED,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_CONFIGURED,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_WINDOW_MS,
  ADMIN_EMAILS,
  isAdminEmail,
  getLanIpAddress
};
