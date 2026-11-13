'use strict';

const { sendJson, readJsonBody } = require('../http/json');
const { resolveSessionFromRequest } = require('../services/session-service');
const { jobTitles, organizations, MAX_NAME, MAX_RESULTS } = require('../db/lookup-repository');

function handleSearch(req, res, repo) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const q = url.searchParams.get('q') || '';
  const limit = url.searchParams.get('limit') || MAX_RESULTS;
  const items = repo.search(q, limit);
  sendJson(res, 200, { items });
}

async function handleCreate(req, res, repo, label) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    return sendJson(res, 401, { error: 'Authentification requise' });
  }

  try {
    const body = await readJsonBody(req);
    const name = repo.normalizeName(body && body.name);
    if (!name) {
      return sendJson(res, 400, { error: `${label} requis` });
    }
    if (name.length > MAX_NAME) {
      return sendJson(res, 400, { error: `${label} trop long` });
    }
    const item = repo.findOrCreate(name);
    sendJson(res, 200, { item, created: true });
  } catch (err) {
    sendJson(res, 400, { error: err.message || 'Requete invalide' });
  }
}

function handleSearchJobTitles(req, res) {
  return handleSearch(req, res, jobTitles);
}

function handleCreateJobTitle(req, res) {
  return handleCreate(req, res, jobTitles, 'Poste');
}

function handleSearchOrganizations(req, res) {
  return handleSearch(req, res, organizations);
}

function handleCreateOrganization(req, res) {
  return handleCreate(req, res, organizations, 'Entreprise');
}

module.exports = {
  handleSearchJobTitles,
  handleCreateJobTitle,
  handleSearchOrganizations,
  handleCreateOrganization
};
