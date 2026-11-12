import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

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
    'tabPreviewCard',
    'qrLogoUpload',
    'qrLogoUrl',
    'qrLogoPreview',
    'btnRemoveQrLogo'
  ];

  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id="${id}"`), `missing id ${id}`);
  }

  assert.match(html, /family=Syne/);
  assert.match(html, /family=DM\+Sans/);
  assert.match(html, /class="app-shell/);
  assert.match(html, /phone-shell/);
  assert.match(html, /assets\/css\/styles\.css/);
  assert.match(html, /assets\/vendor\/qrcode\.min\.js/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/qrcode@/);
  assert.match(html, /Modèles de carte virtuelle/);
  assert.match(html, /Logo au centre du QR/);
}

function testVendoredQrcodeLibrary() {
  const vendorPath = join(root, 'assets/vendor/qrcode.min.js');
  assert.ok(existsSync(vendorPath), 'missing assets/vendor/qrcode.min.js');

  const code = read('assets/vendor/qrcode.min.js');
  const ctx = { window: {} };
  ctx.self = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);

  const qr = ctx.QRCode || ctx.window.QRCode;
  assert.ok(qr, 'QRCode global missing after load');
  assert.equal(typeof qr.toCanvas, 'function');
}

function testQrViewGuardsMissingLibrary() {
  const source = read('src/ui/qr-view.js');
  assert.match(source, /Lib QR absente/);
  assert.match(source, /typeof window\.QRCode\.toCanvas !== 'function'/);
}

function testQrLogoOverlay() {
  const source = read('src/ui/qr-view.js');
  assert.match(source, /function overlayLogo/);
  assert.match(source, /function paintQrToCanvas/);
  assert.match(source, /function getLogoSrc/);
  assert.match(source, /LOGO_RATIO = 0\.18/);
  assert.match(source, /resolveErrorCorrection/);
  assert.match(source, /if \(hasLogo\) return 'H'/);
  assert.doesNotMatch(source, /javascript:/i);
  assert.match(source, /\^https\?:/);

  const constants = read('src/config/constants.js');
  const sandbox = { window: {} };
  Function('window', constants)(sandbox.window);
  const demo = sandbox.window.VCardApp.Config.DEMO_DATA;
  assert.equal(demo.qrLogoUrl, '');
  assert.equal(demo.qrLogoBase64, '');
  assert.ok(sandbox.window.VCardApp.Config.FORM_FIELDS.includes('qrLogoUrl'));

  const canvasSource = read('src/ui/card-canvas.js');
  assert.match(canvasSource, /QrView\.paintQrToCanvas/);
  assert.match(canvasSource, /QrView\.getLogoSrc/);
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

function testCardTemplatesCatalog() {
  const source = read('src/config/constants.js');
  const sandbox = { window: {} };
  Function('window', source)(sandbox.window);
  const templates = sandbox.window.VCardApp.Config.CARD_TEMPLATES;
  const required = [
    'editorial',
    'minimal',
    'corporate',
    'creative',
    'eco',
    'prestige',
    'nocturne',
    'atelier'
  ];

  for (const id of required) {
    assert.ok(templates[id], `missing card template ${id}`);
    assert.equal(templates[id].id, id);
    assert.ok(templates[id].label);
    assert.ok(Array.isArray(templates[id].swatch));
    assert.ok(templates[id].swatch.length >= 2);
  }

  assert.equal(sandbox.window.VCardApp.Config.DEMO_DATA.cardTemplate, 'editorial');

  const canvasSource = read('src/ui/card-canvas.js');
  for (const id of required) {
    assert.match(canvasSource, new RegExp(`${id}:\\s*draw`), `renderer missing for ${id}`);
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
  ['vendored qrcode library', testVendoredQrcodeLibrary],
  ['qr view guards missing library', testQrViewGuardsMissingLibrary],
  ['qr logo overlay', testQrLogoOverlay],
  ['css atmosphere', testCssAtmosphere],
  ['theme banner colors', testThemeBannerColors],
  ['card templates catalog', testCardTemplatesCatalog],
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
