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
  handlePasswordLogin,
  handleVerifyOtp,
  handleSetPassword,
  handleMe,
  handleLogout,
  handleUpdateProfile,
  handleMyCards
} = require('../backend/controllers/auth.controller');
const { hashPassword, verifyPassword } = require('../backend/services/password-service');
const { handleSaveCard, handleGetCard, handleGetServerInfo } = require('../backend/controllers/card.controller');
const { SESSION_COOKIE_NAME, SESSION_IDLE_MS } = require('../backend/config/env');
const { db } = require('../backend/db/connection');
const { hashValue } = require('../backend/db/auth-repository');

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

  const withoutPassword = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'ami@example.com',
      code: regBody.devOtp,
      purpose: 'register'
    }),
    withoutPassword
  );
  assert.equal(withoutPassword.statusCode, 400);
  assert.match(String(withoutPassword.json().error || ''), /mot de passe/i);

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'ami@example.com',
      code: regBody.devOtp,
      purpose: 'register',
      password: 'phrase de passe 42'
    }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.json().user.hasPassword, true);
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
      purpose: 'register',
      password: 'phrase de passe 42'
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

  const badPhone = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      {
        slug: 'owner-test',
        firstName: 'Owner',
        lastName: 'Test',
        phone: 'texte-interdit'
      },
      cookie
    ),
    badPhone
  );
  assert.equal(badPhone.statusCode, 400);
  assert.match(String(badPhone.json().error || ''), /Telephone|invalide/i);

  const badEmail = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      {
        slug: 'owner-test',
        firstName: 'Owner',
        lastName: 'Test',
        email: 'pas-une-adresse'
      },
      cookie
    ),
    badEmail
  );
  assert.equal(badEmail.statusCode, 400);
  assert.match(String(badEmail.json().error || ''), /Email|invalide/i);

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
      purpose: 'register',
      password: 'phrase de passe 42'
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

test('session expire apres inactivite (idle)', async () => {
  assert.ok(SESSION_IDLE_MS >= 60 * 1000, 'SESSION_IDLE_MS trop court');
  const infoRes = createMockRes();
  handleGetServerInfo(createMockReq('GET'), infoRes);
  assert.equal(infoRes.statusCode, 200);
  assert.equal(infoRes.json().auth.idleTimeoutMs, SESSION_IDLE_MS);

  const verifyRes = await registerWithCode('idle.user@example.com');
  const cookie = cookieFrom(verifyRes);
  assert.ok(cookie.includes(SESSION_COOKIE_NAME));

  const meOk = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meOk);
  assert.equal(meOk.statusCode, 200);
  assert.equal(meOk.json().idleTimeoutMs, SESSION_IDLE_MS);

  const rawToken = decodeURIComponent(cookie.slice(`${SESSION_COOKIE_NAME}=`.length));
  const staleIso = new Date(Date.now() - SESSION_IDLE_MS - 1000).toISOString();
  const updated = db
    .prepare('UPDATE sessions SET last_active_at = ? WHERE token_hash = ?')
    .run(staleIso, hashValue(rawToken));
  assert.equal(updated.changes, 1);

  const meIdle = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meIdle);
  assert.equal(meIdle.statusCode, 401);

  const meAgain = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meAgain);
  assert.equal(meAgain.statusCode, 401);
});

async function registerWithCode(email, verifyExtra = {}) {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', { email, firstName: 'Test', lastName: 'Compte' }),
    regRes
  );
  assert.equal(regRes.statusCode, 200);
  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email,
      code: regRes.json().devOtp,
      purpose: 'register',
      password: 'phrase de passe 42',
      ...verifyExtra
    }),
    verifyRes
  );
  return verifyRes;
}

async function passwordLogin(email, password) {
  const res = createMockRes();
  await handlePasswordLogin(createMockReq('POST', { email, password }), res);
  return res;
}

async function setPassword(body, cookie) {
  const res = createMockRes();
  await handleSetPassword(createMockReq('POST', body, cookie), res);
  return res;
}

