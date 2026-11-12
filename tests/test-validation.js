'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  assertEmail,
  assertPhone,
  sanitizeCardPayload
} = require('../backend/services/validation');

test('assertEmail accepte un format valide et rejette le reste', () => {
  assert.equal(assertEmail('Nom@Exemple.CI'), 'nom@exemple.ci');
  assert.equal(assertEmail(''), '');
  assert.throws(() => assertEmail('pas-un-mail'), /Email invalide/);
  assert.throws(() => assertEmail('mailto:a@b.com'), /Email invalide/);
  assert.throws(() => assertEmail('a@b'), /Email invalide/);
});

test('assertPhone refuse lettres et markup', () => {
  assert.equal(assertPhone('+225 07 08 09 10 11'), '+225 07 08 09 10 11');
  assert.equal(assertPhone(''), '');
  assert.throws(() => assertPhone('abc'), /Telephone invalide/);
  assert.throws(() => assertPhone('+225 hello'), /Telephone invalide/);
  assert.throws(() => assertPhone('<script>'), /Telephone invalide/);
});

test('sanitizeCardPayload rejette telephone ou email invalides', () => {
  assert.throws(
    () =>
      sanitizeCardPayload({
        firstName: 'Koffi',
        lastName: 'Kouadio',
        phone: 'pas-un-numero'
      }),
    /Telephone invalide/
  );

  assert.throws(
    () =>
      sanitizeCardPayload({
        firstName: 'Koffi',
        lastName: 'Kouadio',
        email: 'texte-sans-arobase'
      }),
    /Email invalide/
  );

  const ok = sanitizeCardPayload({
    firstName: 'Koffi',
    lastName: 'Kouadio',
    phone: '+225 0708091011',
    email: 'Koffi@NovaTech.ci',
    theme: 'forest',
    cardTemplate: 'editorial'
  });
  assert.equal(ok.email, 'koffi@novatech.ci');
  assert.equal(ok.theme, 'forest');
  assert.equal(ok.slug, 'koffi-kouadio');
});
