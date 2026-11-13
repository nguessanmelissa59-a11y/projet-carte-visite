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

  assert.match(html, /family=Fraunces/);
  assert.match(html, /family=Figtree/);
  assert.match(html, /class="app-shell/);
  assert.match(html, /phone-shell/);
  assert.match(html, /assets\/css\/styles\.css/);
  assert.match(html, /assets\/vendor\/qrcode\.min\.js/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net\/npm\/qrcode@/);
  assert.match(html, /Choisir un modèle/);
  assert.match(html, /Logo au centre/);
  assert.match(html, /Aperçu PDF 85×55 mm/);
  assert.match(html, /virtualCardVersoCanvas/);
  assert.match(html, /printPreviewDialog/);
  assert.match(html, /btnConfirmPrintDownload/);
  assert.match(html, /src\/services\/field-validation\.js/);
  assert.match(html, /id="phone"/);
  assert.match(html, /type="tel"/);
  assert.match(html, /id="email"/);
  assert.match(html, /type="email"/);
  assert.match(html, /inputmode="tel"/);
  assert.match(html, /inputmode="email"/);
  assert.ok(html.includes('pattern="^\\+?[0-9\\s().\\-]{6,}$"'));
  assert.match(html, /id="jobTitle"/);
  assert.match(html, /id="organization"/);
  assert.match(html, /Rechercher ou créer un poste/);
  assert.match(html, /Rechercher ou créer une entreprise/);
  assert.match(html, /src\/ui\/lookup-combobox\.js/);
}

function testLookupComboboxUi() {
  const html = read('index.html');
  const css = read('assets/css/styles.css');
  const combo = read('src/ui/lookup-combobox.js');
  const main = read('src/main.js');
  const api = read('src/services/api.js');

  assert.match(combo, /LookupCombobox/);
  assert.match(combo, /labelCreate/);
  assert.match(combo, /Créer/);
  assert.match(combo, /aria-autocomplete/);
  assert.match(main, /LookupCombobox\.mount/);
  assert.match(main, /kind: 'job-titles'/);
  assert.match(main, /kind: 'organizations'/);
  assert.match(api, /searchLookup/);
  assert.match(api, /createLookup/);
  assert.match(api, /\/api\/lookups\/job-titles/);
  assert.match(api, /\/api\/lookups\/organizations/);
  assert.match(css, /\.lookup-combo/);
  assert.match(css, /\.lookup-combo__list/);
  assert.match(css, /\.lookup-combo__create/);
  assert.match(css, /\.field-hint/);
  assert.match(html, /jobTitleHint/);
  assert.match(html, /organizationHint/);
}

