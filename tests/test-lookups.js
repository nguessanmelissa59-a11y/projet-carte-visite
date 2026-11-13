'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test, before, after } = require('node:test');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcard-lookups-'));
process.env.DB_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, 'test.sqlite');
process.env.AUTH_EXPOSE_OTP = '1';
process.env.NODE_ENV = 'test';

const {
  handleRegister,
  handleVerifyOtp
} = require('../backend/controllers/auth.controller');
const {
  handleSearchJobTitles,
  handleCreateJobTitle,
  handleSearchOrganizations,
  handleCreateOrganization
} = require('../backend/controllers/lookup.controller');
const { handleSaveCard, handleGetCard } = require('../backend/controllers/card.controller');
const { jobTitles, organizations } = require('../backend/db/lookup-repository');
const { SESSION_COOKIE_NAME } = require('../backend/config/env');

let server;
let baseUrl = '';

function createMockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(code, headers = {}) {
      this.statusCode = code;
      this.headers = { ...this.headers, ...headers };
    },
    end(chunk = '') {
      this.body = chunk;
    },
    json() {
      return this.body ? JSON.parse(this.body) : {};
    }
  };
}

function createMockReq(method, urlPath, body, cookie = '') {
  const payload = body == null ? '' : JSON.stringify(body);
  return {
    method,
    url: urlPath,
    headers: {
      host: '127.0.0.1',
      cookie,
      'content-type': 'application/json'
    },
    on(event, cb) {
      if (event === 'data') cb(payload);
      if (event === 'end') cb();
    }
  };
}

function cookieFrom(res) {
  const raw = res.headers['Set-Cookie'] || '';
  const match = String(raw).match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? `${SESSION_COOKIE_NAME}=${match[1]}` : '';
}

async function registerAndLogin(email) {
  const reg = createMockRes();
  await handleRegister(
    createMockReq('POST', '/api/auth/register', {
      email,
      firstName: 'Lookup',
      lastName: 'User'
    }),
    reg
  );
  assert.equal(reg.statusCode, 200);
  const otp = reg.json().devOtp;
  assert.ok(otp);

  const verify = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', '/api/auth/verify', {
      email,
      code: otp,
      purpose: 'register'
    }),
    verify
  );
  assert.equal(verify.statusCode, 200);
  return cookieFrom(verify);
}

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/auth/register') return handleRegister(req, res);
    if (url.pathname === '/api/auth/login') return handleLogin(req, res);
    if (url.pathname === '/api/auth/verify') return handleVerifyOtp(req, res);
    if (url.pathname === '/api/lookups/job-titles' && req.method === 'GET') {
      return handleSearchJobTitles(req, res);
    }
    if (url.pathname === '/api/lookups/job-titles' && req.method === 'POST') {
      return handleCreateJobTitle(req, res);
    }
    if (url.pathname === '/api/lookups/organizations' && req.method === 'GET') {
      return handleSearchOrganizations(req, res);
    }
    if (url.pathname === '/api/lookups/organizations' && req.method === 'POST') {
      return handleCreateOrganization(req, res);
    }
    if (url.pathname === '/api/cards' && req.method === 'POST') return handleSaveCard(req, res);
    const cardMatch = url.pathname.match(/^\/api\/cards\/([a-zA-Z0-9_-]+)$/);
    if (cardMatch && req.method === 'GET') return handleGetCard(req, res, cardMatch[1], false);
    res.writeHead(404);
    res.end('not found');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  try {
    const { db } = require('../backend/db/connection');
    if (db && typeof db.close === 'function') db.close();
  } catch {
    // ignore
  }
});

test('lookup repository enforces unique name_key and findOrCreate', () => {
  const a = jobTitles.findOrCreate('  Directeur Technique ');
  const b = jobTitles.findOrCreate('directeur technique');
  assert.ok(a);
  assert.equal(a.name, 'Directeur Technique');
  assert.equal(a.id, b.id);

  const orgA = organizations.findOrCreate('NovaTech Africa');
  const orgB = organizations.findOrCreate('novatech africa');
  assert.equal(orgA.id, orgB.id);
});

test('seed poste et entreprise de test sont charges', () => {
  const jobs = jobTitles.search('', 50);
  const orgs = organizations.search('', 50);
  const jobNames = jobs.map((it) => it.name);
  const orgNames = orgs.map((it) => it.name);

  assert.ok(jobNames.includes('Directeur Technique'));
  assert.ok(jobNames.includes('Product Owner'));
  assert.ok(jobNames.includes('Chef de Projet'));
  assert.ok(orgNames.includes('NovaTech Africa'));
  assert.ok(orgNames.includes('EVC Melissa'));
  assert.ok(orgNames.includes('SoftLab Abidjan'));
  assert.ok(jobs.length >= 10);
  assert.ok(orgs.length >= 8);
});

test('search job titles and organizations without auth', async () => {
  jobTitles.findOrCreate('Product Owner');
  organizations.findOrCreate('Acme CI');

  const jobRes = createMockRes();
  handleSearchJobTitles(
    createMockReq('GET', '/api/lookups/job-titles?q=product'),
    jobRes
  );
  assert.equal(jobRes.statusCode, 200);
  const jobs = jobRes.json().items;
  assert.ok(jobs.some((it) => /product owner/i.test(it.name)));

  const orgRes = createMockRes();
  handleSearchOrganizations(
    createMockReq('GET', '/api/lookups/organizations?q=acme'),
    orgRes
  );
  assert.equal(orgRes.statusCode, 200);
  const orgs = orgRes.json().items;
  assert.ok(orgs.some((it) => /acme/i.test(it.name)));
});

test('create lookup requires auth and is idempotent', async () => {
  const unauthorized = createMockRes();
  await handleCreateJobTitle(
    createMockReq('POST', '/api/lookups/job-titles', { name: 'CTO' }),
    unauthorized
  );
  assert.equal(unauthorized.statusCode, 401);

  const cookie = await registerAndLogin(`lookup-${Date.now()}@example.com`);
  const created = createMockRes();
  await handleCreateOrganization(
    createMockReq('POST', '/api/lookups/organizations', { name: '  SoftLab  ' }, cookie),
    created
  );
  assert.equal(created.statusCode, 200);
  assert.equal(created.json().item.name, 'SoftLab');

  const again = createMockRes();
  await handleCreateOrganization(
    createMockReq('POST', '/api/lookups/organizations', { name: 'softlab' }, cookie),
    again
  );
  assert.equal(again.statusCode, 200);
  assert.equal(again.json().item.id, created.json().item.id);
});

test('saving a card links job_title_id and organization_id', async () => {
  const cookie = await registerAndLogin(`card-lookup-${Date.now()}@example.com`);
  const save = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      '/api/cards',
      {
        firstName: 'Awa',
        lastName: 'Koné',
        slug: `awa-kone-${Date.now()}`,
        email: 'awa@example.com',
        phone: '+22507000000',
        jobTitle: 'Ingénieure Logiciel',
        organization: 'EVC Melissa'
      },
      cookie
    ),
    save
  );
  assert.equal(save.statusCode, 200);
  const card = save.json().card;
  assert.equal(card.jobTitle, 'Ingénieure Logiciel');
  assert.equal(card.organization, 'EVC Melissa');
  assert.ok(card.jobTitleId);
  assert.ok(card.organizationId);

  const job = jobTitles.findByName('Ingénieure Logiciel');
  const org = organizations.findByName('EVC Melissa');
  assert.equal(card.jobTitleId, job.id);
  assert.equal(card.organizationId, org.id);
  assert.ok(baseUrl);
});
