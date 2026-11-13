const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}\p{M}\s'.-]{1,80}$/u;
const OTP_RE = /^\d{6}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

function validateEmail(email) {
  const value = String(email || '')
    .trim()
    .toLowerCase()
    .slice(0, 254);
  if (!value || !EMAIL_RE.test(value)) {
    return { ok: false, error: 'Adresse e-mail invalide' };
  }
  return { ok: true, value };
}

function validateName(name, label) {
  const value = String(name || '').trim().slice(0, 80);
  if (!value) {
    return { ok: false, error: `${label} requis` };
  }
  if (!NAME_RE.test(value)) {
    return { ok: false, error: `${label} contient des caractères non autorisés` };
  }
  return { ok: true, value };
}

function validateOtpCode(code) {
  const value = String(code || '').trim();
  if (!OTP_RE.test(value)) {
    return { ok: false, error: 'Code OTP invalide' };
  }
  return { ok: true, value };
}

function validateOtpMethod(method) {
  const value = String(method || 'email')
    .trim()
    .toLowerCase();
  if (value === 'email' || value === 'authenticator') {
    return { ok: true, value };
  }
  return { ok: false, error: 'Méthode de vérification invalide' };
}

function normalizePassword(password) {
  if (typeof password !== 'string') return '';
  const value = password.normalize('NFKC');
  return value.length > PASSWORD_MAX_LENGTH ? '' : value;
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    return { ok: false, error: 'Mot de passe invalide' };
  }
  const value = password.normalize('NFKC');
  if (value.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`
    };
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      error: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères`
    };
  }
  return { ok: true, value };
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateEmail,
  validateName,
  validateOtpCode,
  validateOtpMethod,
  validatePassword,
  normalizePassword
};
