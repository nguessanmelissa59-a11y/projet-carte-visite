const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { DB_DIR, DB_PATH } = require('../config/env');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;

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
    theme TEXT NOT NULL DEFAULT 'obsidian',
    auto_download INTEGER NOT NULL DEFAULT 1,
    scans INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    email_verified INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_challenges (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    created_at TEXT NOT NULL,
    meta_json TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_challenges(email, created_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS job_titles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_job_titles_name ON job_titles(name);
  CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
`);

function ensureColumn(tableName, columnName, columnSql) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((col) => col.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`);
  }
}

ensureColumn('cards', 'user_id', 'user_id TEXT');
ensureColumn('users', 'role', "role TEXT NOT NULL DEFAULT 'user'");
ensureColumn('cards', 'job_title_id', 'job_title_id TEXT');
ensureColumn('cards', 'organization_id', 'organization_id TEXT');

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_cards_job_title_id ON cards(job_title_id);
  CREATE INDEX IF NOT EXISTS idx_cards_organization_id ON cards(organization_id);
`);

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function seedLookupFromCards(tableName, columnName) {
  const rows = db.prepare(
    `SELECT DISTINCT TRIM(${columnName}) AS name
     FROM cards
     WHERE TRIM(${columnName}) != ''`
  ).all();
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO ${tableName} (id, name, name_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) continue;
    const nameKey = name.toLowerCase();
    insert.run(newId(tableName === 'job_titles' ? 'job' : 'org'), name, nameKey, now, now);
  }
}

seedLookupFromCards('job_titles', 'job_title');
seedLookupFromCards('organizations', 'organization');

module.exports = {
  db,
  newId
};
