'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, after, beforeEach } = require('node:test');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcard-mail-'));
process.env.DB_DIR = tmpDir;
process.env.DB_PATH = path.join(tmpDir, 'test-mail.sqlite');
process.env.NODE_ENV = 'test';
process.env.SMTP_USER = 'expediteur@example.com';
process.env.SMTP_PASS = 'abcd efgh ijkl mnop';
delete process.env.SMTP_HOST;
delete process.env.AUTH_EXPOSE_OTP;

const env = require('../backend/config/env');
const { setTransport } = require('../backend/services/mailer');
const {
  handleRegister,
  handleLogin,
  handleVerifyOtp
} = require('../backend/controllers/auth.controller');

const sent = [];
let failDelivery = false;
setTransport({
  async sendMail(message) {
    if (failDelivery) {
      throw Object.assign(new Error('refus du serveur de test'), { code: 'EAUTH' });
    }
    sent.push(message);
  }
});

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

function createMockReq(body) {
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

async function call(handler, body) {
  const res = createMockRes();
  await handler(createMockReq(body), res);
  return res;
}

// Capture les journaux pendant un appel, pour verifier ce qui y est ecrit.
async function withCapturedLogs(fn) {
  const lines = [];
  const original = { log: console.log, error: console.error };
  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));
  try {
    const result = await fn();
    await new Promise((resolve) => setImmediate(resolve));
    return { result, logs: lines.join('\n') };
  } finally {
    console.log = original.log;
    console.error = original.error;
  }
}

function codeFrom(message) {
  const match = String(message.text).match(/\b(\d{6})\b/);
  assert.ok(match, 'code absent du message');
  return match[1];
}

beforeEach(() => {
  sent.length = 0;
  failDelivery = false;
});

after(() => {
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

test('SMTP configuré : le code n’est plus exposé par défaut', () => {
  assert.equal(env.MAIL_CONFIGURED, true);
  assert.equal(env.AUTH_EXPOSE_OTP, false);
  assert.equal(env.SMTP_HOST, 'smtp.gmail.com');
  assert.equal(env.SMTP_PORT, 465);
  assert.equal(env.SMTP_PASS, 'abcdefghijklmnop');
  assert.equal(env.MAIL_FROM, 'expediteur@example.com');
});

test('inscription : code envoyé par e-mail, absent de la réponse et des journaux', async () => {
  const email = 'destinataire@gmail.com';
  const { result: regRes, logs } = await withCapturedLogs(() =>
    call(handleRegister, { email, firstName: 'Awa', lastName: 'Kone' })
  );

  assert.equal(regRes.statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, email);
  assert.equal(sent[0].from.address, 'expediteur@example.com');
  assert.doesNotMatch(sent[0].subject, /\d{6}/);

  const code = codeFrom(sent[0]);
  assert.equal(regRes.json().devOtp, undefined);
  assert.ok(!regRes.body.includes(code));
  assert.ok(!logs.includes(code));
  assert.ok(!logs.includes(email));

  const verifyRes = await call(handleVerifyOtp, {
    email,
    code,
    purpose: 'register',
    password: 'phrase de passe 42'
  });
  assert.equal(verifyRes.statusCode, 200);
  assert.equal(verifyRes.json().user.email, email);
});

test('inscription : échec d’envoi signalé sans détail technique', async () => {
  failDelivery = true;
  const email = 'echec@gmail.com';
  const { result: regRes, logs } = await withCapturedLogs(() =>
    call(handleRegister, { email, firstName: 'Awa', lastName: 'Kone' })
  );

  assert.equal(regRes.statusCode, 502);
  assert.match(regRes.json().error, /Envoi du code impossible/);
  assert.doesNotMatch(regRes.body, /EAUTH|refus du serveur/);
  assert.match(logs, /envoi e-mail impossible \(EAUTH\)/);
  assert.ok(!logs.includes(email));
  assert.doesNotMatch(logs, /\b\d{6}\b/);
});

test('connexion par code : même réponse que le compte existe ou non', async () => {
  const email = 'connu@gmail.com';
  await call(handleRegister, { email, firstName: 'Compte', lastName: 'Connu' });
  await call(handleVerifyOtp, {
    email,
    code: codeFrom(sent[0]),
    purpose: 'register',
    password: 'phrase de passe 42'
  });
  sent.length = 0;

  const known = await call(handleLogin, { email });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, email);

  const unknown = await call(handleLogin, { email: 'inconnu@gmail.com' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sent.length, 1);

  assert.equal(known.statusCode, 200);
  assert.equal(unknown.statusCode, 200);
  const knownBody = known.json();
  const unknownBody = unknown.json();
  assert.deepEqual({ ...knownBody, email: '' }, { ...unknownBody, email: '' });
  assert.equal(knownBody.devOtp, undefined);

  const verifyRes = await call(handleVerifyOtp, {
    email,
    code: codeFrom(sent[0]),
    purpose: 'login'
  });
  assert.equal(verifyRes.statusCode, 200);
});

test('connexion par code : panne d’envoi ou plafond invisibles pour l’appelant', async () => {
  const email = 'plafond@gmail.com';
  await call(handleRegister, { email, firstName: 'Compte', lastName: 'Plafond' });
  await call(handleVerifyOtp, {
    email,
    code: codeFrom(sent[0]),
    purpose: 'register',
    password: 'phrase de passe 42'
  });

  for (let i = 0; i < 4; i += 1) {
    const res = await call(handleLogin, { email });
    assert.equal(res.statusCode, 200);
  }
  await new Promise((resolve) => setImmediate(resolve));
  // 3 codes par minute et par adresse : 1 a l'inscription, puis 2 connexions.
  assert.equal(sent.length, 3);

  failDelivery = true;
  const { result: res, logs } = await withCapturedLogs(() =>
    call(handleLogin, { email: 'connu@gmail.com' })
  );
  assert.equal(res.statusCode, 200);
  assert.match(logs, /envoi e-mail impossible \(EAUTH\)/);
});
