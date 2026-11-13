window.VCardApp = window.VCardApp || {};

window.VCardApp.FieldValidation = (function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_ALLOWED_RE = /[^0-9+\s().-]/g;
  const PHONE_VALID_RE = /^\+?[0-9\s().-]{6,}$/;
  const URL_SCHEMES = /^(https?):\/\//i;

  const LIMITS = {
    firstName: 80,
    lastName: 80,
    jobTitle: 120,
    organization: 120,
    phone: 32,
    whatsapp: 32,
    email: 254,
    location: 120,
    linkedinUrl: 500,
    portfolioUrl: 500,
    photoUrl: 500,
    qrLogoUrl: 500,
    bio: 160,
    slug: 48
  };

  function sanitizePhoneInput(value) {
    return String(value || '')
      .replace(PHONE_ALLOWED_RE, '')
      .slice(0, LIMITS.phone);
  }

  // Valeurs chargees (brouillon local, lien partage, serveur) : meme filtre que la saisie.
  function sanitizePhoneFields(data) {
    if (!data || typeof data !== 'object') return data;
    ['phone', 'whatsapp'].forEach((name) => {
      data[name] = sanitizePhoneInput(data[name]).trim();
    });
    return data;
  }

  function isPhoneValid(value) {
    const phone = String(value || '').trim();
    if (!phone) return true;
    return PHONE_VALID_RE.test(phone) && /\d/.test(phone) && !/[A-Za-z]/.test(phone);
  }

  function normalizeEmail(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^mailto:/i, '')
      .slice(0, LIMITS.email);
  }

  function isEmailValid(value) {
    const email = normalizeEmail(value);
    if (!email) return true;
    return EMAIL_RE.test(email);
  }

  function isUrlValid(value) {
    const raw = String(value || '').trim();
    if (!raw) return true;
    if (!URL_SCHEMES.test(raw)) return false;
    try {
      const url = new URL(raw);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function fieldMessage(name, value) {
    const v = String(value || '').trim();
    if (name === 'phone' || name === 'whatsapp') {
      if (!v) return '';
      if (!isPhoneValid(v)) {
        return 'Numéro invalide : chiffres, espaces, +, (), . et - uniquement';
      }
      return '';
    }
    if (name === 'email') {
      if (!v) return '';
      if (!isEmailValid(v)) {
        return 'E-mail invalide : utilisez le format nom@domaine.ext';
      }
      return '';
    }
    if (name === 'linkedinUrl' || name === 'portfolioUrl' || name === 'photoUrl' || name === 'qrLogoUrl') {
      if (!v) return '';
      if (!isUrlValid(v)) {
        return 'URL invalide : http(s):// obligatoire';
      }
      return '';
    }
    if (name === 'firstName' || name === 'lastName') {
      if (!v) return name === 'firstName' ? 'Prénom requis' : 'Nom requis';
      return '';
    }
    return '';
  }

  function setFieldError(input, message) {
    if (!input) return;
    const wrap = input.closest('div') || input.parentElement;
    let hint = wrap ? wrap.querySelector('[data-field-error]') : null;
    if (!hint && wrap) {
      hint = document.createElement('p');
      hint.dataset.fieldError = 'true';
      hint.className = 'field-error';
      hint.setAttribute('role', 'alert');
      wrap.appendChild(hint);
    }
    if (!hint) return;

    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      input.setCustomValidity(message);
      hint.textContent = message;
      hint.hidden = false;
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      input.setCustomValidity('');
      hint.textContent = '';
      hint.hidden = true;
    }
  }

  function validateField(input) {
    if (!input || !input.name) return true;
    const name = input.name;
    let value = input.value;

    if (name === 'phone' || name === 'whatsapp') {
      const cleaned = sanitizePhoneInput(value);
      if (cleaned !== value) {
        input.value = cleaned;
        value = cleaned;
      }
    }

    if (name === 'email' && value) {
      const normalized = normalizeEmail(value);
      if (normalized !== value) {
        input.value = normalized;
        value = normalized;
      }
    }

    const message = fieldMessage(name, value);
    setFieldError(input, message);
    return !message;
  }

  function validateForm(form) {
    if (!form) return { ok: true, firstInvalid: null };
    const fields = form.querySelectorAll('input[name], textarea[name]');
    let firstInvalid = null;
    fields.forEach((input) => {
      const ok = validateField(input);
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    return { ok: !firstInvalid, firstInvalid };
  }

  function applyLimits(form) {
    if (!form) return;
    Object.keys(LIMITS).forEach((name) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && !el.getAttribute('maxlength')) {
        el.setAttribute('maxlength', String(LIMITS[name]));
      }
    });
  }

  return {
    LIMITS,
    sanitizePhoneInput,
    sanitizePhoneFields,
    normalizeEmail,
    isPhoneValid,
    isEmailValid,
    isUrlValid,
    fieldMessage,
    validateField,
    validateForm,
    applyLimits,
    setFieldError
  };
})();
