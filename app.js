/**
 * vCard Studio — Zero-Backend Digital Business Card & Dynamic QR Code
 * Compatible iOS (Safari) & Android (Chrome / Samsung Internet) — RFC 2426 vCard 3.0
 */

const STORAGE_KEY = 'vcard_studio_draft_v1';
const THEME_STORAGE_KEY = 'vcard_studio_dark_mode';

const THEME_PALETTES = {
  indigo: {
    headerBg: 'from-indigo-600 via-indigo-600 to-violet-700',
    btnBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    qrDark: '#1e1b4b'
  },
  emerald: {
    headerBg: 'from-emerald-600 via-emerald-600 to-teal-700',
    btnBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    qrDark: '#064e3b'
  },
  blue: {
    headerBg: 'from-sky-500 via-blue-600 to-indigo-700',
    btnBg: 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    qrDark: '#1e3a8a'
  },
  rose: {
    headerBg: 'from-rose-500 via-rose-600 to-pink-700',
    btnBg: 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/25',
    badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    qrDark: '#881337'
  },
  amber: {
    headerBg: 'from-amber-500 via-orange-500 to-amber-700',
    btnBg: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25',
    badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    qrDark: '#78350f'
  },
  slate: {
    headerBg: 'from-slate-800 via-slate-900 to-black',
    btnBg: 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 shadow-slate-900/20',
    badgeBg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    iconColor: 'text-slate-700 dark:text-slate-300',
    qrDark: '#0f172a'
  }
};

const DEMO_DATA = {
  firstName: 'Koffi',
  lastName: 'Kouadio',
  jobTitle: 'Directeur Technique & Solutions Cloud',
  organization: 'NovaTech Africa',
  phone: '+225 07 08 09 10 11',
  whatsapp: '+225 07 08 09 10 11',
  email: 'koffi.kouadio@novatech.ci',
  location: 'Abidjan, Côte d’Ivoire',
  linkedinUrl: 'https://linkedin.com/in/koffi-kouadio',
  portfolioUrl: 'https://novatech-africa.com',
  bio: 'Architecte Cloud & Développeur Full-Stack. Accompagnement des entreprises dans leur transformation digitale.',
  photoUrl: '',
  photoBase64: '',
  theme: 'indigo',
  autoDownload: true
};

let state = { ...DEMO_DATA };
let qrMode = 'url'; // 'url' | 'vcard'
let isPublicScanView = false;

/* ==========================================================================
   1. INITIALIZATION & ROUTING (ZERO-BACKEND URL DECODING)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  checkLocalhostNotice();

  const urlPayload = extractDataFromUrl();
  if (urlPayload) {
    state = { ...DEMO_DATA, ...urlPayload };
    populateFormFromState();
    switchViewMode(true);

    // Trigger automatic vCard download 1 second after opening if enabled
    if (state.autoDownload) {
      setTimeout(() => {
        downloadVCard(state, true);
      }, 1000);
    }
  } else {
    loadDraftFromStorage();
    populateFormFromState();
    switchViewMode(false);
  }

  bindEventListeners();
  renderAll();
});

function checkLocalhostNotice() {
  const notice = document.getElementById('localhostNotice');
  if (!notice) return;
  const host = window.location.hostname;
  const isLocal = window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
  if (isLocal) {
    notice.classList.remove('hidden');
  }
}

/* ==========================================================================
   2. URL ENCODING & DECODING (COMPACT LZ-STRING + BASE64 FALLBACK)
   ========================================================================== */
function encodeStateToParam(dataObj, includeInlinePhoto = false) {
  // Compact keys to minimize URL length and keep QR code clean & fast to scan
  const compact = {
    f: (dataObj.firstName || '').trim(),
    l: (dataObj.lastName || '').trim(),
    j: (dataObj.jobTitle || '').trim(),
    o: (dataObj.organization || '').trim(),
    p: (dataObj.phone || '').trim(),
    w: (dataObj.whatsapp || '').trim(),
    e: (dataObj.email || '').trim(),
    loc: (dataObj.location || '').trim(),
    li: normalizeUrl(dataObj.linkedinUrl),
    po: normalizeUrl(dataObj.portfolioUrl),
    b: (dataObj.bio || '').trim(),
    u: (dataObj.photoUrl || '').trim(),
    t: dataObj.theme || 'indigo',
    a: dataObj.autoDownload ? 1 : 0
  };

  if (includeInlinePhoto && dataObj.photoBase64 && !compact.u) {
    compact.img = dataObj.photoBase64;
  }

  // Remove empty keys to save bytes
  Object.keys(compact).forEach((k) => {
    if (compact[k] === '' || compact[k] === null || compact[k] === undefined) {
      delete compact[k];
    }
  });

  const jsonStr = JSON.stringify(compact);
  if (window.LZString) {
    return 'lz_' + window.LZString.compressToEncodedURIComponent(jsonStr);
  }
  return 'b64_' + btoa(unescape(encodeURIComponent(jsonStr)));
}

