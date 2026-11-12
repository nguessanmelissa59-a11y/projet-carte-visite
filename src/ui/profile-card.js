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
    const palette = THEME_PALETTES[dataObj.theme] || THEME_PALETTES.obsidian;
    const fullName = `${dataObj.firstName || ''} ${dataObj.lastName || ''}`.trim() || 'Nom du contact';
    const initials = getInitials(dataObj.firstName, dataObj.lastName);
    const avatarSrc = dataObj.photoBase64 || dataObj.photoUrl || '';
    const linkedinHref = normalizeUrl(dataObj.linkedinUrl);
    const portfolioHref = normalizeUrl(dataObj.portfolioUrl);
    const cleanPhone = (dataObj.phone || '').replace(/[^\d+]/g, '');
    const cleanWhatsapp = (dataObj.whatsapp || dataObj.phone || '').replace(/[^\d]/g, '');

    const avatarMarkup = avatarSrc
      ? `<img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(fullName)}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
         <span style="display:none" class="w-full h-full items-center justify-center font-display font-semibold text-xl text-white ${palette.headerBg}">${escapeHtml(initials)}</span>`
      : `<span class="w-full h-full flex items-center justify-center font-display font-semibold text-xl text-white ${palette.headerBg}">${escapeHtml(initials)}</span>`;

    return `
      <div class="relative bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        <!-- Minimal Editorial Header -->
        <div class="h-24 ${palette.headerBg} relative"></div>

        <div class="px-6 pb-6">
          <!-- Avatar & Organization Row -->
          <div class="relative -mt-10 mb-4 flex items-end justify-between gap-3">
            <div class="w-20 h-20 rounded-xl p-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div class="w-full h-full rounded-[10px] overflow-hidden flex items-center justify-center">
                ${avatarMarkup}
              </div>
            </div>
            ${
              dataObj.organization
                ? `<span class="px-2.5 py-1 rounded-md text-[11px] font-medium border ${palette.badgeBg} mb-1 max-w-[180px] truncate">
                    ${escapeHtml(dataObj.organization)}
                   </span>`
                : ''
            }
          </div>

          <!-- Identity -->
          <div class="space-y-0.5">
            <h1 class="font-display font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
              ${escapeHtml(fullName)}
            </h1>
            ${
              dataObj.jobTitle
                ? `<p class="text-sm text-zinc-600 dark:text-zinc-400">${escapeHtml(dataObj.jobTitle)}</p>`
                : ''
            }
            ${
              dataObj.location
                ? `<p class="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 pt-1">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                    <span>${escapeHtml(dataObj.location)}</span>
                   </p>`
                : ''
            }
          </div>

          ${
            dataObj.bio
              ? `<p class="mt-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 py-0.5">
                  ${escapeHtml(dataObj.bio)}
                 </p>`
              : ''
          }

          <!-- Primary CTA -->
          <div class="mt-5">
            <button type="button" data-action="save-vcard" class="w-full h-11 px-4 rounded-lg font-medium text-sm ${palette.btnBg} transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>Enregistrer dans les contacts</span>
            </button>
          </div>

          <!-- Direct Action Bar -->
          <div class="mt-3 grid grid-cols-3 gap-2">
            ${
              cleanPhone
                ? `<a href="tel:${escapeHtml(cleanPhone)}" class="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                    <i data-lucide="phone" class="w-3.5 h-3.5 ${palette.iconColor}"></i>
                    <span>Appeler</span>
                  </a>`
                : `<span class="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-800/40 text-xs text-zinc-400 opacity-50">
                    <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                    <span>Appeler</span>
                  </span>`
            }

            ${
              dataObj.email
                ? `<a href="mailto:${escapeHtml(dataObj.email)}" class="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                    <i data-lucide="mail" class="w-3.5 h-3.5 ${palette.iconColor}"></i>
                    <span>Email</span>
                  </a>`
                : `<span class="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-800/40 text-xs text-zinc-400 opacity-50">
                    <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                    <span>Email</span>
                  </span>`
            }

            ${
              cleanWhatsapp
                ? `<a href="https://wa.me/${escapeHtml(cleanWhatsapp)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/70 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                    <i data-lucide="message-square" class="w-3.5 h-3.5 ${palette.iconColor}"></i>
                    <span>WhatsApp</span>
                  </a>`
                : `<span class="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200/40 dark:border-zinc-800/40 text-xs text-zinc-400 opacity-50">
                    <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                    <span>WhatsApp</span>
                  </span>`
            }
          </div>

          <!-- Editorial Contact Rows (Hairline Dividers) -->
          <div class="mt-5 border-t border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
            ${
              dataObj.phone
                ? `<a href="tel:${escapeHtml(cleanPhone)}" class="flex items-center justify-between py-3 group">
                    <div class="min-w-0">
                      <p class="text-[11px] text-zinc-400 dark:text-zinc-500">Téléphone</p>
                      <p class="text-xs font-mono tabular-nums font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">${escapeHtml(dataObj.phone)}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0"></i>
                  </a>`
                : ''
            }

            ${
              dataObj.email
                ? `<a href="mailto:${escapeHtml(dataObj.email)}" class="flex items-center justify-between py-3 group">
                    <div class="min-w-0">
                      <p class="text-[11px] text-zinc-400 dark:text-zinc-500">Courriel professionnel</p>
                      <p class="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">${escapeHtml(dataObj.email)}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0"></i>
                  </a>`
                : ''
            }

            ${
              linkedinHref
                ? `<a href="${escapeHtml(linkedinHref)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between py-3 group">
                    <div class="min-w-0">
                      <p class="text-[11px] text-zinc-400 dark:text-zinc-500">LinkedIn</p>
                      <p class="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">${escapeHtml(formatCleanDomain(linkedinHref))}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0"></i>
                  </a>`
                : ''
            }

            ${
              portfolioHref
                ? `<a href="${escapeHtml(portfolioHref)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between py-3 group">
                    <div class="min-w-0">
                      <p class="text-[11px] text-zinc-400 dark:text-zinc-500">Site web</p>
                      <p class="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">${escapeHtml(formatCleanDomain(portfolioHref))}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0"></i>
                  </a>`
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }

  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className =
      'pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium shadow-md border border-zinc-800 dark:border-zinc-200 transition-all duration-200 transform translate-y-2 opacity-0';
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 250);
    }, 2600);
  }

  return {
    escapeHtml,
    getInitials,
    buildCardHtml,
    showToast
  };
})();