function testFieldValidationClient() {
  const source = read('src/services/field-validation.js');
  const sandbox = { window: {} };
  Function('window', source)(sandbox.window);
  const fv = sandbox.window.VCardApp.FieldValidation;

  assert.equal(fv.sanitizePhoneInput('12ab34'), '1234');

  const loaded = fv.sanitizePhoneFields({
    phone: 'appel +225 07 08',
    whatsapp: 'texte libre',
    email: 'a@b.com'
  });
  assert.equal(loaded.phone, '+225 07 08');
  assert.equal(loaded.whatsapp, '');
  assert.equal(loaded.email, 'a@b.com');
  assert.equal(fv.sanitizePhoneFields({}).phone, '');
  assert.match(
    read('src/main.js'),
    /function populateForm\(\) \{\s*if \(FieldValidation\) FieldValidation\.sanitizePhoneFields\(state\);/
  );

  assert.equal(fv.isPhoneValid('+225 07 08 09'), true);
  assert.equal(fv.isPhoneValid('hello'), false);
  assert.equal(fv.isEmailValid('a@b.com'), true);
  assert.equal(fv.isEmailValid('pas-un-mail'), false);
  assert.equal(fv.normalizeEmail('mailto:Nom@Ex.CI'), 'nom@ex.ci');
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
    '--surface: #f6f0e2',
    '--accent: #0a6b45',
    '--info-warm',
    '.beta-chip',
    '.btn-ink',
    'body.app-shell',
    '.phone-shell',
    '.profile-card',
    '.profile-card__banner::before',
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
  const themes = [
    'obsidian',
    'forest',
    'cobalt',
    'bronze',
    'bordeaux',
    'teal',
    'gold',
    'navy',
    'plum',
    'indigo'
  ];

  for (const theme of themes) {
    assert.ok(palettes[theme], `missing theme ${theme}`);
    assert.match(palettes[theme].bannerColor, /^#[0-9a-fA-F]{6}$/);
  }

  assert.equal(palettes.forest.bannerColor, '#0a6b45');
  assert.equal(sandbox.window.VCardApp.Config.DEMO_DATA.theme, 'forest');
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
    'atelier',
    'lagoon',
    'slate',
    'sunset',
    'sumi',
    'arctic',
    'metro'
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
  assert.match(html, /background:#0a6b45/);
  assert.match(html, /Koffi Kouadio/);
  assert.match(html, /data-action="save-vcard"/);
  assert.match(html, /data-action="download-card-image"/);
  assert.match(html, /Aperçu PDF 85×55 mm/);
  assert.doesNotMatch(html, /<script/i);
}

function testPrintableCardExport() {
  const html = read('index.html');
  assert.match(html, /Aperçu PDF 85×55 mm/);
  assert.match(html, /virtualCardVersoCanvas/);
  assert.match(html, /printPreviewDialog/);
  assert.match(html, /printPreviewRectoCanvas/);
  assert.match(html, /printPreviewVersoCanvas/);
  assert.match(html, /btnConfirmPrintDownload/);
  assert.match(html, /Fond perdu 3/);
  assert.match(html, /marges 4/);

  const source = read('src/ui/card-canvas.js');
  assert.match(source, /PRINT_CARD_WIDTH_MM = 85/);
  assert.match(source, /PRINT_CARD_HEIGHT_MM = 55/);
  assert.match(source, /PRINT_DPI = 300/);
  assert.match(source, /PRINT_PAGE_WIDTH_MM = 210/);
  assert.match(source, /PRINT_PAGE_HEIGHT_MM = 297/);
  assert.match(source, /function buildPrintablePdfBytes/);
  assert.match(source, /function generateVersoCanvas/);
  assert.match(source, /function renderVersoToCanvas/);
  assert.match(source, /async function drawVerso/);
  assert.match(source, /Scannez pour enregistrer le contact/);
  assert.match(source, /application\/pdf/);
  assert.match(source, /recto-verso_85x55mm\.pdf/);
  assert.match(source, /getPrintSpecs/);

  const main = read('src/main.js');
  assert.match(main, /openPrintPreview/);
  assert.match(main, /confirmDownloadCardPdf/);
  assert.match(main, /printPreviewReady/);
  assert.match(main, /renderVersoToCanvas/);

  const css = read('assets/css/styles.css');
  assert.match(css, /\.print-faces/);
  assert.match(css, /\.print-preview-dialog/);
}

function testPrintPreviewRequiresVisualization() {
  const css = read('assets/css/styles.css');
  assert.match(css, /\.print-faces/);
  assert.match(css, /\.print-preview-dialog/);
  assert.match(css, /@media \(min-width: 640px\)/);

  const main = read('src/main.js');
  assert.match(main, /function openPrintPreview/);
  assert.match(main, /function confirmDownloadCardPdf/);
  assert.match(main, /Vérifiez d’abord le recto et le verso/);
}

function testToastCentered() {
  const indexHtml = read('index.html');
  const authHtml = read('auth.html');
  const profileCard = read('src/ui/profile-card.js');

  for (const html of [indexHtml, authHtml]) {
    assert.match(html, /id="toastContainer"/);
    assert.match(html, /fixed inset-0/);
    assert.match(html, /items-center justify-center/);
    assert.doesNotMatch(html, /toastContainer"[^>]*bottom-5/);
  }

  assert.match(profileCard, /function showToast/);
  assert.match(profileCard, /max-w-\[min\(22rem,100%\)\]/);
  assert.match(profileCard, /text-center/);
}

function testEditorPreviewLayout() {
  const indexHtml = read('index.html');
  const authHtml = read('auth.html');
  const css = read('assets/css/styles.css');

  for (const html of [indexHtml, authHtml]) {
    assert.doesNotMatch(html, /scroll-smooth/);
  }
  assert.doesNotMatch(css, /scroll-behavior:\s*smooth/);

  const aside = indexHtml.match(/<aside class="([^"]*)"/);
  assert.ok(aside, 'aside apercu introuvable');
  assert.doesNotMatch(aside[1], /sticky/);

  assert.match(indexHtml, /studio-grid[^"]*lg:items-stretch/);
  assert.match(css, /\.preview-panel \.phone-shell:not\(\.hidden\)/);
  assert.doesNotMatch(css, /\.studio-grid > aside \{[^}]*overflow-y:\s*auto/);
}

function testOfflineModeNotice() {
  const html = read('index.html');
  const css = read('assets/css/styles.css');
  const qrView = read('src/ui/qr-view.js');
  const main = read('src/main.js');

  const notice = html.match(/<div id="offlineModeNotice"[^>]*>/);
  assert.ok(notice, 'encart mode hors-ligne introuvable');
  assert.match(notice[0], /\shidden/, 'encart masque par defaut');
  assert.match(html, /offline-notice__title">Mode vCard 3\.0 Direct \(Hors-ligne\)</);
  assert.match(html, /id="offlineModeTeaser"/);
  assert.match(html, /id="btnSwitchToVcard"/);
  assert.match(html, /qr-mode-spotlight/);
  assert.match(html, /mode-toggle--featured/);
  assert.match(html, /Hors-ligne/);
  assert.match(html, /qr-mode-spotlight[\s\S]*?id="qrModeUrl"/);
  assert.doesNotMatch(
    html,
    /Personnaliser le QR[\s\S]*?id="qrModeUrl"/,
    'le choix de mode ne doit plus être enterré dans Personnaliser'
  );

  assert.match(css, /\.offline-notice\[hidden\]/);
  assert.match(css, /\.qr-mode-spotlight/);
  assert.match(css, /\.offline-teaser/);
  assert.match(css, /\.offline-notice__points/);
  assert.match(qrView, /offlineNotice\.hidden = !isOfflineMode/);
  assert.match(qrView, /offlineTeaser\.hidden = isOfflineMode/);
  assert.match(main, /setQrMode\('vcard'\)/);
  assert.doesNotMatch(qrView, /urlDisplay\.textContent = [^;]*Mode vCard/);
}

const tests = [
  ['html contracts', testHtmlContracts],
  ['offline mode notice', testOfflineModeNotice],
  ['field validation client', testFieldValidationClient],
  ['lookup combobox ui', testLookupComboboxUi],
  ['editor preview layout', testEditorPreviewLayout],
  ['vendored qrcode library', testVendoredQrcodeLibrary],
  ['qr view guards missing library', testQrViewGuardsMissingLibrary],
  ['qr logo overlay', testQrLogoOverlay],
  ['css atmosphere', testCssAtmosphere],
  ['theme banner colors', testThemeBannerColors],
  ['card templates catalog', testCardTemplatesCatalog],
  ['profile card markup', testProfileCardMarkup],
  ['printable card export', testPrintableCardExport],
  ['print preview requires visualization', testPrintPreviewRequiresVisualization],
  ['toast centered', testToastCentered]
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