function isSessionAlive(cookie) {
  const res = createMockRes();
  handleMe(createMockReq('GET', null, cookie), res);
  return res.statusCode === 200;
}

test('hash de mot de passe : format scrypt, vérification stricte', async () => {
  const stored = await hashPassword('une phrase secrete');
  assert.match(stored, /^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.notEqual(stored, await hashPassword('une phrase secrete'));
  assert.equal(await verifyPassword('une phrase secrete', stored), true);
  assert.equal(await verifyPassword('une phrase secrete ', stored), false);
  assert.equal(await verifyPassword('une phrase secrete', ''), false);
  assert.equal(await verifyPassword('une phrase secrete', 'scrypt$1$1$1$AA==$AA=='), false);
});

test('inscription avec mot de passe puis connexion sans OTP', async () => {
  const verifyRes = await registerWithCode('pwd@example.com', {
    password: 'phrase de passe 42'
  });
  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.json().user.hasPassword, true);
  assert.doesNotMatch(verifyRes.body, /scrypt|passwordHash|password_hash/);

  const loginRes = await passwordLogin('PWD@example.com', 'phrase de passe 42');
  assert.equal(loginRes.statusCode, 200);
  assert.equal(loginRes.json().user.email, 'pwd@example.com');
  assert.doesNotMatch(loginRes.body, /scrypt|passwordHash|password_hash/);

  const cookie = cookieFrom(loginRes);
  assert.ok(cookie.includes(SESSION_COOKIE_NAME));
  assert.match(String(loginRes.headers['Set-Cookie']), /HttpOnly/);
  assert.match(String(loginRes.headers['Set-Cookie']), /SameSite=Lax/);

  const meRes = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meRes);
  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.json().user.hasPassword, true);
  assert.doesNotMatch(meRes.body, /scrypt|passwordHash|password_hash/);
});

test('connexion par mot de passe refusée avec une réponse uniforme', async () => {
  await registerWithCode('uniforme@example.com', { password: 'phrase de passe 42' });

  const wrong = await passwordLogin('uniforme@example.com', 'mauvaise phrase 42');
  const unknown = await passwordLogin('inconnu@example.com', 'phrase de passe 42');
  const empty = await passwordLogin('uniforme@example.com', '');
  const notString = await passwordLogin('uniforme@example.com', { $ne: '' });

  for (const res of [wrong, unknown, empty, notString]) {
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().error, wrong.json().error);
    assert.equal(cookieFrom(res), '');
  }

  const badEmail = await passwordLogin('pas-une-adresse', 'phrase de passe 42');
  assert.equal(badEmail.statusCode, 400);
});

test('inscription refusee sans mot de passe avec OTP', async () => {
  const email = 'sans-mdp@example.com';
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', { email, firstName: 'Sans', lastName: 'Mdp' }),
    regRes
  );
  assert.equal(regRes.statusCode, 200);

  const missing = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email,
      code: regRes.json().devOtp,
      purpose: 'register'
    }),
    missing
  );
  assert.equal(missing.statusCode, 400);
  assert.match(String(missing.json().error || ''), /mot de passe/i);

  // Le code n'a pas ete consomme : une 2e tentative avec mot de passe doit passer.
  const ok = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email,
      code: regRes.json().devOtp,
      purpose: 'register',
      password: 'phrase de passe 42'
    }),
    ok
  );
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().user.hasPassword, true);
});

test('compte non vérifié : pas de connexion par mot de passe', async () => {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email: 'non-verifie@example.com',
      firstName: 'Non',
      lastName: 'Verifie',
      password: 'phrase de passe 42'
    }),
    regRes
  );
  assert.equal(regRes.statusCode, 200);

  const loginRes = await passwordLogin('non-verifie@example.com', 'phrase de passe 42');
  assert.equal(loginRes.statusCode, 401);
});

