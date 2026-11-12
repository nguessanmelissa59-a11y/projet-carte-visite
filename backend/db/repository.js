const { db } = require('./connection');

const stmtGetBySlug = db.prepare('SELECT * FROM cards WHERE slug = ?');
const stmtIncrementScans = db.prepare('UPDATE cards SET scans = scans + 1 WHERE slug = ?');
const stmtListCards = db.prepare(`
  SELECT slug, first_name, last_name, job_title, organization, theme, scans, updated_at, user_id
  FROM cards
  ORDER BY updated_at DESC
  LIMIT 50
`);
const stmtListCardsByUser = db.prepare(`
  SELECT slug, first_name, last_name, job_title, organization, theme, scans, updated_at, user_id
  FROM cards
  WHERE user_id = ?
  ORDER BY updated_at DESC
  LIMIT 50
`);
const stmtUpsertCard = db.prepare(`
  INSERT INTO cards (
    slug, first_name, last_name, job_title, organization,
    phone, whatsapp, email, location, linkedin_url,
    portfolio_url, bio, photo_url, photo_base64, theme,
    auto_download, scans, user_id, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?
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
    user_id = COALESCE(excluded.user_id, cards.user_id),
    updated_at = excluded.updated_at
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
    theme: row.theme || 'obsidian',
    autoDownload: Boolean(row.auto_download),
    scans: Number(row.scans) || 0,
    userId: row.user_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getCardBySlug(slug) {
  return mapRowToCard(stmtGetBySlug.get(slugify(slug)));
}

function incrementScans(slug) {
  const cleanSlug = slugify(slug);
  stmtIncrementScans.run(cleanSlug);
  return getCardBySlug(cleanSlug);
}

function upsertCard(payload, options = {}) {
  const defaultSlug = `${payload.firstName || ''}-${payload.lastName || ''}`;
  const slug = slugify(payload.slug || defaultSlug);
  const now = new Date().toISOString();
  const existing = getCardBySlug(slug);
  const userId = options.userId !== undefined ? options.userId : payload.userId || null;

  stmtUpsertCard.run(
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
    String(payload.theme || 'obsidian'),
    payload.autoDownload === false ? 0 : 1,
    existing ? existing.scans : 0,
    userId,
    existing ? existing.createdAt : now,
    now
  );

  return getCardBySlug(slug);
}

function listCards() {
  return stmtListCards.all().map((r) => ({
    slug: r.slug,
    firstName: r.first_name,
    lastName: r.last_name,
    jobTitle: r.job_title,
    organization: r.organization,
    theme: r.theme,
    scans: r.scans,
    userId: r.user_id || null,
    updatedAt: r.updated_at
  }));
}

function listCardsByUserId(userId) {
  return stmtListCardsByUser.all(userId).map((r) => ({
    slug: r.slug,
    firstName: r.first_name,
    lastName: r.last_name,
    jobTitle: r.job_title,
    organization: r.organization,
    theme: r.theme,
    scans: r.scans,
    userId: r.user_id || null,
    updatedAt: r.updated_at
  }));
}

const countRow = db.prepare('SELECT COUNT(*) AS total FROM cards').get();
if (countRow && countRow.total === 0) {
  upsertCard({
    slug: 'koffi-kouadio',
    firstName: 'Koffi',
    lastName: 'Kouadio',
    jobTitle: 'Directeur Technique & Infrastructure',
    organization: 'NovaTech Africa',
    phone: '+225 07 08 09 10 11',
    whatsapp: '+225 07 08 09 10 11',
    email: 'koffi.kouadio@novatech.ci',
    location: 'Abidjan, Côte d’Ivoire',
    linkedinUrl: 'https://linkedin.com/in/koffi-kouadio',
    portfolioUrl: 'https://novatech-africa.com',
    bio: 'Architecture distribuée, sécurité des systèmes et accompagnement technique.',
    photoUrl: '',
    photoBase64: '',
    theme: 'obsidian',
    autoDownload: true
  });
}

module.exports = {
  slugify,
  getCardBySlug,
  incrementScans,
  upsertCard,
  listCards,
  listCardsByUserId
};
