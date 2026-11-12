import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function testHtmlContracts() {
  const html = read('index.html');
  const requiredIds = [
    'editorHeader',
    'editorView',
    'publicProfileView',
    'vcardForm',
    'themeColorPicker',
    'qrCanvas',
    'mockupProfileMount',
    'publicProfileMount',
    'backendStatusLabel',
    'btnThemeToggle',
    'qrModeUrl',
    'qrModeVcard',
    'cardTemplatePicker',
    'virtualCardPreviewCanvas',
    'tabPreviewCard'
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id="${id}"`), `missing id ${id}`);
  }

  assert.match(html, /family=Syne/);
  assert.match(html, /family=DM\+Sans/);
  assert.match(html, /class="app-shell/);
  assert.match(html, /phone-shell/);
  assert.match(html, /assets\/css\/styles\.css/);
  assert.match(html, /Modèles de carte virtuelle/);
}

function testCssAtmosphere() {
  const css = read('assets/css/styles.css');
  for (const token of [
    '--accent',
    'body.app-shell',
    '.phone-shell',
    '.profile-card',
    '.reveal',
    '@media (max-width: 575.98px)',
    '@media (min-width: 768px)',
    '@media (min-width: 1024px)',
    '.card-template-picker',
    '.card-template-option'
  ]) {
    assert.ok(css.includes(token), `css missing ${token}`);
  }
}

function testThemeBannerColors() {
  const source = read('src/config/constants.js');
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  Function('window', source)(sandbox.window);
  const palettes = sandbox.window.VCardApp.Config.THEME_PALETTES;
  const themes = ['obsidian', 'forest', 'cobalt', 'bronze', 'bordeaux'];

  for (const theme of themes) {
    assert.ok(palettes[theme], `missing theme ${theme}`);
    assert.match(palettes[theme].bannerColor, /^#[0-9a-fA-F]{6}$/);
  }
}

function testProfileCardMarkup() {
  const constants = read('src/config/constants.js');
  const urlCodec = read('src/services/url-codec.js');
  const profileCard = read('src/ui/profile-card.js');
  const sandbox = { window: {} };
  // eslint-disable-next-line no-new-func
  Function('window', `${constants}\n${urlCodec}\n${profileCard}`)(sandbox.window);

  const html = sandbox.window.VCardApp.ProfileCardUI.buildCardHtml({
    firstName: 'Koffi',
    lastName: 'Kouadio',
    jobTitle: 'Directeur Technique',
    organization: 'NovaTech Africa',
    phone: '+225 07 08 09 10 11',
    email: 'koffi@novatech.ci',
    location: 'Abidjan',
    bio: 'Architecture distribuée',
    theme: 'forest',
    linkedinUrl: 'https://linkedin.com/in/koffi',
    portfolioUrl: 'https://novatech-africa.com'
  });

  assert.match(html, /profile-card/);
  assert.match(html, /profile-card__banner/);
  assert.match(html, /background:#064e3b/);
  assert.match(html, /Koffi Kouadio/);
  assert.match(html, /data-action="save-vcard"/);
  assert.doesNotMatch(html, /<script/i);
}

const tests = [
  ['html contracts', testHtmlContracts],
  ['css atmosphere', testCssAtmosphere],
  ['theme banner colors', testThemeBannerColors],
  ['profile card markup', testProfileCardMarkup]
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(err);
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} failed`);
} else {
  console.log(`\n${tests.length} passed`);
}
