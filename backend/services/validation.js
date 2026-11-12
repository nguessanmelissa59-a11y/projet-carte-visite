'use strict';

const FIELD_LIMITS = {
  slug: 48,
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
  photoBase64: 1_500_000,
  qrLogoBase64: 500_000
};

const ALLOWED_URL_SCHEMES = new Set(['https:', 'http:']);
const ALLOWED_THEMES = new Set([
  'obsidian',
  'forest',
  'cobalt',
  'bronze',
  'bordeaux',
  'teal',
  'gold',
  'navy',
  'plum',
  'indigo'
]);
const ALLOWED_CARD_TEMPLATES = new Set([
  'editorial',
  'minimal',
  'corporate',
  'creative',
  'eco',
  'prestige',
  'nocturne',
  'atelier',
  'lagoon',
  'slate',
  'sunset',
  'sumi',
  'arctic',
  'metro'
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s().-]{6,}$/;
const PHONE_HAS_DIGIT_RE = /\d/;
const PHONE_HAS_LETTER_RE = /[A-Za-z\u00C0-\u024F]/;

function asString(value, max) {
  const s = String(value ?? '').trim();
  if (s.length > max) {
    throw new Error('Champ trop long');
  }
  return s;
}

function assertSlug(raw) {
  const slug = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, FIELD_LIMITS.slug);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug invalide');
  }
  return slug;
}

function assertEmail(raw) {
  const email = asString(raw, FIELD_LIMITS.email);
  if (!email) return '';
  if (email.toLowerCase().startsWith('mailto:')) {
    throw new Error('Email invalide');
  }
  if (!EMAIL_RE.test(email)) {
    throw new Error('Email invalide');
  }
  return email.toLowerCase();
}

function assertPhone(raw, max = FIELD_LIMITS.phone) {
  const phone = asString(raw, max);
  if (!phone) return '';
  if (PHONE_HAS_LETTER_RE.test(phone) || !PHONE_RE.test(phone) || !PHONE_HAS_DIGIT_RE.test(phone)) {
    throw new Error('Telephone invalide');
  }
  return phone;
}

function assertHttpUrl(raw, max) {
  const value = asString(raw, max);
  if (!value) return '';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('URL invalide');
  }
  if (!ALLOWED_URL_SCHEMES.has(url.protocol)) {
    throw new Error('Scheme URL non autorise');
  }
  if (url.username || url.password) {
    throw new Error('URL invalide');
  }
  return url.toString();
}

function assertTheme(raw) {
  const theme = String(raw || 'forest');
  if (!ALLOWED_THEMES.has(theme)) {
    throw new Error('Theme invalide');
  }
  return theme;
}

function assertCardTemplate(raw) {
  const tpl = String(raw || 'editorial');
  if (!ALLOWED_CARD_TEMPLATES.has(tpl)) {
    throw new Error('Template invalide');
  }
  return tpl;
}

function assertPhotoBase64(raw, max = FIELD_LIMITS.photoBase64) {
  const value = String(raw || '');
  if (!value) return '';
  if (value.length > max) {
    throw new Error('Image trop volumineuse');
  }
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
    throw new Error('Image invalide');
  }
  return value;
}

function assertAutoDownload(raw) {
  if (raw === true || raw === false) return raw;
  if (raw === 1 || raw === '1') return true;
  if (raw === 0 || raw === '0' || raw === '' || raw == null) return false;
  throw new Error('autoDownload invalide');
}

function sanitizeCardPayload(raw) {
  const payload = raw && typeof raw === 'object' ? raw : {};
  const firstName = asString(payload.firstName, FIELD_LIMITS.firstName);
  const lastName = asString(payload.lastName, FIELD_LIMITS.lastName);
  if (!firstName || !lastName) {
    throw new Error('Prenom et nom requis');
  }

  const slugSource = payload.slug || `${firstName}-${lastName}`;

  return {
    slug: assertSlug(slugSource),
    firstName,
    lastName,
    jobTitle: asString(payload.jobTitle, FIELD_LIMITS.jobTitle),
    organization: asString(payload.organization, FIELD_LIMITS.organization),
    phone: assertPhone(payload.phone, FIELD_LIMITS.phone),
    whatsapp: assertPhone(payload.whatsapp, FIELD_LIMITS.whatsapp),
    email: assertEmail(payload.email),
    location: asString(payload.location, FIELD_LIMITS.location),
    linkedinUrl: assertHttpUrl(payload.linkedinUrl, FIELD_LIMITS.linkedinUrl),
    portfolioUrl: assertHttpUrl(payload.portfolioUrl, FIELD_LIMITS.portfolioUrl),
    bio: asString(payload.bio, FIELD_LIMITS.bio),
    photoUrl: assertHttpUrl(payload.photoUrl, FIELD_LIMITS.photoUrl),
    photoBase64: assertPhotoBase64(payload.photoBase64, FIELD_LIMITS.photoBase64),
    qrLogoUrl: assertHttpUrl(payload.qrLogoUrl, FIELD_LIMITS.qrLogoUrl),
    qrLogoBase64: assertPhotoBase64(payload.qrLogoBase64, FIELD_LIMITS.qrLogoBase64),
    theme: assertTheme(payload.theme),
    cardTemplate: assertCardTemplate(payload.cardTemplate),
    autoDownload: assertAutoDownload(payload.autoDownload)
  };
}

module.exports = {
  FIELD_LIMITS,
  ALLOWED_THEMES,
  ALLOWED_CARD_TEMPLATES,
  asString,
  assertSlug,
  assertEmail,
  assertPhone,
  assertHttpUrl,
  assertTheme,
  assertCardTemplate,
  assertPhotoBase64,
  assertAutoDownload,
  sanitizeCardPayload
};
