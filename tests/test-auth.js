const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { test, before, after } = require('node:test');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcard-auth-'));
process.env.DB_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, 'test.sqlite');
process.env.AUTH_EXPOSE_OTP = '1';
process.env.NODE_ENV = 'test';

const {
  handleRegister,
  handleLogin,
  handleVerifyOtp,
  handleMe,
  handleLogout,
  handleUpdateProfile,
  handleMyCards
} = require('../backend/controllers/auth.controller');
const { handleSaveCard, handleGetCard } = require('../backend/controllers/card.controller');
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

function createMockReq(method, body, cookie = '') {
  const payload = body == null ? '' : JSON.stringify(body);
  return {
    method,
    headers: {
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

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/api/auth/register') return handleRegister(req, res);
    if (url.pathname === '/api/auth/login') return handleLogin(req, res);
    if (url.pathname === '/api/auth/verify') return handleVerifyOtp(req, res);
    if (url.pathname === '/api/auth/me') return handleMe(req, res);
    if (url.pathname === '/api/auth/logout') return handleLogout(req, res);
    if (url.pathname === '/api/auth/profile') return handleUpdateProfile(req, res);
    if (url.pathname === '/api/me/cards') return handleMyCards(req, res);
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
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('inscription OTP puis session cookie', async () => {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email: 'ami@example.com',
      firstName: 'Ami',
      lastName: 'Kouassi'
    }),
    regRes
  );
  assert.equal(regRes.statusCode, 200);
  const regBody = regRes.json();
  assert.equal(regBody.otpIssued, true);
  assert.ok(regBody.devOtp);

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'ami@example.com',
      code: regBody.devOtp,
      purpose: 'register'
    }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  const cookie = cookieFrom(verifyRes);
  assert.ok(cookie.includes(SESSION_COOKIE_NAME));

  const meRes = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meRes);
  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.json().user.email, 'ami@example.com');
});

test('sauvegarde carte réservée au propriétaire connecté', async () => {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'Test'
    }),
    regRes
  );
  const otp = regRes.json().devOtp;

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'owner@example.com',
      code: otp,
      purpose: 'register'
    }),
    verifyRes
  );
  const cookie = cookieFrom(verifyRes);

  const saveRes = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      {
        slug: 'owner-test',
        firstName: 'Owner',
        lastName: 'Test',
        email: 'owner@example.com',
        theme: 'obsidian'
      },
      cookie
    ),
    saveRes
  );
  assert.equal(saveRes.statusCode, 200);
  assert.equal(saveRes.json().card.slug, 'owner-test');
  assert.ok(saveRes.json().card.userId);

  const denied = createMockRes();
  await handleSaveCard(
    createMockReq('POST', {
      slug: 'owner-test',
      firstName: 'Hacker',
      lastName: 'X'
    }),
    denied
  );
  assert.equal(denied.statusCode, 401);

  const cardsRes = createMockRes();
  handleMyCards(createMockReq('GET', null, cookie), cardsRes);
  assert.equal(cardsRes.statusCode, 200);
  assert.equal(cardsRes.json().cards.length, 1);
});

test('profil utilisateur modifiable en session', async () => {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email: 'edit@example.com',
      firstName: 'Old',
      lastName: 'Name'
    }),
    regRes
  );
  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'edit@example.com',
      code: regRes.json().devOtp,
      purpose: 'register'
    }),
    verifyRes
  );
  const cookie = cookieFrom(verifyRes);

  const profileRes = createMockRes();
  await handleUpdateProfile(
    createMockReq('PATCH', { firstName: 'New', lastName: 'Persona' }, cookie),
    profileRes
  );
  assert.equal(profileRes.statusCode, 200);
  assert.equal(profileRes.json().user.firstName, 'New');
});

test('endpoint HTTP auth joignable', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com' })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.otpIssued, true);
  assert.ok(data.devOtp);
});

test('logout invalide la session', async () => {
  const loginRes = createMockRes();
  await handleLogin(createMockReq('POST', { email: 'owner@example.com' }), loginRes);
  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'owner@example.com',
      code: loginRes.json().devOtp,
      purpose: 'login'
    }),
    verifyRes
  );
  const cookie = cookieFrom(verifyRes);

  const logoutRes = createMockRes();
  handleLogout(createMockReq('POST', {}, cookie), logoutRes);
  assert.equal(logoutRes.statusCode, 200);

  const meRes = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meRes);
  assert.equal(meRes.statusCode, 401);
});
