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
    const bannerColor = palette.bannerColor || '#18181b';

    const avatarMarkup = avatarSrc
      ? `<img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(fullName)}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
         <span style="display:none;background:${escapeHtml(bannerColor)}" class="w-full h-full items-center justify-center font-display font-semibold text-xl text-white">${escapeHtml(initials)}</span>`
      : `<span style="background:${escapeHtml(bannerColor)}" class="w-full h-full flex items-center justify-center font-display font-semibold text-xl text-white">${escapeHtml(initials)}</span>`;

    return `
      <div class="profile-card">
        <div class="profile-card__banner" style="background:${escapeHtml(bannerColor)}"></div>

        <div class="profile-card__body">
          <div class="relative -mt-10 mb-4 flex items-end justify-between gap-3">
            <div class="profile-card__avatar">
              <div class="profile-card__avatar-inner">
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

          <div class="space-y-1">
            <h1 class="profile-card__name">
              ${escapeHtml(fullName)}
            </h1>
            ${
              dataObj.jobTitle
                ? `<p class="text-sm text-[color:var(--ink-muted)] m-0">${escapeHtml(dataObj.jobTitle)}</p>`
                : ''
            }
            ${
              dataObj.location
                ? `<p class="text-xs text-[color:var(--ink-muted)] flex items-center gap-1.5 pt-1 m-0">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                    <span>${escapeHtml(dataObj.location)}</span>
                   </p>`
                : ''
            }
          </div>

          ${
            dataObj.bio
              ? `<p class="profile-card__bio">${escapeHtml(dataObj.bio)}</p>`
              : ''
          }

          <button type="button" data-action="save-vcard" class="profile-card__cta ${palette.btnBg}">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>Enregistrer dans les contacts</span>
          </button>

          <button type="button" data-action="download-card-image" class="profile-card__cta-secondary">
            <i data-lucide="credit-card" class="w-4 h-4"></i>
            <span>Télécharger la carte de visite virtuelle</span>
          </button>

          <div class="action-grid">
            ${
              cleanPhone
                ? `<a href="tel:${escapeHtml(cleanPhone)}" class="action-chip">
                    <i data-lucide="phone" class="w-3.5 h-3.5 ${palette.iconColor}"></i>
                    <span>Appeler</span>
                  </a>`
                : `<span class="action-chip is-disabled">
                    <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                    <span>Appeler</span>
                  </span>`
            }

            ${
              dataObj.email
                ? `<a href="mailto:${escapeHtml(dataObj.email)}" class="action-chip">
                    <i data-lucide="mail" class="w-3.5 h-3.5 ${palette.iconColor}"></i>
                    <span>Email</span>
                  </a>`
                : `<span class="action-chip is-disabled">
                    <i data-lucide="mail" class="w-3.5 h-3.5"></i>
                    <span>Email</span>
                  </span>`
            }

            ${
              cleanWhatsapp
                ? `<a href="https://wa.me/${escapeHtml(cleanWhatsapp)}" target="_blank" rel="noopener noreferrer" class="action-chip">
                    <i data-lucide="message-square" class="w-3.5 h-3.5 ${palette.iconColor}"></i>
                    <span>WhatsApp</span>
                  </a>`
                : `<span class="action-chip is-disabled">
                    <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                    <span>WhatsApp</span>
                  </span>`
            }
          </div>

          <div class="contact-list">
            ${
              dataObj.phone
                ? `<a href="tel:${escapeHtml(cleanPhone)}" class="contact-row">
                    <div class="min-w-0">
                      <p class="contact-row__label">Téléphone</p>
                      <p class="contact-row__value mono">${escapeHtml(dataObj.phone)}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 contact-row__chevron"></i>
                  </a>`
                : ''
            }

            ${
              dataObj.email
                ? `<a href="mailto:${escapeHtml(dataObj.email)}" class="contact-row">
                    <div class="min-w-0">
                      <p class="contact-row__label">Courriel professionnel</p>
                      <p class="contact-row__value">${escapeHtml(dataObj.email)}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 contact-row__chevron"></i>
                  </a>`
                : ''
            }

            ${
              linkedinHref
                ? `<a href="${escapeHtml(linkedinHref)}" target="_blank" rel="noopener noreferrer" class="contact-row">
                    <div class="min-w-0">
                      <p class="contact-row__label">LinkedIn</p>
                      <p class="contact-row__value">${escapeHtml(formatCleanDomain(linkedinHref))}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 contact-row__chevron"></i>
                  </a>`
                : ''
            }

            ${
              portfolioHref
                ? `<a href="${escapeHtml(portfolioHref)}" target="_blank" rel="noopener noreferrer" class="contact-row">
                    <div class="min-w-0">
                      <p class="contact-row__label">Site web</p>
                      <p class="contact-row__value">${escapeHtml(formatCleanDomain(portfolioHref))}</p>
                    </div>
                    <i data-lucide="arrow-up-right" class="w-3.5 h-3.5 contact-row__chevron"></i>
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
      'pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[color:var(--ink)] text-[color:var(--surface)] text-xs font-medium shadow-md border border-[color:var(--line)] transition-all duration-200 transform translate-y-2 opacity-0';
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