function decodeParamToState(rawParam) {
  if (!rawParam) return null;
  try {
    let jsonStr = '';
    if (rawParam.startsWith('lz_') && window.LZString) {
      jsonStr = window.LZString.decompressFromEncodedURIComponent(rawParam.slice(3));
    } else if (rawParam.startsWith('b64_')) {
      jsonStr = decodeURIComponent(escape(atob(rawParam.slice(4))));
    } else {
      // Try LZString then standard Base64
      if (window.LZString) {
        jsonStr = window.LZString.decompressFromEncodedURIComponent(rawParam);
      }
      if (!jsonStr || !jsonStr.startsWith('{')) {
        jsonStr = decodeURIComponent(escape(atob(rawParam)));
      }
    }

    const c = JSON.parse(jsonStr);
    return {
      firstName: c.f || c.firstName || '',
      lastName: c.l || c.lastName || '',
      jobTitle: c.j || c.jobTitle || '',
      organization: c.o || c.organization || '',
      phone: c.p || c.phone || '',
      whatsapp: c.w || c.whatsapp || '',
      email: c.e || c.email || '',
      location: c.loc || c.location || '',
      linkedinUrl: c.li || c.linkedinUrl || '',
      portfolioUrl: c.po || c.portfolioUrl || '',
      bio: c.b || c.bio || '',
      photoUrl: c.u || c.photoUrl || '',
      photoBase64: c.img || c.photoBase64 || '',
      theme: c.t || c.theme || 'indigo',
      autoDownload: c.a !== undefined ? Boolean(c.a) : true
    };
  } catch (err) {
    console.error('Erreur de décodage des paramètres URL:', err);
    return null;
  }
}

function extractDataFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  let dataParam = searchParams.get('data');

  if (!dataParam && window.location.hash) {
    const hashStr = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hashStr);
    dataParam = hashParams.get('data');
  }

  return dataParam ? decodeParamToState(dataParam) : null;
}

function buildPublicProfileUrl(includeInlinePhoto = false) {
  const baseUrl = window.location.origin + window.location.pathname;
  const encoded = encodeStateToParam(state, includeInlinePhoto);
  return `${baseUrl}?data=${encoded}`;
}

/* ==========================================================================
   3. STRICT RFC 2426 vCARD 3.0 GENERATOR (iOS SAFARI & ANDROID COMPATIBLE)
   ========================================================================== */
function escapeVCardValue(val) {
  if (!val) return '';
  return String(val)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim();
}

