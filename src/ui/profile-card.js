window.VCardApp = window.VCardApp || {};

window.VCardApp.ProfileCardUI = (function () {
  const { THEME_PALETTES } = window.VCardApp.Config;
  const { normalizeUrl, formatCleanDomain } = window.VCardApp.UrlCodec;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getInitials(first, last) {
    const f = (first || '').trim().charAt(0).toUpperCase();
    const l = (last || '').trim().charAt(0).toUpperCase();
    return f + l || 'VC';
  }

  function buildCardHtml(dataObj) {
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
        <div class="h-28 bg-gradient-to-r ${palette.headerBg} relative overflow-hidden">
          <div class="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        </div>

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

          <div class="mt-5">
            <button type="button" data-action="save-vcard" class="cta-pulse w-full py-3.5 px-5 rounded-2xl font-display font-bold text-sm sm:text-base text-white ${palette.btnBg} shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer">
              <i data-lucide="user-plus" class="w-5 h-5"></i>
              <span>Enregistrer dans mes contacts</span>
            </button>
          </div>

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

  return {
    escapeHtml,
    getInitials,
    buildCardHtml,
    showToast
  };
})();
