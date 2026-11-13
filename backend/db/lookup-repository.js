'use strict';

const { db, newId } = require('./connection');

const MAX_NAME = 120;
const MAX_RESULTS = 20;

function normalizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NAME);
}

function toNameKey(name) {
  return normalizeName(name).toLowerCase();
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createLookupRepo(tableName, idPrefix) {
  const stmtSearch = db.prepare(
    `SELECT id, name, created_at, updated_at
     FROM ${tableName}
     WHERE name_key LIKE ? OR name LIKE ?
     ORDER BY
       CASE WHEN name_key = ? THEN 0
            WHEN name_key LIKE ? THEN 1
            ELSE 2 END,
       name COLLATE NOCASE
     LIMIT ?`
  );

  const stmtGetByKey = db.prepare(
    `SELECT id, name, created_at, updated_at FROM ${tableName} WHERE name_key = ?`
  );

  const stmtInsert = db.prepare(
    `INSERT INTO ${tableName} (id, name, name_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  function search(query, limit = MAX_RESULTS) {
    const q = normalizeName(query);
    const safeLimit = Math.min(Math.max(Number(limit) || MAX_RESULTS, 1), MAX_RESULTS);
    if (!q) {
      const rows = db
        .prepare(
          `SELECT id, name, created_at, updated_at
           FROM ${tableName}
           ORDER BY name COLLATE NOCASE
           LIMIT ?`
        )
        .all(safeLimit);
      return rows.map(mapRow);
    }
    const like = `%${q.toLowerCase()}%`;
    const prefix = `${q.toLowerCase()}%`;
    return stmtSearch.all(like, `%${q}%`, q.toLowerCase(), prefix, safeLimit).map(mapRow);
  }

  function findByName(name) {
    const key = toNameKey(name);
    if (!key) return null;
    return mapRow(stmtGetByKey.get(key));
  }

  function findOrCreate(rawName) {
    const name = normalizeName(rawName);
    if (!name) {
      return null;
    }
    const key = toNameKey(name);
    const existing = mapRow(stmtGetByKey.get(key));
    if (existing) return existing;

    const now = new Date().toISOString();
    const id = newId(idPrefix);
    try {
      stmtInsert.run(id, name, key, now, now);
      return mapRow(stmtGetByKey.get(key));
    } catch (err) {
      // Course: une autre requête a créé la même clé.
      const raced = mapRow(stmtGetByKey.get(key));
      if (raced) return raced;
      throw err;
    }
  }

  return {
    search,
    findByName,
    findOrCreate,
    normalizeName,
    MAX_NAME
  };
}

const jobTitles = createLookupRepo('job_titles', 'job');
const organizations = createLookupRepo('organizations', 'org');

module.exports = {
  jobTitles,
  organizations,
  normalizeName,
  toNameKey,
  MAX_NAME,
  MAX_RESULTS
};