function generateVCardString(dataObj, includePhotoBase64 = true) {
  const firstName = (dataObj.firstName || '').trim();
  const lastName = (dataObj.lastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim() || 'Contact';
  const jobTitle = (dataObj.jobTitle || '').trim();
  const org = (dataObj.organization || '').trim();
  const phone = (dataObj.phone || '').trim();
  const whatsapp = (dataObj.whatsapp || '').trim();
  const email = (dataObj.email || '').trim();
  const location = (dataObj.location || '').trim();
  const linkedin = normalizeUrl(dataObj.linkedinUrl);
  const portfolio = normalizeUrl(dataObj.portfolioUrl);
  const bio = (dataObj.bio || '').trim();

  // Strictly use CRLF (\r\n) per RFC 2426 specification
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N;CHARSET=UTF-8:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`,
    `FN;CHARSET=UTF-8:${escapeVCardValue(fullName)}`
  ];

  if (org) {
    lines.push(`ORG;CHARSET=UTF-8:${escapeVCardValue(org)}`);
  }
  if (jobTitle) {
    lines.push(`TITLE;CHARSET=UTF-8:${escapeVCardValue(jobTitle)}`);
  }
  if (phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${phone}`);
  }
  if (whatsapp && whatsapp !== phone) {
    lines.push(`TEL;TYPE=MSG,CELL:${whatsapp}`);
  }
  if (email) {
    lines.push(`EMAIL;TYPE=PREF,INTERNET:${email}`);
  }
  if (location) {
    lines.push(`ADR;TYPE=WORK;CHARSET=UTF-8:;;${escapeVCardValue(location)};;;;`);
  }
  if (linkedin) {
    // Standard RFC 2426 + Apple iOS custom label support
    lines.push(`URL;TYPE=LinkedIn:${linkedin}`);
    lines.push(`ITEM1.URL:${linkedin}`);
    lines.push('ITEM1.X-ABLabel:LinkedIn');
  }
  if (portfolio) {
    lines.push(`URL;TYPE=Portfolio:${portfolio}`);
    lines.push(`ITEM2.URL:${portfolio}`);
    lines.push('ITEM2.X-ABLabel:Portfolio');
  }
  if (bio) {
    lines.push(`NOTE;CHARSET=UTF-8:${escapeVCardValue(bio)}`);
  }

  // Optional embedded Base64 photo or external URI
  if (includePhotoBase64 && dataObj.photoBase64) {
    const rawB64 = dataObj.photoBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    if (rawB64) {
      lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${rawB64}`);
    }
  } else if (dataObj.photoUrl) {
    lines.push(`PHOTO;VALUE=URI:${dataObj.photoUrl}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n') + '\r\n';
}

function downloadVCard(dataObj = state, isAutoTriggered = false) {
  const vcardContent = generateVCardString(dataObj, true);
  const safeFirst = (dataObj.firstName || 'Contact').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeLast = (dataObj.lastName || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeFirst}${safeLast ? '_' + safeLast : ''}.vcf`;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    // On iOS Safari, data URI with text/vcard opens the native "Add to Contacts" sheet directly
    const dataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcardContent);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  if (!isAutoTriggered) {
    showToast(`Fiche contact "${fileName}" générée !`, 'contact');
  }
}

/* ==========================================================================
   4. QR CODE GENERATION & PROFILE RENDERING
   ========================================================================== */
function updateQrCode() {
  const canvas = document.getElementById('qrCanvas');
  const urlDisplay = document.getElementById('generatedUrlDisplay');
  const sizeDisplay = document.getElementById('payloadSizeDisplay');
  const statusBadge = document.getElementById('qrStatusBadge');
  if (!canvas || !window.QRCode) return;

  const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.indigo;
  let qrPayload = '';

  if (qrMode === 'vcard') {
    // Direct vCard 3.0 payload inside QR code (exclude heavy Base64 image so QR stays clean)
    qrPayload = generateVCardString(state, false);
    urlDisplay.textContent = 'Mode vCard 3.0 Direct (Hors-ligne)';
  } else {
    // Try including tiny inline photo only if very small, otherwise keep URL ultra-compact
    const urlWithoutB64 = buildPublicProfileUrl(false);
    qrPayload = urlWithoutB64;
    urlDisplay.textContent = urlWithoutB64;
  }

  const byteLength = new Blob([qrPayload]).size;
  if (sizeDisplay) {
    sizeDisplay.textContent = `${byteLength} octets`;
  }

  QRCode.toCanvas(
    canvas,
    qrPayload,
    {
      width: 240,
      margin: 1,
      errorCorrectionLevel: byteLength > 600 ? 'L' : 'M',
      color: {
        dark: palette.qrDark || '#0f172a',
        light: '#ffffff'
      }
    },
    (error) => {
      if (error) {
        console.error('QR Code error:', error);
        if (statusBadge) {
          statusBadge.textContent = 'Trop long';
          statusBadge.className = 'px-2 py-0.5 text-[11px] rounded-full font-semibold bg-rose-500/10 text-rose-600';
        }
      } else if (statusBadge) {
        statusBadge.textContent = qrMode === 'vcard' ? 'vCard Direct' : 'Lien Profil';
        statusBadge.className = 'px-2 py-0.5 text-[11px] rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      }
    }
  );
}

function buildProfileCardHtml(dataObj, isCompactMockup = false) {
  const palette = THEME_PALETTES[dataObj.theme] || THEME_PALETTES.indigo;
  const fullName = `${dataObj.firstName || ''} ${dataObj.lastName || ''}`.trim() || 'Votre Nom';
  const initials = getInitials(dataObj.firstName, dataObj.lastName);
  const avatarSrc = dataObj.photoBase64 || dataObj.photoUrl || '';
  const linkedinHref = normalizeUrl(dataObj.linkedinUrl);
  const portfolioHref = normalizeUrl(dataObj.portfolioUrl);
  const cleanPhone = (dataObj.phone || '').replace(/[^\d+]/g, '');
  const cleanWhatsapp = (dataObj.whatsapp || dataObj.phone || '').replace(/[^\d]/g, '');

  const avatarMarkup = avatarSrc
    ? `<img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(fullName)}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
       <span style="display:none" class="w-full h-full items-center justify-center font-display font-bold text-2xl text-white bg-gradient-to-br ${palette.headerBg}">${escapeHtml(initials)}</span>`
    : `<span class="w-full h-full flex items-center justify-center font-display font-bold text-2xl text-white bg-gradient-to-br ${palette.headerBg}">${escapeHtml(initials)}</span>`;

  return `
    <div class="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <!-- Top Gradient Banner -->
      <div class="h-28 bg-gradient-to-r ${palette.headerBg} relative overflow-hidden">
        <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <!-- Profile Avatar & Identity -->
      <div class="px-5 pb-6">
        <div class="relative -mt-12 mb-3 flex items-end justify-between">
          <div class="w-24 h-24 rounded-3xl p-1 bg-white dark:bg-slate-900 shadow-lg">
            <div class="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center">
              ${avatarMarkup}
            </div>
          </div>
          ${
            dataObj.organization
              ? `<span class="px-3 py-1 rounded-full text-xs font-semibold border ${palette.badgeBg} mb-1 max-w-[170px] truncate">
                  ${escapeHtml(dataObj.organization)}
                 </span>`
              : ''
          }
        </div>

        <!-- Name, Title & Location -->
        <div class="space-y-1">
          <h1 class="font-display font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>${escapeHtml(fullName)}</span>
            <i data-lucide="badge-check" class="w-5 h-5 ${palette.iconColor} shrink-0"></i>
          </h1>
          ${
            dataObj.jobTitle
              ? `<p class="text-sm font-medium text-slate-600 dark:text-slate-300">${escapeHtml(dataObj.jobTitle)}</p>`
              : ''
          }
          ${
            dataObj.location
              ? `<p class="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 pt-0.5">
                  <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                  <span>${escapeHtml(dataObj.location)}</span>
                 </p>`
              : ''
          }
        </div>

        ${
          dataObj.bio
            ? `<p class="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                ${escapeHtml(dataObj.bio)}
               </p>`
            : ''
        }

        <!-- PRIMARY CTA: SAVE TO CONTACTS -->
        <div class="mt-5">
          <button type="button" data-action="save-vcard" class="cta-pulse w-full py-3.5 px-5 rounded-2xl font-display font-bold text-sm sm:text-base text-white ${palette.btnBg} shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer">
            <i data-lucide="user-plus" class="w-5 h-5"></i>
            <span>Enregistrer dans mes contacts</span>
          </button>
        </div>

        <!-- QUICK DIRECT ACTIONS (Call, Email, WhatsApp) -->
        <div class="mt-4 grid grid-cols-3 gap-2.5">
          ${
            cleanPhone
              ? `<a href="tel:${escapeHtml(cleanPhone)}" class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center group-hover:scale-110 transition">
                    <i data-lucide="phone" class="w-4 h-4 ${palette.iconColor}"></i>
                  </div>
                  <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Appeler</span>
                </a>`
              : `<div class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 opacity-40">
                  <div class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center">
                    <i data-lucide="phone" class="w-4 h-4"></i>
                  </div>
                  <span class="text-[11px] font-medium">Appeler</span>
                </div>`
          }

          ${
            dataObj.email
              ? `<a href="mailto:${escapeHtml(dataObj.email)}" class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center group-hover:scale-110 transition">
                    <i data-lucide="mail" class="w-4 h-4 ${palette.iconColor}"></i>
                  </div>
                  <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Email</span>
                </a>`
              : `<div class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 opacity-40">
                  <div class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center">
                    <i data-lucide="mail" class="w-4 h-4"></i>
                  </div>
                  <span class="text-[11px] font-medium">Email</span>
                </div>`
          }

          ${
            cleanWhatsapp
              ? `<a href="https://wa.me/${escapeHtml(cleanWhatsapp)}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center group-hover:scale-110 transition">
                    <i data-lucide="message-circle" class="w-4 h-4 text-emerald-500"></i>
                  </div>
                  <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">WhatsApp</span>
                </a>`
              : `<div class="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 opacity-40">
                  <div class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                  </div>
                  <span class="text-[11px] font-medium">WhatsApp</span>
                </div>`
          }
        </div>

        <!-- LINKTREE-STYLE CARDS (Phone, Email, LinkedIn, Portfolio) -->
        <div class="mt-4 space-y-2.5">
          ${
            dataObj.phone
              ? `<a href="tel:${escapeHtml(cleanPhone)}" class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
                      <i data-lucide="phone-call" class="w-4 h-4 ${palette.iconColor}"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[11px] font-medium text-slate-400">Téléphone direct</p>
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(dataObj.phone)}</p>
                    </div>
                  </div>
                  <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition shrink-0"></i>
                </a>`
              : ''
          }

          ${
            dataObj.email
              ? `<a href="mailto:${escapeHtml(dataObj.email)}" class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm shrink-0">
                      <i data-lucide="at-sign" class="w-4 h-4 ${palette.iconColor}"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[11px] font-medium text-slate-400">Adresse Email</p>
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(dataObj.email)}</p>
                    </div>
                  </div>
                  <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition shrink-0"></i>
                </a>`
              : ''
          }

          ${
            linkedinHref
              ? `<a href="${escapeHtml(linkedinHref)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center shrink-0">
                      <i data-lucide="linkedin" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">Ouvrir LinkedIn</p>
                      <p class="text-[11px] text-slate-400 truncate">${escapeHtml(formatCleanDomain(linkedinHref))}</p>
                    </div>
                  </div>
                  <i data-lucide="arrow-up-right" class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0"></i>
                </a>`
              : ''
          }

          ${
            portfolioHref
              ? `<a href="${escapeHtml(portfolioHref)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 transition group">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-xl bg-indigo-500/10 ${palette.iconColor} flex items-center justify-center shrink-0">
                      <i data-lucide="globe" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">Ouvrir le Portfolio / Site Web</p>
                      <p class="text-[11px] text-slate-400 truncate">${escapeHtml(formatCleanDomain(portfolioHref))}</p>
                    </div>
                  </div>
                  <i data-lucide="arrow-up-right" class="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0"></i>
                </a>`
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

function renderAll() {
  // 1. Update Editor small avatar preview
  const editorAvatar = document.getElementById('editorAvatarPreview');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');
  if (editorAvatar) {
    const src = state.photoBase64 || state.photoUrl;
    if (src) {
      editorAvatar.innerHTML = `<img src="${escapeHtml(src)}" alt="Avatar" class="w-full h-full object-cover" />`;
      if (btnRemovePhoto) btnRemovePhoto.classList.remove('hidden');
    } else {
      editorAvatar.textContent = getInitials(state.firstName, state.lastName);
      if (btnRemovePhoto) btnRemovePhoto.classList.add('hidden');
    }
  }

  // 2. Update Theme Swatches active ring
  document.querySelectorAll('#themeColorPicker .theme-swatch').forEach((btn) => {
    const t = btn.getAttribute('data-theme');
    if (t === state.theme) {
      btn.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-600', 'dark:ring-offset-slate-900');
    } else {
      btn.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-600', 'dark:ring-offset-slate-900');
    }
  });

  // 3. Render Phone Mockup & Public Profile Mounts
  const cardMarkup = buildProfileCardHtml(state);
  const mockupMount = document.getElementById('mockupProfileMount');
  const publicMount = document.getElementById('publicProfileMount');

  if (mockupMount) mockupMount.innerHTML = cardMarkup;
  if (publicMount) publicMount.innerHTML = cardMarkup;

  // Bind "Enregistrer dans mes contacts" buttons inside rendered cards
  document.querySelectorAll('[data-action="save-vcard"]').forEach((btn) => {
    btn.addEventListener('click', () => downloadVCard(state, false));
  });

  // 4. Refresh Lucide Icons & QR Code
  if (window.lucide) {
    window.lucide.createIcons();
  }
  updateQrCode();
}

/* ==========================================================================
   5. FORM & UI EVENT LISTENERS
   ========================================================================== */
function bindEventListeners() {
  const form = document.getElementById('vcardForm');
  if (form) {
    form.addEventListener('input', (e) => {
      const target = e.target;
      if (!target.name) return;

      if (target.type === 'checkbox') {
        state[target.name] = target.checked;
      } else {
        state[target.name] = target.value;
      }
      saveDraftToStorage();
      renderAll();
    });
  }

  // Theme Color Swatches
  document.querySelectorAll('#themeColorPicker .theme-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.theme = btn.getAttribute('data-theme') || 'indigo';
      saveDraftToStorage();
      renderAll();
    });
  });

  // Photo Upload (Canvas Resize to lightweight Base64 JPEG)
  const photoUpload = document.getElementById('photoUpload');
  if (photoUpload) {
    photoUpload.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      resizeImageToBase64(file, 160, 160, 0.75, (b64) => {
        state.photoBase64 = b64;
        saveDraftToStorage();
        renderAll();
        showToast('Photo optimisée et ajoutée !', 'check-circle-2');
      });
    });
  }

  const btnRemovePhoto = document.getElementById('btnRemovePhoto');
  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      state.photoBase64 = '';
      state.photoUrl = '';
      const photoUrlInput = document.getElementById('photoUrl');
      const photoUploadInput = document.getElementById('photoUpload');
      if (photoUrlInput) photoUrlInput.value = '';
      if (photoUploadInput) photoUploadInput.value = '';
      saveDraftToStorage();
      renderAll();
    });
  }

  // QR Mode Toggle (Profile Link vs Direct vCard)
  const qrModeUrlBtn = document.getElementById('qrModeUrl');
  const qrModeVcardBtn = document.getElementById('qrModeVcard');
  if (qrModeUrlBtn && qrModeVcardBtn) {
    qrModeUrlBtn.addEventListener('click', () => {
      qrMode = 'url';
      qrModeUrlBtn.className = 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition';
      qrModeVcardBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
      updateQrCode();
    });
    qrModeVcardBtn.addEventListener('click', () => {
      qrMode = 'vcard';
      qrModeVcardBtn.className = 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition';
      qrModeUrlBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
      updateQrCode();
    });
  }

  // Download QR Code (High Resolution PNG)
  const btnDownloadQrPng = document.getElementById('btnDownloadQrPng');
  if (btnDownloadQrPng) {
    btnDownloadQrPng.addEventListener('click', downloadHighResQrPng);
  }

  // Copy Profile Link
  const btnCopyLink = document.getElementById('btnCopyLink');
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', async () => {
      const url = buildPublicProfileUrl(false);
      try {
        await navigator.clipboard.writeText(url);
        const label = document.getElementById('copyLinkText');
        if (label) {
          const prev = label.textContent;
          label.textContent = 'Lien copié !';
          setTimeout(() => (label.textContent = prev), 2000);
        }
        showToast('Lien du profil copié dans le presse-papiers !', 'check');
      } catch {
        prompt('Copiez ce lien de profil :', url);
      }
    });
  }

  // Test .vcf in Editor
  const btnTestVcfEditor = document.getElementById('btnTestVcfEditor');
  if (btnTestVcfEditor) {
    btnTestVcfEditor.addEventListener('click', () => downloadVCard(state, false));
  }

  // View Switchers (Editor <-> Public Scan Preview)
  const btnTogglePreviewMode = document.getElementById('btnTogglePreviewMode');
  const btnOpenFullPreview = document.getElementById('btnOpenFullPreview');
  const btnBackToEditor = document.getElementById('btnBackToEditor');

  if (btnTogglePreviewMode) {
    btnTogglePreviewMode.addEventListener('click', () => switchViewMode(!isPublicScanView));
  }
  if (btnOpenFullPreview) {
    btnOpenFullPreview.addEventListener('click', () => switchViewMode(true));
  }
  if (btnBackToEditor) {
    btnBackToEditor.addEventListener('click', () => {
      // Remove ?data= from URL bar without reloading so user can edit cleanly
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      switchViewMode(false);
    });
  }

  // Native Web Share on Public View
  const btnSharePublic = document.getElementById('btnSharePublic');
  if (btnSharePublic) {
    btnSharePublic.addEventListener('click', async () => {
      const shareUrl = buildPublicProfileUrl(false);
      const fullName = `${state.firstName || ''} ${state.lastName || ''}`.trim();
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Carte de visite — ${fullName}`,
            text: `Voici les coordonnées de ${fullName} (${state.jobTitle || ''})`,
            url: shareUrl
          });
          return;
        } catch {
          // Fallback to clipboard copy
        }
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast('Lien de la carte copié !', 'share-2');
    });
  }

  // Demo & Clear Form buttons
  const btnFillDemo = document.getElementById('btnFillDemo');
  if (btnFillDemo) {
    btnFillDemo.addEventListener('click', () => {
      state = { ...DEMO_DATA };
      populateFormFromState();
      saveDraftToStorage();
      renderAll();
      showToast('Données d’exemple chargées', 'sparkles');
    });
  }

  const btnClearForm = document.getElementById('btnClearForm');
  if (btnClearForm) {
    btnClearForm.addEventListener('click', () => {
      state = {
        firstName: '',
        lastName: '',
        jobTitle: '',
        organization: '',
        phone: '',
        whatsapp: '',
        email: '',
        location: '',
        linkedinUrl: '',
        portfolioUrl: '',
        bio: '',
        photoUrl: '',
        photoBase64: '',
        theme: 'indigo',
        autoDownload: true
      };
      populateFormFromState();
      saveDraftToStorage();
      renderAll();
      showToast('Formulaire réinitialisé', 'rotate-ccw');
    });
  }

  // Dark Mode Toggles
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const btnThemeTogglePublic = document.getElementById('btnThemeTogglePublic');
  if (btnThemeToggle) btnThemeToggle.addEventListener('click', toggleDarkMode);
  if (btnThemeTogglePublic) btnThemeTogglePublic.addEventListener('click', toggleDarkMode);
}

/* ==========================================================================
   6. HELPERS (HIGH-RES QR EXPORT, IMAGE RESIZE, STORAGE, TOASTS)
   ========================================================================== */
function downloadHighResQrPng() {
  if (!window.QRCode) return;
  const offscreen = document.createElement('canvas');
  const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.indigo;
  const payload = qrMode === 'vcard' ? generateVCardString(state, false) : buildPublicProfileUrl(false);

  QRCode.toCanvas(
    offscreen,
    payload,
    {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: palette.qrDark || '#0f172a',
        light: '#ffffff'
      }
    },
    (err) => {
      if (err) {
        showToast('Erreur lors de la génération HD', 'alert-circle');
        return;
      }
      const safeName = `${state.firstName || 'Carte'}_${state.lastName || 'Visite'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const link = document.createElement('a');
      link.download = `QR_${safeName}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
      showToast('QR Code Haute Définition (1024px) téléchargé !', 'download');
    }
  );
}

function resizeImageToBase64(file, maxWidth, maxHeight, quality, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Square crop center
      const size = Math.min(width, height);
      const sx = (width - size) / 2;
      const sy = (height - size) / 2;

      canvas.width = maxWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, maxWidth, maxHeight);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function switchViewMode(showPublic) {
  isPublicScanView = showPublic;
  const editorHeader = document.getElementById('editorHeader');
  const editorView = document.getElementById('editorView');
  const publicView = document.getElementById('publicProfileView');

  if (showPublic) {
    if (editorHeader) editorHeader.classList.add('hidden');
    if (editorView) editorView.classList.add('hidden');
    if (publicView) publicView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    if (editorHeader) editorHeader.classList.remove('hidden');
    if (editorView) editorView.classList.remove('hidden');
    if (publicView) publicView.classList.add('hidden');
  }
}

function populateFormFromState() {
  const fields = [
    'firstName',
    'lastName',
    'jobTitle',
    'organization',
    'phone',
    'whatsapp',
    'email',
    'location',
    'linkedinUrl',
    'portfolioUrl',
    'bio',
    'photoUrl'
  ];

  fields.forEach((field) => {
    const el = document.getElementById(field);
    if (el) el.value = state[field] || '';
  });

  const autoDownloadEl = document.getElementById('autoDownload');
  if (autoDownloadEl) {
    autoDownloadEl.checked = Boolean(state.autoDownload);
  }
}

function saveDraftToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

function loadDraftFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...DEMO_DATA, ...parsed };
    }
  } catch {
    state = { ...DEMO_DATA };
  }
}

function initDarkMode() {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
}

function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatCleanDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

function getInitials(first, last) {
  const f = (first || '').trim().charAt(0).toUpperCase();
  const l = (last || '').trim().charAt(0).toUpperCase();
  return f + l || 'VC';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, iconName = 'check-circle-2') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className =
    'pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold shadow-xl border border-slate-700/50 transition-all duration-300 transform translate-y-2 opacity-0';
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

