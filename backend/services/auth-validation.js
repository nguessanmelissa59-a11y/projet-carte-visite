const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}\p{M}\s'.-]{1,80}$/u;
const OTP_RE = /^\d{6}$/;

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

module.exports = {
  validateEmail,
  validateName,
  validateOtpCode
};
