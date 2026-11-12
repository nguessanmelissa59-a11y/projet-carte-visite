const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { DB_DIR, DB_PATH } = require('../config/env');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    slug TEXT PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    organization TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    portfolio_url TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    photo_base64 TEXT NOT NULL DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'indigo',
    auto_download INTEGER NOT NULL DEFAULT 1,
    scans INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

function slugify(text) {
  const cleaned = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return cleaned || 'contact';
}

function mapRowToCard(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    firstName: row.first_name,
    lastName: row.last_name,
    jobTitle: row.job_title,
    organization: row.organization,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    location: row.location,
    linkedinUrl: row.linkedin_url,
    portfolioUrl: row.portfolio_url,
    bio: row.bio,
    photoUrl: row.photo_url,
    photoBase64: row.photo_base64,
    theme: row.theme || 'indigo',
    autoDownload: Boolean(row.auto_download),
    scans: Number(row.scans) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getCardBySlug(slug) {
  const stmt = db.prepare('SELECT * FROM cards WHERE slug = ?');
  const row = stmt.get(slugify(slug));
  return mapRowToCard(row);
}

function incrementScans(slug) {
  const cleanSlug = slugify(slug);
  const stmt = db.prepare('UPDATE cards SET scans = scans + 1 WHERE slug = ?');
  stmt.run(cleanSlug);
  return getCardBySlug(cleanSlug);
}

function upsertCard(payload) {
  const defaultSlug = `${payload.firstName || ''}-${payload.lastName || ''}`;
  const slug = slugify(payload.slug || defaultSlug);
  const now = new Date().toISOString();
  const existing = getCardBySlug(slug);

  const stmt = db.prepare(`
    INSERT INTO cards (
      slug, first_name, last_name, job_title, organization,
      phone, whatsapp, email, location, linkedin_url,
      portfolio_url, bio, photo_url, photo_base64, theme,
      auto_download, scans, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT(slug) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      job_title = excluded.job_title,
      organization = excluded.organization,
      phone = excluded.phone,
      whatsapp = excluded.whatsapp,
      email = excluded.email,
      location = excluded.location,
      linkedin_url = excluded.linkedin_url,
      portfolio_url = excluded.portfolio_url,
      bio = excluded.bio,
      photo_url = excluded.photo_url,
      photo_base64 = excluded.photo_base64,
      theme = excluded.theme,
      auto_download = excluded.auto_download,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    slug,
    String(payload.firstName || '').trim(),
    String(payload.lastName || '').trim(),
    String(payload.jobTitle || '').trim(),
    String(payload.organization || '').trim(),
    String(payload.phone || '').trim(),
    String(payload.whatsapp || '').trim(),
    String(payload.email || '').trim(),
    String(payload.location || '').trim(),
    String(payload.linkedinUrl || '').trim(),
    String(payload.portfolioUrl || '').trim(),
    String(payload.bio || '').trim(),
    String(payload.photoUrl || '').trim(),
    String(payload.photoBase64 || ''),
    String(payload.theme || 'indigo'),
    payload.autoDownload === false ? 0 : 1,
    existing ? existing.scans : 0,
    existing ? existing.createdAt : now,
    now
  );

  return getCardBySlug(slug);
}

function listCards() {
  const stmt = db.prepare(`
    SELECT slug, first_name, last_name, job_title, organization, theme, scans, updated_at
    FROM cards
    ORDER BY updated_at DESC
    LIMIT 50
  `);
  return stmt.all().map((r) => ({
    slug: r.slug,
    firstName: r.first_name,
    lastName: r.last_name,
    jobTitle: r.job_title,
    organization: r.organization,
    theme: r.theme,
    scans: r.scans,
    updatedAt: r.updated_at
  }));
}

function seedDefaultIfNeeded() {
  const countRow = db.prepare('SELECT COUNT(*) AS total FROM cards').get();
  if (countRow && countRow.total === 0) {
    upsertCard({
      slug: 'koffi-kouadio',
      firstName: 'Koffi',
      lastName: 'Kouadio',
      jobTitle: 'Directeur Technique & Solutions Cloud',
      organization: 'NovaTech Africa',
      phone: '+225 07 08 09 10 11',
      whatsapp: '+225 07 08 09 10 11',
      email: 'koffi.kouadio@novatech.ci',
      location: 'Abidjan, Côte d’Ivoire',
      linkedinUrl: 'https://linkedin.com/in/koffi-kouadio',
      portfolioUrl: 'https://novatech-africa.com',
      bio: 'Architecte Cloud & Développeur Full-Stack. Accompagnement des entreprises dans leur transformation digitale.',
      photoUrl: '',
      photoBase64: '',
      theme: 'indigo',
      autoDownload: true
    });
  }
}

seedDefaultIfNeeded();

module.exports = {
  slugify,
  getCardBySlug,
  incrementScans,
  upsertCard,
  listCards
};