test('mot de passe invalide à la vérification : refus sans consommer le code', async () => {
  const email = 'court@example.com';
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', { email, firstName: 'Mot', lastName: 'Court' }),
    regRes
  );
  const code = regRes.json().devOtp;

  for (const password of ['court', 'x'.repeat(129), 12345678]) {
    const res = createMockRes();
    await handleVerifyOtp(
      createMockReq('POST', { email, code, purpose: 'register', password }),
      res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(cookieFrom(res), '');
  }

  const okRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', { email, code, purpose: 'register', password: 'phrase de passe 42' }),
    okRes
  );
  assert.equal(okRes.statusCode, 200);
  assert.equal(okRes.json().user.hasPassword, true);
});

test('blocage après trop d’échecs, la connexion par code reste possible', async () => {
  const email = 'blocage@example.com';
  await registerWithCode(email, { password: 'phrase de passe 42' });

  for (let i = 0; i < 5; i += 1) {
    const res = await passwordLogin(email, `mauvaise phrase ${i}`);
    assert.equal(res.statusCode, 401);
  }

  const locked = await passwordLogin(email, 'phrase de passe 42');
  assert.equal(locked.statusCode, 429);
  assert.equal(cookieFrom(locked), '');

  const loginRes = createMockRes();
  await handleLogin(createMockReq('POST', { email }), loginRes);
  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', { email, code: loginRes.json().devOtp, purpose: 'login' }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  assert.ok(cookieFrom(verifyRes));
});

test('définir puis changer son mot de passe en session', async () => {
  const email = 'changement@example.com';
  const verifyRes = await registerWithCode(email);
  const cookie = cookieFrom(verifyRes);
  assert.equal(verifyRes.json().user.hasPassword, true);

  const anonymous = await setPassword({ password: 'premiere phrase 1' }, '');
  assert.equal(anonymous.statusCode, 401);

  const tooShort = await setPassword(
    { password: 'court', currentPassword: 'phrase de passe 42' },
    cookie
  );
  assert.equal(tooShort.statusCode, 400);

  const missingCurrent = await setPassword({ password: 'premiere phrase 1' }, cookie);
  assert.equal(missingCurrent.statusCode, 403);
  const wrongCurrent = await setPassword(
    { password: 'premiere phrase 1', currentPassword: 'pas la bonne 9' },
    cookie
  );
  assert.equal(wrongCurrent.statusCode, 403);

  const first = await setPassword(
    { password: 'premiere phrase 1', currentPassword: 'phrase de passe 42' },
    cookie
  );
  assert.equal(first.statusCode, 200);
  assert.equal(first.json().user.hasPassword, true);
  assert.doesNotMatch(first.body, /scrypt|passwordHash|password_hash/);

  const otherLogin = await passwordLogin(email, 'premiere phrase 1');
  assert.equal(otherLogin.statusCode, 200);
  const otherCookie = cookieFrom(otherLogin);

  const changed = await setPassword(
    { password: 'seconde phrase 2', currentPassword: 'premiere phrase 1' },
    cookie
  );
  assert.equal(changed.statusCode, 200);

  assert.equal(isSessionAlive(cookie), true);
  assert.equal(isSessionAlive(otherCookie), false);
  assert.equal((await passwordLogin(email, 'premiere phrase 1')).statusCode, 401);
  assert.equal((await passwordLogin(email, 'seconde phrase 2')).statusCode, 200);
});

test('changement de mot de passe refusé depuis une autre origine', async () => {
  const verifyRes = await registerWithCode('origine@example.com');
  const cookie = cookieFrom(verifyRes);

  const req = createMockReq(
    'POST',
    { password: 'autre phrase 99', currentPassword: 'phrase de passe 42' },
    cookie
  );
  req.headers.host = 'localhost:3000';
  req.headers.origin = 'http://localhost:5173';
  const crossOrigin = createMockRes();
  await handleSetPassword(req, crossOrigin);
  assert.equal(crossOrigin.statusCode, 403);

  const sameReq = createMockReq(
    'POST',
    { password: 'autre phrase 99', currentPassword: 'phrase de passe 42' },
    cookie
  );
  sameReq.headers.host = 'localhost:3000';
  sameReq.headers.origin = 'http://localhost:3000';
  const sameOrigin = createMockRes();
  await handleSetPassword(sameReq, sameOrigin);
  assert.equal(sameOrigin.statusCode, 200);
});

