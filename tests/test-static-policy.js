'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isPublicStaticPath } = require('../backend/http/static-policy');

test('le serveur applique la liste avant de lire le disque', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'backend', 'server.js'), 'utf8');
  const guard = server.indexOf('if (!isPublicStaticPath(safePath))');
  assert.ok(guard > 0, 'controle absent de serveStaticFile');
  assert.ok(guard < server.indexOf('fs.stat(fullPath'), 'controle place apres la lecture');
});

test('fichiers publics : pages, assets et scripts front', () => {
  for (const allowed of [
    'index.html',
    'auth.html',
    'assets/css/styles.css',
    'assets/vendor/qrcode.min.js',
    'src/main.js',
    'src/ui/auth-page.js',
    path.normalize('src/services/api.js')
  ]) {
    assert.equal(isPublicStaticPath(allowed), true, allowed);
  }
});

test('fichiers internes jamais servis', () => {
  for (const denied of [
    '',
    '.env',
    '.env.local',
    '.gitignore',
    '.git/config',
    'package.json',
    'package-lock.json',
    'README.md',
    'backend/data/cards.sqlite',
    'backend/config/env.js',
    path.normalize('backend/data/cards.sqlite'),
    'node_modules/nodemailer/package.json',
    'tests/test-auth.js',
    'docs/prd.md',
    'scripts/auto-push.ps1',
    'admin/src/App.jsx',
    'src/.env',
    'assets/.secret/cle.txt',
    'src/main.js::$DATA',
    '../index.html',
    'src/../.env'
  ]) {
    assert.equal(isPublicStaticPath(denied), false, denied);
  }
});
