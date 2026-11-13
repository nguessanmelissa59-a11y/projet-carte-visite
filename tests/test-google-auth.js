'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after, beforeEach } = require('node:test');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcard-google-'));
process.env.DB_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, 'test-google.sqlite');
process.env.NODE_ENV = 'test';
process.env.AUTH_EXPOSE_OTP = '1';
process.env.GOOGLE_CLIENT_ID = 'client-de-test.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'secret-de-test';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback';

const {
  handleAuthProviders,
  handleGoogleStart,
  handleGoogleCallback
} = require('../backend/controllers/google-auth.controller');
const {
  handleRegister,
  handleVerifyOtp,
  handleMe
} = require('../backend/controllers/auth.controller');
const { SESSION_COOKIE_NAME } = require('../backend/config/env');

const HOST = 'localhost:3000';
const originalFetch = globalThis.fetch;
let tokenCalls = [];
let tokenOk = true;
let tokenClaims = {};

function makeIdToken(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(claims)}.signature-factice`;
}

globalThis.fetch = async (url, init) => {
  tokenCalls.push({ url: String(url), body: new URLSearchParams(init.body) });
  return {
    ok: tokenOk,
    async json() {
      return { id_token: makeIdToken(tokenClaims) };
    }
  };
};

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
    },
    cookies() {
      return [].concat(this.headers['Set-Cookie'] || []);
    }
  };
}

function createGetReq(url, { cookie = '', host = HOST } = {}) {
  return { method: 'GET', url, headers: { cookie, host } };
}

function createJsonReq(body) {
  const payload = JSON.stringify(body);
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    on(event, cb) {
      if (event === 'data') cb(payload);
      if (event === 'end') cb();
    }
  };
}

function pairFrom(setCookie) {
  return String(setCookie).split(';')[0];
}

function sessionCookieFrom(res) {
  const found = res.cookies().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  return found ? pairFrom(found) : '';
}

function startFlow(next) {
  const res = createMockRes();
  const query = next === undefined ? '' : `?next=${encodeURIComponent(next)}`;
  handleGoogleStart(createGetReq(`/api/auth/google/start${query}`), res);
  const location = new URL(res.headers.Location);
  return {
    res,
    location,
    state: location.searchParams.get('state'),
    nonce: location.searchParams.get('nonce'),
    challenge: location.searchParams.get('code_challenge'),
    cookie: pairFrom(res.cookies()[0])
  };
}

function validClaims(flow, overrides = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: process.env.GOOGLE_CLIENT_ID,
    exp: Math.floor(Date.now() / 1000) + 300,
    nonce: flow.nonce,
    email: 'awa.kone@gmail.com',
    email_verified: true,
    given_name: 'Awa',
    family_name: 'Koné',
    ...overrides
  };
}

async function callback(flow, { state = flow.state, cookie = flow.cookie, query = 'code=code-de-test' } = {}) {
  const res = createMockRes();
  await handleGoogleCallback(
    createGetReq(
      `/api/auth/google/callback?${query}&state=${encodeURIComponent(state)}`,
      { cookie }
    ),
    res
  );
  return res;
}

function me(cookie) {
  const res = createMockRes();
  handleMe({ method: 'GET', headers: { cookie } }, res);
  return res;
}

// Les refus sont journalises par le controleur : on les garde hors de la sortie de test.
async function quietly(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

beforeEach(() => {
  tokenCalls = [];
  tokenOk = true;
  tokenClaims = {};
});

after(() => {
  globalThis.fetch = originalFetch;
  try {
    const { db } = require('../backend/db/connection');
    if (db && typeof db.close === 'function') db.close();
  } catch {
    // ignore
  }
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Windows peut garder le fichier SQLite verrouillé brièvement.
  }
});

test('bouton Google annoncé uniquement sur l’hôte de retour déclaré', () => {
  const onHost = createMockRes();
  handleAuthProviders(createGetReq('/api/auth/providers'), onHost);
  assert.equal(onHost.json().google, true);

  const onLan = createMockRes();
  handleAuthProviders(createGetReq('/api/auth/providers', { host: '192.168.1.76:3000' }), onLan);
  assert.equal(onLan.json().google, false);
  assert.doesNotMatch(onLan.body, /secret-de-test/);

  const startOnLan = createMockRes();
  handleGoogleStart(
    createGetReq('/api/auth/google/start', { host: '192.168.1.76:3000' }),
    startOnLan
  );
  assert.equal(startOnLan.headers.Location, '/auth.html?error=google_unavailable');
});

test('départ : redirection Google avec state, nonce, PKCE et cookie HttpOnly', () => {
  const flow = startFlow('/admin');
  assert.equal(flow.res.statusCode, 302);
  assert.equal(flow.location.origin + flow.location.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');

  const params = flow.location.searchParams;
  assert.equal(params.get('client_id'), process.env.GOOGLE_CLIENT_ID);
  assert.equal(params.get('redirect_uri'), process.env.GOOGLE_REDIRECT_URI);
  assert.equal(params.get('response_type'), 'code');
  assert.equal(params.get('scope'), 'openid email profile');
  assert.equal(params.get('code_challenge_method'), 'S256');
  assert.ok(flow.state.length >= 43);
  assert.ok(flow.nonce.length >= 43);
  assert.doesNotMatch(flow.location.href, /secret-de-test/);

  const setCookie = flow.res.cookies()[0];
  assert.match(setCookie, /^vcard_oauth=/);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Path=\/api\/auth\/google/);
  assert.match(setCookie, /Max-Age=600/);

  const other = startFlow('/admin');
  assert.notEqual(other.state, flow.state);
  assert.notEqual(other.nonce, flow.nonce);
});

test('retour nominal : compte Gmail créé, vérifié, session ouverte', async () => {
  const flow = startFlow('/?edit=ma-carte');
  tokenClaims = validClaims(flow);
  const res = await callback(flow);

  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.Location, '/?edit=ma-carte');

  assert.equal(tokenCalls.length, 1);
  const sentBody = tokenCalls[0].body;
  assert.equal(tokenCalls[0].url, 'https://oauth2.googleapis.com/token');
  assert.equal(sentBody.get('grant_type'), 'authorization_code');
  assert.equal(sentBody.get('code'), 'code-de-test');
  assert.equal(sentBody.get('redirect_uri'), process.env.GOOGLE_REDIRECT_URI);
  const expectedChallenge = crypto
    .createHash('sha256')
    .update(sentBody.get('code_verifier'))
    .digest('base64url');
  assert.equal(expectedChallenge, flow.challenge);

  const sessionCookie = sessionCookieFrom(res);
  assert.ok(sessionCookie);
  assert.ok(res.cookies().some((c) => /^vcard_oauth=;.*Max-Age=0/.test(c)));
  assert.match(res.cookies().find((c) => c.startsWith(SESSION_COOKIE_NAME)), /HttpOnly/);

  const meRes = me(sessionCookie);
  assert.equal(meRes.statusCode, 200);
  const user = meRes.json().user;
  assert.equal(user.email, 'awa.kone@gmail.com');
  assert.equal(user.firstName, 'Awa');
  assert.equal(user.lastName, 'Koné');
  assert.equal(user.emailVerified, true);
  assert.equal(user.hasPassword, false);
  assert.equal(user.role, 'user');
});

test('compte existant : rattaché par e-mail, sans doublon', async () => {
  const email = 'deja.inscrit@gmail.com';
  const regRes = createMockRes();
  await handleRegister(createJsonReq({ email, firstName: 'Deja', lastName: 'Inscrit' }), regRes);
  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createJsonReq({ email, code: regRes.json().devOtp, purpose: 'register' }),
    verifyRes
  );
  const existingId = verifyRes.json().user.id;

  const flow = startFlow();
  tokenClaims = validClaims(flow, { email: 'Deja.Inscrit@Gmail.com', given_name: 'Autre', family_name: 'Nom' });
  const res = await callback(flow);
  assert.equal(res.headers.Location, '/');

  const user = me(sessionCookieFrom(res)).json().user;
  assert.equal(user.id, existingId);
  assert.equal(user.firstName, 'Deja');
});

test('domaine Workspace accepté, autre domaine refusé', async () => {
  const workspace = startFlow();
  tokenClaims = validClaims(workspace, { email: 'direction@entreprise.ci', hd: 'entreprise.ci' });
  const accepted = await callback(workspace);
  assert.equal(accepted.headers.Location, '/');
  assert.ok(sessionCookieFrom(accepted));

  const other = startFlow();
  tokenClaims = validClaims(other, { email: 'quelquun@fournisseur.example' });
  const refused = await quietly(() => callback(other));
  assert.equal(refused.headers.Location, '/auth.html?error=google_email');
  assert.equal(sessionCookieFrom(refused), '');
});

test('retour refusé si state, cookie ou code ne correspondent pas', async () => {
  const flow = startFlow();
  tokenClaims = validClaims(flow);

  const wrongState = await callback(flow, { state: 'un-autre-state' });
  const noCookie = await callback(flow, { cookie: '' });
  const foreignCookie = await callback(flow, { cookie: startFlow().cookie });
  const noCode = await callback(flow, { query: 'scope=openid' });
  const onLan = createMockRes();
  await handleGoogleCallback(
    createGetReq(`/api/auth/google/callback?code=x&state=${flow.state}`, {
      cookie: flow.cookie,
      host: '192.168.1.76:3000'
    }),
    onLan
  );

  for (const res of [wrongState, noCookie, foreignCookie, noCode]) {
    assert.equal(res.headers.Location, '/auth.html?error=google_failed');
    assert.equal(sessionCookieFrom(res), '');
  }
  assert.equal(onLan.headers.Location, '/auth.html?error=google_unavailable');
  assert.equal(tokenCalls.length, 0);

  const cancelled = await callback(flow, { query: 'error=access_denied' });
  assert.equal(cancelled.headers.Location, '/auth.html?error=google_cancelled');
  assert.equal(tokenCalls.length, 0);
});

test('jeton refusé : nonce, audience, émetteur, expiration, e-mail non vérifié', async () => {
  const cases = [
    { nonce: 'nonce-d-un-autre-navigateur' },
    { aud: 'autre-client.apps.googleusercontent.com' },
    { iss: 'https://accounts.example.com' },
    { exp: Math.floor(Date.now() / 1000) - 10 },
    { email_verified: false },
    { email: '' }
  ];

  for (const overrides of cases) {
    const flow = startFlow();
    tokenClaims = validClaims(flow, overrides);
    const res = await quietly(() => callback(flow));
    assert.equal(res.headers.Location, '/auth.html?error=google_failed', JSON.stringify(overrides));
    assert.equal(sessionCookieFrom(res), '');
  }

  const refusedByGoogle = startFlow();
  tokenClaims = validClaims(refusedByGoogle);
  tokenOk = false;
  const res = await quietly(() => callback(refusedByGoogle));
  assert.equal(res.headers.Location, '/auth.html?error=google_failed');
  assert.equal(sessionCookieFrom(res), '');
});

test('paramètre next : chemin local uniquement', async () => {
  for (const next of ['//example.com', '/\\example.com', 'https://example.com', '/a\nSet-Cookie: x=1', '/a b']) {
    const flow = startFlow(next);
    tokenClaims = validClaims(flow);
    const res = await callback(flow);
    assert.equal(res.headers.Location, '/', JSON.stringify(next));
  }
});