test('réinitialisation par code : nouveau mot de passe, anciennes sessions fermées', async () => {
  const email = 'reinit@example.com';
  const verifyRes = await registerWithCode(email, { password: 'ancienne phrase 1' });
  const oldCookie = cookieFrom(verifyRes);
  assert.equal(isSessionAlive(oldCookie), true);

  const loginRes = createMockRes();
  await handleLogin(createMockReq('POST', { email }), loginRes);
  const resetRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email,
      code: loginRes.json().devOtp,
      purpose: 'login',
      password: 'nouvelle phrase 2'
    }),
    resetRes
  );
  assert.equal(resetRes.statusCode, 200);

  assert.equal(isSessionAlive(oldCookie), false);
  assert.equal(isSessionAlive(cookieFrom(resetRes)), true);
  assert.equal((await passwordLogin(email, 'ancienne phrase 1')).statusCode, 401);
  assert.equal((await passwordLogin(email, 'nouvelle phrase 2')).statusCode, 200);
});

test('inscription authenticator : QR otpauth puis session', async () => {
  const { totpAt } = require('../backend/services/totp-service');

  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email: 'totp-user@example.com',
      firstName: 'Totp',
      lastName: 'User',
      method: 'authenticator'
    }),
    regRes
  );
  assert.equal(regRes.statusCode, 200);
  const regBody = regRes.json();
  assert.equal(regBody.method, 'authenticator');
  assert.ok(String(regBody.otpauthUrl || '').startsWith('otpauth://totp/'));
  assert.ok(regBody.totpSecret);
  assert.equal(regBody.devOtp, undefined);

  const badCode = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'totp-user@example.com',
      code: '000000',
      purpose: 'register',
      method: 'authenticator'
    }),
    badCode
  );
  assert.equal(badCode.statusCode, 400);

  const code = totpAt(regBody.totpSecret);
  const withoutPassword = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'totp-user@example.com',
      code,
      purpose: 'register',
      method: 'authenticator'
    }),
    withoutPassword
  );
  assert.equal(withoutPassword.statusCode, 400);

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email: 'totp-user@example.com',
      code,
      purpose: 'register',
      method: 'authenticator',
      password: 'phrase de passe 42'
    }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.json().user.hasTotp, true);
  assert.equal(verifyRes.json().user.hasPassword, true);
  const cookie = cookieFrom(verifyRes);
  assert.ok(cookie.includes(SESSION_COOKIE_NAME));

  const meRes = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meRes);
  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.json().user.hasTotp, true);
  assert.equal(meRes.json().user.totpSecret, undefined);
});

test('connexion authenticator apres enrolement', async () => {
  const { totpAt } = require('../backend/services/totp-service');
  const email = 'totp-login@example.com';

  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email,
      firstName: 'Login',
      lastName: 'Totp',
      method: 'authenticator'
    }),
    regRes
  );
  const secret = regRes.json().totpSecret;
  const enroll = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email,
      code: totpAt(secret),
      purpose: 'register',
      method: 'authenticator',
      password: 'phrase de passe 42'
    }),
    enroll
  );
  assert.equal(enroll.statusCode, 200);

  await handleLogout(createMockReq('POST', null, cookieFrom(enroll)), createMockRes());

  const loginRes = createMockRes();
  await handleLogin(createMockReq('POST', { email, method: 'authenticator' }), loginRes);
  assert.equal(loginRes.statusCode, 200);
  assert.equal(loginRes.json().method, 'authenticator');

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', {
      email,
      code: totpAt(secret),
      purpose: 'login',
      method: 'authenticator'
    }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  assert.ok(cookieFrom(verifyRes).includes(SESSION_COOKIE_NAME));
});

test('methode OTP invalide rejetee', async () => {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', {
      email: 'bad-method@example.com',
      firstName: 'Bad',
      lastName: 'Method',
      method: 'sms'
    }),
    regRes
  );
  assert.equal(regRes.statusCode, 400);
});
