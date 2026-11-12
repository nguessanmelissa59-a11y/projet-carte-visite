const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after } = require('node:test');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcard-admin-'));
process.env.DB_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, 'test-admin.sqlite');
process.env.AUTH_EXPOSE_OTP = '1';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAILS = 'admin@example.com';
process.env.OTP_MAX_PER_WINDOW = '50';
process.env.OTP_RESEND_WINDOW_MS = '1000';

const {
  handleRegister,
  handleLogin,
  handleVerifyOtp,
  handleMe
} = require('../backend/controllers/auth.controller');
const {
  handleSaveCard,
  handleListCards
} = require('../backend/controllers/card.controller');
const {
  handleAdminStats,
  handleAdminListCards,
  handleAdminDeleteCard,
  handleAdminListUsers,
  handleAdminUpdateUserRole
} = require('../backend/controllers/admin.controller');
const { SESSION_COOKIE_NAME } = require('../backend/config/env');

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

function createMockReq(method, body, cookie = '', url = '/') {
  const payload = body == null ? '' : JSON.stringify(body);
  return {
    method,
    url,
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

async function registerOnce(email, firstName, lastName) {
  const regRes = createMockRes();
  await handleRegister(
    createMockReq('POST', { email, firstName, lastName }),
    regRes
  );
  if (regRes.statusCode === 409) {
    return loginSession(email);
  }
  assert.equal(regRes.statusCode, 200);
  const otp = regRes.json().devOtp;
  assert.ok(otp);

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', { email, code: otp, purpose: 'register' }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  return {
    cookie: cookieFrom(verifyRes),
    user: verifyRes.json().user
  };
}

async function loginSession(email) {
  const loginRes = createMockRes();
  await handleLogin(createMockReq('POST', { email }), loginRes);
  assert.equal(loginRes.statusCode, 200);
  const otp = loginRes.json().devOtp;
  assert.ok(otp);

  const verifyRes = createMockRes();
  await handleVerifyOtp(
    createMockReq('POST', { email, code: otp, purpose: 'login' }),
    verifyRes
  );
  assert.equal(verifyRes.statusCode, 200);
  return {
    cookie: cookieFrom(verifyRes),
    user: verifyRes.json().user
  };
}

after(async () => {
  try {
    const { db } = require('../backend/db/connection');
    if (db && typeof db.close === 'function') db.close();
  } catch {
    // ignore
  }
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

test('admin bootstrap via ADMIN_EMAILS expose role admin', async () => {
  const { cookie, user } = await registerOnce(
    'admin@example.com',
    'Admin',
    'Root'
  );
  assert.equal(user.role, 'admin');

  const meRes = createMockRes();
  handleMe(createMockReq('GET', null, cookie), meRes);
  assert.equal(meRes.statusCode, 200);
  assert.equal(meRes.json().user.role, 'admin');
});

test('non-admin reçoit 403 sur /api/admin/*', async () => {
  const { cookie, user } = await registerOnce('user@example.com', 'User', 'One');
  assert.equal(user.role, 'user');

  const statsRes = createMockRes();
  handleAdminStats(createMockReq('GET', null, cookie), statsRes);
  assert.equal(statsRes.statusCode, 403);

  const cardsRes = createMockRes();
  handleAdminListCards(
    createMockReq('GET', null, cookie, '/api/admin/cards'),
    cardsRes
  );
  assert.equal(cardsRes.statusCode, 403);

  const usersRes = createMockRes();
  handleAdminListUsers(createMockReq('GET', null, cookie), usersRes);
  assert.equal(usersRes.statusCode, 403);
});

test('admin peut lire stats, cartes, users', async () => {
  const admin = await registerOnce('admin@example.com', 'Admin', 'Root');

  const saveRes = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      {
        slug: 'admin-card',
        firstName: 'Admin',
        lastName: 'Card',
        email: 'admin@example.com',
        theme: 'obsidian'
      },
      admin.cookie
    ),
    saveRes
  );
  assert.equal(saveRes.statusCode, 200);

  const statsRes = createMockRes();
  handleAdminStats(createMockReq('GET', null, admin.cookie), statsRes);
  assert.equal(statsRes.statusCode, 200);
  assert.ok(statsRes.json().stats.cardsTotal >= 1);
  assert.ok(statsRes.json().stats.usersTotal >= 1);

  const cardsRes = createMockRes();
  handleAdminListCards(
    createMockReq('GET', null, admin.cookie, '/api/admin/cards?limit=50'),
    cardsRes
  );
  assert.equal(cardsRes.statusCode, 200);
  assert.ok(Array.isArray(cardsRes.json().cards));
  assert.ok(cardsRes.json().cards.some((c) => c.slug === 'admin-card'));

  const usersRes = createMockRes();
  handleAdminListUsers(createMockReq('GET', null, admin.cookie), usersRes);
  assert.equal(usersRes.statusCode, 200);
  assert.ok(usersRes.json().users.some((u) => u.email === 'admin@example.com'));
});

test('PATCH rôle + refus de rétrograder le dernier admin', async () => {
  const admin = await registerOnce('admin@example.com', 'Admin', 'Root');
  const member = await registerOnce('member@example.com', 'Member', 'Two');

  const promoteRes = createMockRes();
  await handleAdminUpdateUserRole(
    createMockReq('PATCH', { role: 'admin' }, admin.cookie),
    promoteRes,
    member.user.id
  );
  assert.equal(promoteRes.statusCode, 200);
  assert.equal(promoteRes.json().user.role, 'admin');

  const demoteOther = createMockRes();
  await handleAdminUpdateUserRole(
    createMockReq('PATCH', { role: 'user' }, admin.cookie),
    demoteOther,
    member.user.id
  );
  assert.equal(demoteOther.statusCode, 200);
  assert.equal(demoteOther.json().user.role, 'user');

  // Ensure only one admin remains, then refuse demotion.
  const usersRes = createMockRes();
  handleAdminListUsers(createMockReq('GET', null, admin.cookie), usersRes);
  const admins = usersRes.json().users.filter((u) => u.role === 'admin');
  assert.ok(admins.length >= 1);

  if (admins.length === 1) {
    const demoteLast = createMockRes();
    await handleAdminUpdateUserRole(
      createMockReq('PATCH', { role: 'user' }, admin.cookie),
      demoteLast,
      admins[0].id
    );
    assert.equal(demoteLast.statusCode, 400);
    assert.match(demoteLast.json().error, /dernier administrateur/i);
  } else {
    // Demote extras until one remains, then refuse.
    for (const extra of admins.slice(1)) {
      const demote = createMockRes();
      await handleAdminUpdateUserRole(
        createMockReq('PATCH', { role: 'user' }, admin.cookie),
        demote,
        extra.id
      );
      assert.equal(demote.statusCode, 200);
    }
    const lastAdmin = admins[0];
    const demoteLast = createMockRes();
    await handleAdminUpdateUserRole(
      createMockReq('PATCH', { role: 'user' }, admin.cookie),
      demoteLast,
      lastAdmin.id
    );
    assert.equal(demoteLast.statusCode, 400);
    assert.match(demoteLast.json().error, /dernier administrateur/i);
  }
});

test('GET /api/cards ne renvoie que les cartes du user', async () => {
  const owner = await registerOnce('owner-list@example.com', 'Owner', 'List');
  const other = await registerOnce('other-list@example.com', 'Other', 'List');

  const saveOwner = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      {
        slug: 'owner-only-card',
        firstName: 'Owner',
        lastName: 'List',
        theme: 'obsidian'
      },
      owner.cookie
    ),
    saveOwner
  );
  assert.equal(saveOwner.statusCode, 200);

  const listOther = createMockRes();
  handleListCards(createMockReq('GET', null, other.cookie), listOther);
  assert.equal(listOther.statusCode, 200);
  assert.equal(
    listOther.json().cards.some((c) => c.slug === 'owner-only-card'),
    false
  );

  const listOwner = createMockRes();
  handleListCards(createMockReq('GET', null, owner.cookie), listOwner);
  assert.equal(listOwner.statusCode, 200);
  assert.equal(
    listOwner.json().cards.some((c) => c.slug === 'owner-only-card'),
    true
  );
});

test('admin peut supprimer une carte', async () => {
  const admin = await registerOnce('admin@example.com', 'Admin', 'Root');
  const saveRes = createMockRes();
  await handleSaveCard(
    createMockReq(
      'POST',
      {
        slug: 'to-delete',
        firstName: 'Delete',
        lastName: 'Me',
        theme: 'obsidian'
      },
      admin.cookie
    ),
    saveRes
  );
  assert.equal(saveRes.statusCode, 200);

  const delRes = createMockRes();
  handleAdminDeleteCard(
    createMockReq('DELETE', null, admin.cookie),
    delRes,
    'to-delete'
  );
  assert.equal(delRes.statusCode, 200);
  assert.equal(delRes.json().ok, true);
});
