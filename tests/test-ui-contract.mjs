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
    'btnRemoveQrLogo',
    'btnLogoutEditor'
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

  assert.equal(fv.sanitizePhoneInput('12ab34'), '12 34');
  assert.equal(fv.sanitizePhoneInput('+2250708154537'), '+225 07 08 15 45 37');
  assert.equal(fv.sanitizePhoneInput('2250708091011'), '+225 07 08 09 10 11');
  assert.equal(fv.sanitizePhoneInput('0708091011'), '07 08 09 10 11');
  assert.equal(fv.formatPhoneDisplay('+225 07'), '+225 07');

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
  assert.match(read('src/main.js'), /applyPhoneMask\(target\)/);
  assert.match(source, /function formatPhoneDisplay/);
  assert.match(source, /function applyPhoneMask/);

  assert.equal(fv.isPhoneValid('+225 07 08 09'), true);
  assert.equal(fv.isPhoneValid('+225 07 08 15 45 37'), true);
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
  const overlayBody = source.slice(
    source.indexOf('async function overlayLogo'),
    source.indexOf('function resolveErrorCorrection')
  );
  assert.ok(overlayBody.length > 0, 'overlayLogo body not found');
  assert.doesNotMatch(overlayBody, /strokeStyle|\.stroke\(/, 'logo overlay must not draw an outline');
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
    '--brand: #ff6b21',
    '--surface: #f7f7f5',
    '--accent: #0a6b45',
    '--info-warm',
    '.beta-chip',
    '.btn-ink',
    '.hero-mark',
    '.theme-mode',
    '.easy-banner--auth',
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
  assert.doesNotMatch(css, /html\.dark[^{]*\{[^}]*--accent:\s*#2ecf88/);
  assert.doesNotMatch(css, /html\.dark\[data-card-theme='forest'\][^{]*\{[^}]*--accent:\s*#2ecf88/);
  assert.match(css, /html\.dark\[data-card-theme='forest'\][^{]*\{[^}]*--accent:\s*#0a6b45/);
}

function testBrandCharterAndHero() {
  const html = read('index.html');
  const css = read('assets/css/styles.css');
  const storage = read('src/services/storage.js');

  assert.match(html, /Votre carte, <mark class="hero-mark">prête à partager\.<\/mark>/);
  assert.match(html, /easy-banner--auth/);
  assert.match(html, /Connectez-vous pour garder et modifier votre carte plus tard\./);
  assert.match(html, /data-theme-mode="auto"/);
  assert.match(html, /data-theme-mode="light"/);
  assert.match(html, /data-theme-mode="dark"/);
  assert.match(html, /theme-color" content="#ff6b21"/);
  assert.match(css, /\.btn-primary[^{]*\{[^}]*var\(--brand\)/);
  assert.match(css, /\.brand-mark[^{]*\{[^}]*var\(--brand\)/);
  assert.match(storage, /function setThemeMode/);
  assert.match(storage, /bindThemeModeControls/);
}

function testEditorialFlowProgress() {
  const html = read('index.html');
  const css = read('assets/css/styles.css');
  const main = read('src/main.js');
  const flow = read('src/ui/flow-progress.js');

  assert.match(html, /id="flowSteps"/);
  assert.match(html, /id="flowHint"/);
  assert.match(html, /id="shareLockNotice"/);
  assert.match(html, /preview-live/);
  assert.match(html, /src\/ui\/flow-progress\.js/);
  assert.match(html, /data-step="infos"/);
  assert.match(html, /data-step="save"/);
  assert.match(html, /data-step="share"/);
  assert.match(css, /\.easy-steps__copy/);
  assert.match(css, /\.preview-live/);
  assert.match(css, /position:\s*sticky/);
  assert.match(flow, /FlowProgress/);
  assert.match(flow, /function render/);
  assert.match(main, /FlowProgress\.bind/);
  assert.match(main, /updateFlowProgress/);
  assert.match(main, /markCardSaved/);
}

function testForestGreenTintUnified() {
  const css = read('assets/css/styles.css');
  const constants = read('src/config/constants.js');
  const indexHtml = read('index.html');
  const authHtml = read('auth.html');

  assert.match(constants, /bannerColor: '#0a6b45'/);
  assert.match(constants, /btnBg: 'bg-\[#0a6b45\]/);
  assert.doesNotMatch(constants, /dark:text-emerald-/);
  assert.doesNotMatch(constants, /dark:bg-emerald-/);
  assert.doesNotMatch(indexHtml, /#2ecf88/);
  assert.doesNotMatch(authHtml, /#2ecf88/);
  assert.match(css, /html\.dark \{[\s\S]*?--accent: #0a6b45;/);
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

  // Compositions distinctes (pas seulement des swaps de couleur)
  for (const helper of [
    'drawCornerMarks',
    'drawIdentityBlock',
    'drawContactColumns',
    'drawHairline',
    'drawMicroLabel'
  ]) {
    assert.match(canvasSource, new RegExp(`function ${helper}\\(`));
  }
  assert.match(canvasSource, /Hanko|hanko|sceau|TIMBRE QR|STATION QR|Constellation|blueprint/i);
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
  assert.match(source, /function getVersoPalette/);
  assert.match(source, /function getBrandTitle/);
  assert.match(source, /face branding/);
  assert.doesNotMatch(source, /Verso identique au recto/);
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

function loadCardCanvasExporter() {
  const ctx = {
    window: { VCardApp: { Config: { THEME_PALETTES: {}, CARD_TEMPLATES: {} } } },
    TextEncoder
  };
  vm.createContext(ctx);
  vm.runInContext(read('src/ui/card-canvas.js'), ctx);
  return ctx.window.VCardApp.CardCanvasExporter;
}

function buildTestPdf(exporter, layout) {
  const jpegBytes = Uint8Array.of(0xff, 0xd8, 0xff, 0xd9);
  const pages = ['Recto', 'Verso'].map((label) => ({ jpegBytes, pixelW: 1004, pixelH: 650, label }));
  return Buffer.from(exporter.buildPrintablePdfBytes(pages, layout)).toString('latin1');
}

function readCardPlacements(pdf) {
  const placements = [];
  const pattern = /^([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm$/gm;
  for (const m of pdf.matchAll(pattern)) {
    placements.push({ w: Number(m[1]), h: Number(m[2]), x: Number(m[3]), y: Number(m[4]) });
  }
  return placements;
}

function assertPdfXrefValid(pdf) {
  const startxref = Number(pdf.match(/startxref\n(\d+)\n%%EOF$/)[1]);
  const table = pdf.slice(startxref).split('\n');
  assert.equal(table[0], 'xref');
  const count = Number(table[1].split(' ')[1]);
  for (let id = 1; id < count; id += 1) {
    const offset = Number(table[2 + id].slice(0, 10));
    assert.ok(pdf.startsWith(`${id} 0 obj\n`, offset), `xref offset invalide pour l'objet ${id}`);
  }
}

function testPrintSheetLayout() {
  const html = read('index.html');
  assert.match(html, /id="printLayoutPicker"/);
  assert.match(html, /name="printLayout" value="single" checked/);
  assert.match(html, /name="printLayout" value="sheet"/);
  assert.match(html, /Planche de 5 cartes/);
  assert.match(html, /recto et verso côte à côte|recto \| verso/);

  const main = read('src/main.js');
  assert.match(main, /function getSelectedPrintLayout/);
  assert.match(main, /\{ layout \}/);

  const css = read('assets/css/styles.css');
  assert.match(css, /\.print-layout__options/);
  assert.match(css, /\.print-layout__option:has\(input:checked\)/);

  const source = read('src/ui/card-canvas.js');
  assert.match(source, /\/Im0 Do/);
  assert.match(source, /\/Im1 Do/);
  assert.match(source, /cote a cote/);

  const exporter = loadCardCanvasExporter();
  const pageW = (210 * 72) / 25.4;
  const pageH = (297 * 72) / 25.4;
  const cardW = (85 * 72) / 25.4;
  const cardH = (55 * 72) / 25.4;

  const sheet = exporter.resolvePrintLayout('sheet');
  assert.equal(sheet.cols, 2);
  assert.equal(sheet.rows, 5);
  assert.equal(exporter.resolvePrintLayout('inconnu').id, 'single');
  assert.equal(exporter.resolvePrintLayout('__proto__').id, 'single');
  assert.equal(exporter.resolvePrintLayout(undefined).id, 'single');

  const singlePdf = buildTestPdf(exporter);
  assert.match(singlePdf, /\/Count 1 /);
  assert.equal(singlePdf.match(/\/Im0 Do/g).length, 1);
  assert.equal(singlePdf.match(/\/Im1 Do/g).length, 1);
  assert.equal(singlePdf.match(/ l S$/gm).length, 10);
  assertPdfXrefValid(singlePdf);

  const singlePlacements = readCardPlacements(singlePdf);
  assert.equal(singlePlacements.length, 2);
  assert.ok(Math.abs(singlePlacements[1].x - (singlePlacements[0].x + cardW)) < 0.01);
  assert.ok(Math.abs(singlePlacements[1].y - singlePlacements[0].y) < 0.01);

  const sheetPdf = buildTestPdf(exporter, sheet);
  assert.match(sheetPdf, /\/Count 1 /);
  assert.equal(sheetPdf.match(/\/Im0 Do/g).length, 5);
  assert.equal(sheetPdf.match(/\/Im1 Do/g).length, 5);
  assert.equal(sheetPdf.match(/ l S$/gm).length, 18);
  assertPdfXrefValid(sheetPdf);

  const placements = readCardPlacements(sheetPdf);
  assert.equal(placements.length, 10);
  const recto = [];
  const verso = [];
  for (let i = 0; i < placements.length; i += 2) {
    recto.push(placements[i]);
    verso.push(placements[i + 1]);
  }
  assert.equal(recto.length, 5);
  assert.equal(verso.length, 5);
  assert.equal(new Set(recto.map((p) => `${p.x}:${p.y}`)).size, 5);

  for (let i = 0; i < recto.length; i += 1) {
    assert.ok(Math.abs(verso[i].x - (recto[i].x + cardW)) < 0.01, 'verso non a droite du recto');
    assert.ok(Math.abs(verso[i].y - recto[i].y) < 0.01, 'verso non aligne au recto');
  }

  const left = Math.min(...recto.map((p) => p.x));
  const right = Math.max(...verso.map((p) => p.x + p.w));
  const bottom = Math.min(...recto.map((p) => p.y));
  const top = Math.max(...recto.map((p) => p.y + p.h));
  assert.ok(left > 0 && bottom > 0 && right < pageW && top < pageH, 'planche hors de la page A4');
  assert.ok(Math.abs(left - (pageW - right)) < 0.05, 'planche non centree horizontalement');
  assert.ok(Math.abs(bottom - (pageH - top)) < 0.05, 'planche non centree verticalement');
  for (const p of [...recto, ...verso]) {
    assert.ok(Math.abs(p.w - cardW) < 0.01);
    assert.ok(Math.abs(p.h - cardH) < 0.01);
  }
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
  const css = read('assets/css/styles.css');

  for (const html of [indexHtml, authHtml]) {
    assert.match(html, /id="toastContainer"/);
    assert.match(html, /fixed inset-0/);
    assert.match(html, /items-center justify-center/);
    assert.doesNotMatch(html, /toastContainer"[^>]*bottom-5/);
  }

  // body.app-shell > * { position: relative } ne doit pas écraser le toast
  assert.match(css, /:not\(#toastContainer\):not\(\.print-preview-dialog\)/);
  assert.match(css, /#toastContainer\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /#toastContainer\s*\{[^}]*justify-content:\s*center/s);

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
  assert.match(html, /Changer de mode/);
  assert.match(html, /Touchez une option/);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /qr-mode-spotlight[\s\S]*?id="qrModeUrl"/);
  assert.doesNotMatch(
    html,
    /Personnaliser le QR[\s\S]*?id="qrModeUrl"/,
    'le choix de mode ne doit plus être enterré dans Personnaliser'
  );

  assert.match(css, /\.offline-notice\[hidden\]/);
  assert.match(css, /\.qr-mode-spotlight/);
  assert.match(css, /\.qr-mode-switch/);
  assert.match(
    css,
    /\.mode-toggle button\.is-active\s*\{[^}]*background:\s*var\(--accent\)/s,
    'option selectionnee (tous mode-toggle) doit etre marquee en accent'
  );
  assert.match(html, /id="tabPreviewMobile"[^>]*aria-checked="true"/);
  assert.match(html, /id="tabPreviewCard"[^>]*aria-checked="false"/);
  assert.match(css, /\.offline-teaser/);
  assert.match(css, /\.offline-notice__points/);
  assert.match(qrView, /offlineNotice\.hidden = !isOfflineMode/);
  assert.match(qrView, /offlineTeaser\.hidden = isOfflineMode/);
  assert.match(main, /setQrMode\('vcard'\)/);
  assert.match(main, /aria-checked/);
  assert.doesNotMatch(qrView, /urlDisplay\.textContent = [^;]*Mode vCard/);
}

function testSharePublicButton() {
  const html = read('index.html');
  const main = read('src/main.js');

  assert.match(html, /id="btnSharePublic"/);
  assert.match(html, /id="btnSharePublic"[\s\S]{0,220}?Partager/);
  assert.match(html, /data-lucide="share-2"/);

  assert.match(main, /async function sharePublicProfile/);
  assert.match(main, /async function copyTextToClipboard/);
  assert.match(main, /navigator\.share/);
  assert.match(main, /AbortError/);
  assert.match(main, /btnSharePublic/);
  assert.match(main, /sharePublicProfile\(\)/);
  assert.match(main, /document\.execCommand\('copy'\)/);
  assert.match(main, /window\.prompt\('Copiez ce lien :'/);
}

function testSessionIdleAndLogout() {
  const html = read('index.html');
  assert.match(html, /id="btnLogoutEditor"/);
  assert.match(html, /Déconnexion/);

  const main = read('src/main.js');
  assert.match(main, /function forceLogoutAndLeave/);
  assert.match(main, /function startIdleWatchdog/);
  assert.match(main, /location\.replace\(authRedirectUrl/);
  assert.match(main, /btnLogoutEditor/);
  assert.match(
    main,
    /editSlugParam && !ApiService\.isAuthenticated\(\)/,
    'seul ?edit= exige une session, pas tout l’éditeur'
  );
  assert.doesNotMatch(
    main,
    /if \(!ApiService\.isAuthenticated\(\)\) \{\s*window\.location\.replace\(authRedirectUrl\('required'\)\);\s*return;\s*\}\s*startIdleWatchdog/,
    'l’éditeur ne doit plus rediriger tout visiteur anonyme vers /auth'
  );

  const api = read('src/services/api.js');
  assert.match(api, /getIdleTimeoutMs/);
  assert.match(api, /idleTimeoutMs/);

  const env = read('backend/config/env.js');
  assert.match(env, /SESSION_IDLE_MS/);
  assert.match(env, /30 \* 60 \* 1000/);

  const repo = read('backend/db/auth-repository.js');
  assert.match(repo, /last_active_at/);
  assert.match(repo, /stmtTouchSession/);

  const server = read('backend/server.js');
  assert.match(server, /function requireEditorSession/);
  assert.match(server, /redirectToAuth/);
  assert.match(server, /Cache-Control': 'no-store'/);
  assert.doesNotMatch(
    server,
    /!requireEditorSession\(req, res, parsedUrl\)/,
    'index.html ne doit plus être bloqué sans session'
  );

  const authHtml = read('auth.html');
  assert.match(authHtml, /id="authBackToEditor"/);
  assert.match(authHtml, /id="authBrandHome"/);
  assert.match(authHtml, /href="\/"/);

  const authPage = read('src/ui/auth-page.js');
  assert.match(authPage, /showSessionReason/);
  assert.match(authPage, /30 minutes d’inactivité/);
}

function testAuthModulesSeparated() {
  const html = read('auth.html');
  const page = read('src/ui/auth-page.js');
  const server = read('backend/server.js');
  const css = read('assets/css/styles.css');

  assert.match(html, /id="authLoginPanel"/);
  assert.match(html, /id="authRegisterPanel"/);
  assert.match(html, /id="authRegisterPanel"[^>]*class="[^"]*\bhidden\b/);
  assert.match(html, /id="linkToRegister"/);
  assert.match(html, /id="linkToLogin"/);
  assert.match(html, /Pas encore de compte \?/);
  assert.match(html, /Déjà inscrit \?/);
  assert.doesNotMatch(html, /auth-divider/);

  assert.match(page, /function resolveAuthMode/);
  assert.match(page, /function applyAuthMode/);
  assert.match(page, /mode === 'register'/);
  assert.match(page, /buildAuthHref\('register'\)/);

  assert.match(server, /pathname === '\/register'/);
  assert.match(server, /params\.set\('mode', 'register'\)/);
  assert.match(css, /\.auth-switch/);
  assert.match(css, /\.auth-switch__link/);
}

function testAuthPasswordOrCode() {
  const html = read('auth.html');
  const page = read('src/ui/auth-page.js');
  const api = read('src/services/api.js');

  for (const id of [
    'loginPassword',
    'btnLoginOtp',
    'btnLoginTotp',
    'totpEnrollBlock',
    'totpQrCanvas',
    'totpManualSecret',
    'otpPassword',
    'otpPasswordHint',
    'passwordForm',
    'currentPasswordField',
    'currentPassword',
    'newPassword',
    'passwordStatus',
    'passwordMessage'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `missing id ${id}`);
  }

  assert.match(html, /name="regOtpMethod"/);
  assert.match(html, /value="authenticator"/);
  assert.match(html, /assets\/vendor\/qrcode\.min\.js/);
  assert.match(page, /selectedRegisterMethod/);
  assert.match(page, /renderTotpQr/);
  assert.match(page, /requestLoginCode\('authenticator'\)/);
  // Si le serveur ignore method=authenticator, ne pas afficher un faux message « scannez le QR ».
  assert.match(page, /resolvedMethod !== 'authenticator' \|\| !data\.otpauthUrl/);
  assert.match(api, /if \(method\) payload\.method = method/);

  assert.match(html, /id="loginPassword"[^>]*type="password"[^>]*autocomplete="current-password"/);
  assert.match(html, /id="newPassword"[^>]*type="password"[^>]*minlength="8"[^>]*autocomplete="new-password"/);
  assert.match(html, /id="otpPassword"[\s\S]{0,160}?type="password"[\s\S]{0,160}?autocomplete="new-password"/);
  assert.match(html, /id="otpPasswordLabel"/);
  assert.match(page, /registerNeedsPassword/);
  assert.match(page, /passwordInput\.required = registerNeedsPassword/);
  assert.match(page, /pending\.purpose === 'register'/);
  assert.doesNotMatch(html, /id="(loginPassword|otpPassword|currentPassword|newPassword)"[^>]*type="text"/);

  assert.match(api, /\/api\/auth\/login\/password/);
  assert.match(api, /async function loginWithPassword/);
  assert.match(api, /async function setPassword/);

  assert.match(page, /ApiService\.loginWithPassword/);
  assert.match(page, /data\.otpIssued/);
  assert.match(page, /showCodeStep\(data\)/);
  assert.match(html, />\s*Valider\s*</);
  assert.match(
    page,
    /getElementById\('btnLoginOtp'\)\.addEventListener\('click', \(\) => requestLoginCode\('email'\)\)/
  );
  // Redirection apres connexion : chemin local uniquement.
  assert.match(page, /\/\^\\\/\(\?!\[\/\\\\\]\)\/\.test\(next\)/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/);
}

function testAuthGoogleButton() {
  const html = read('auth.html');
  const page = read('src/ui/auth-page.js');
  const api = read('src/services/api.js');

  // Masque par defaut : affiche seulement si le serveur annonce Google disponible.
  assert.match(html, /id="googleAuthBlock" class="hidden"/);
  assert.match(
    html,
    /<a id="btnGoogleAuth" class="[^"]*\bmin-h-11\b[^"]*\bw-full\b[^"]*" href="\/api\/auth\/google\/start">/
  );
  assert.match(html, /Continuer avec Google/);
  assert.ok(
    html.indexOf('id="googleAuthBlock"') < html.indexOf('id="authLoginPanel"'),
    'le bloc Google doit servir a la connexion et a l inscription'
  );
  // Flux gere par le serveur : aucun script Google charge dans la page.
  assert.doesNotMatch(html, /accounts\.google\.com|gsi\/client|apis\.google\.com/);

  assert.match(api, /async function fetchAuthProviders/);
  assert.match(api, /\/api\/auth\/providers/);
  assert.match(page, /ApiService\.fetchAuthProviders\(\)/);
  assert.match(page, /block\.classList\.toggle\('hidden', !providers\.google\)/);
  assert.match(page, /\/api\/auth\/google\/start\?next=\$\{encodeURIComponent\(next\)\}/);

  // Le parametre ?error= sert de cle dans une liste fixe, jamais de texte affiche.
  assert.match(page, /hasOwnProperty\.call\(GOOGLE_ERROR_MESSAGES, key\)/);
  assert.match(page, /setAuthMessage\(GOOGLE_ERROR_MESSAGES\[key\]\)/);
  for (const key of ['google_unavailable', 'google_cancelled', 'google_email', 'google_failed']) {
    assert.match(page, new RegExp(`${key}:`), `message manquant pour ${key}`);
  }
  assert.doesNotMatch(page, /setAuthMessage\(params\.get/);
}

const tests = [
  ['session idle and logout', testSessionIdleAndLogout],
  ['auth modules separated', testAuthModulesSeparated],
  ['auth password or code', testAuthPasswordOrCode],
  ['auth google button', testAuthGoogleButton],
  ['html contracts', testHtmlContracts],
  ['offline mode notice', testOfflineModeNotice],
  ['field validation client', testFieldValidationClient],
  ['lookup combobox ui', testLookupComboboxUi],
  ['editor preview layout', testEditorPreviewLayout],
  ['vendored qrcode library', testVendoredQrcodeLibrary],
  ['qr view guards missing library', testQrViewGuardsMissingLibrary],
  ['qr logo overlay', testQrLogoOverlay],
  ['css atmosphere', testCssAtmosphere],
  ['brand charter and hero', testBrandCharterAndHero],
  ['editorial flow progress', testEditorialFlowProgress],
  ['forest green tint unified', testForestGreenTintUnified],
  ['theme banner colors', testThemeBannerColors],
  ['card templates catalog', testCardTemplatesCatalog],
  ['profile card markup', testProfileCardMarkup],
  ['printable card export', testPrintableCardExport],
  ['print sheet layout', testPrintSheetLayout],
  ['print preview requires visualization', testPrintPreviewRequiresVisualization],
  ['toast centered', testToastCentered],
  ['share public button', testSharePublicButton]
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
