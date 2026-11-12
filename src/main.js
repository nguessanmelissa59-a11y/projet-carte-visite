(function () {
  const { DEMO_DATA, FORM_FIELDS } = window.VCardApp.Config;
  const StorageService = window.VCardApp.StorageService;
  const UrlCodec = window.VCardApp.UrlCodec;
  const VCardService = window.VCardApp.VCardService;
  const ApiService = window.VCardApp.ApiService;
  const QrView = window.VCardApp.QrView;
  const ProfileCardUI = window.VCardApp.ProfileCardUI;

  let state = { ...DEMO_DATA };
  let qrMode = 'url';
  let isPublicScanView = false;
  let saveTimeout = null;

  document.addEventListener('DOMContentLoaded', async () => {
    StorageService.initTheme();

    const backendStatus = await ApiService.checkBackend();
    updateBackendStatusUI(backendStatus);

    const searchParams = new URLSearchParams(window.location.search);
    const cardIdParam = searchParams.get('id');
    const isScanEvent = searchParams.get('scan') === '1';
    const urlPayload = UrlCodec.extractFromCurrentLocation();

    if (cardIdParam && backendStatus.available) {
      const serverCard = await ApiService.fetchCardBySlug(cardIdParam, isScanEvent);
      if (serverCard) {
        state = { ...DEMO_DATA, ...serverCard };
      }
      populateForm();
      setViewMode(true);
      triggerAutoDownloadIfEnabled();
    } else if (urlPayload) {
      state = { ...DEMO_DATA, ...urlPayload };
      populateForm();
      setViewMode(true);
      triggerAutoDownloadIfEnabled();
    } else {
      state = StorageService.loadDraft();
      if (backendStatus.available) {
        const existing = await ApiService.fetchCardBySlug(state.slug || 'koffi-kouadio', false);
        if (existing) {
          state = { ...state, ...existing };
        } else {
          await ApiService.saveCard(state);
        }
      }
      populateForm();
      setViewMode(false);
    }

    bindEvents();
    renderAll();
  });

  function triggerAutoDownloadIfEnabled() {
    if (!state.autoDownload) return;
    setTimeout(() => {
      handleSaveContactAction();
    }, 900);
  }

  function handleSaveContactAction() {
    if (ApiService.isAvailable() && state.slug) {
      window.location.href = `/api/cards/${encodeURIComponent(ApiService.slugify(state.slug))}/vcf`;
      return;
    }
    VCardService.downloadVCard(state, (fileName) => {
      ProfileCardUI.showToast(`Fichier ${fileName} téléchargé`);
    });
  }

  function updateBackendStatusUI(backendStatus) {
    const modeIndicator = document.getElementById('backendStatusLabel');
    const scanCounterWrap = document.getElementById('scanCounterWrap');

    if (backendStatus.available) {
      if (modeIndicator) {
        modeIndicator.textContent = 'Serveur SQLite actif';
        modeIndicator.className =
          'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700';
      }
      if (scanCounterWrap) scanCounterWrap.classList.remove('hidden');
    } else {
      if (modeIndicator) {
        modeIndicator.textContent = 'Mode statique autonome';
        modeIndicator.className =
          'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800';
      }
    }
  }

  function scheduleBackendSave() {
    if (!ApiService.isAvailable()) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const saved = await ApiService.saveCard(state);
        if (saved) {
          state.slug = saved.slug;
          state.scans = saved.scans;
          updateScanCountBadge();
          QrView.renderCanvas(state, qrMode);
        }
      } catch {
        // Silent background sync error
      }
    }, 450);
  }

  function updateScanCountBadge() {
    const scanCountEl = document.getElementById('scanCountValue');
    if (scanCountEl) {
      scanCountEl.textContent = String(state.scans || 0);
    }
  }

  function populateForm() {
    FORM_FIELDS.forEach((field) => {
      const el = document.getElementById(field);
      if (el) el.value = state[field] || '';
    });

    const autoDownloadEl = document.getElementById('autoDownload');
    if (autoDownloadEl) {
      autoDownloadEl.checked = Boolean(state.autoDownload);
    }
    updateScanCountBadge();
  }

  function setViewMode(showPublic) {
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

  function renderAll() {
    const editorAvatar = document.getElementById('editorAvatarPreview');
    const btnRemovePhoto = document.getElementById('btnRemovePhoto');

    if (editorAvatar) {
      const src = state.photoBase64 || state.photoUrl;
      if (src) {
        editorAvatar.innerHTML = `<img src="${ProfileCardUI.escapeHtml(src)}" alt="Avatar" class="w-full h-full object-cover" />`;
        if (btnRemovePhoto) btnRemovePhoto.classList.remove('hidden');
      } else {
        editorAvatar.textContent = ProfileCardUI.getInitials(state.firstName, state.lastName);
        if (btnRemovePhoto) btnRemovePhoto.classList.add('hidden');
      }
    }

    document.querySelectorAll('#themeColorPicker .theme-swatch').forEach((btn) => {
      const t = btn.getAttribute('data-theme');
      if (t === state.theme) {
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-zinc-900', 'dark:ring-zinc-100', 'dark:ring-offset-zinc-900');
      } else {
        btn.classList.remove('ring-2', 'ring-offset-2', 'ring-zinc-900', 'dark:ring-zinc-100', 'dark:ring-offset-zinc-900');
      }
    });

    updateScanCountBadge();

    const cardMarkup = ProfileCardUI.buildCardHtml(state);
    const mockupMount = document.getElementById('mockupProfileMount');
    const publicMount = document.getElementById('publicProfileMount');

    if (mockupMount) mockupMount.innerHTML = cardMarkup;
    if (publicMount) publicMount.innerHTML = cardMarkup;

    document.querySelectorAll('[data-action="save-vcard"]').forEach((btn) => {
      btn.addEventListener('click', handleSaveContactAction);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
    QrView.renderCanvas(state, qrMode);
  }

  function bindEvents() {
    const form = document.getElementById('vcardForm');
    if (form) {
      form.addEventListener('input', (e) => {
        const target = e.target;
        if (!target.name) return;
        state[target.name] = target.type === 'checkbox' ? target.checked : target.value;

        if ((target.name === 'firstName' || target.name === 'lastName') && !document.getElementById('slug').dataset.edited) {
          state.slug = ApiService.slugify(`${state.firstName}-${state.lastName}`);
          const slugEl = document.getElementById('slug');
          if (slugEl) slugEl.value = state.slug;
        }
        if (target.name === 'slug') {
          target.dataset.edited = 'true';
        }

        StorageService.saveDraft(state);
        scheduleBackendSave();
        renderAll();
      });
    }

    const btnSaveServer = document.getElementById('btnSaveServer');
    if (btnSaveServer) {
      btnSaveServer.addEventListener('click', async () => {
        if (!ApiService.isAvailable()) {
          StorageService.saveDraft(state);
          ProfileCardUI.showToast('Brouillon enregistré localement');
          return;
        }
        try {
          const saved = await ApiService.saveCard(state);
          if (saved) {
            state.slug = saved.slug;
            state.scans = saved.scans;
            populateForm();
            renderAll();
            ProfileCardUI.showToast(`Carte synchronisée (/c/${saved.slug})`);
          }
        } catch {
          ProfileCardUI.showToast('Erreur de sauvegarde serveur');
        }
      });
    }

    document.querySelectorAll('#themeColorPicker .theme-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.getAttribute('data-theme') || 'obsidian';
        StorageService.saveDraft(state);
        scheduleBackendSave();
        renderAll();
      });
    });

    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
      photoUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        StorageService.resizeImageToBase64(file, 180, 180, 0.8, (b64) => {
          state.photoBase64 = b64;
          StorageService.saveDraft(state);
          scheduleBackendSave();
          renderAll();
          ProfileCardUI.showToast('Photo mise à jour');
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
        StorageService.saveDraft(state);
        scheduleBackendSave();
        renderAll();
      });
    }

    const qrModeUrlBtn = document.getElementById('qrModeUrl');
    const qrModeVcardBtn = document.getElementById('qrModeVcard');
    if (qrModeUrlBtn && qrModeVcardBtn) {
      qrModeUrlBtn.addEventListener('click', () => {
        qrMode = 'url';
        qrModeUrlBtn.className = 'px-2.5 py-1 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm transition';
        qrModeVcardBtn.className = 'px-2.5 py-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition';
        QrView.renderCanvas(state, qrMode);
      });
      qrModeVcardBtn.addEventListener('click', () => {
        qrMode = 'vcard';
        qrModeVcardBtn.className = 'px-2.5 py-1 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm transition';
        qrModeUrlBtn.className = 'px-2.5 py-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition';
        QrView.renderCanvas(state, qrMode);
      });
    }

    const btnDownloadQrPng = document.getElementById('btnDownloadQrPng');
    if (btnDownloadQrPng) {
      btnDownloadQrPng.addEventListener('click', () => {
        QrView.downloadHighResPng(state, qrMode, (ok) => {
          if (ok) {
            ProfileCardUI.showToast('QR Code PNG (1024px) exporté');
          } else {
            ProfileCardUI.showToast('Erreur lors de la génération du QR Code');
          }
        });
      });
    }

    const btnCopyLink = document.getElementById('btnCopyLink');
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', async () => {
        const url = QrView.resolvePayload(state, 'url');
        try {
          await navigator.clipboard.writeText(url);
          const label = document.getElementById('copyLinkText');
          if (label) {
            const prev = label.textContent;
            label.textContent = 'Lien copié';
            setTimeout(() => (label.textContent = prev), 2000);
          }
          ProfileCardUI.showToast('Lien copié dans le presse-papiers');
        } catch {
          prompt('Copiez ce lien :', url);
        }
      });
    }

    const btnTestVcfEditor = document.getElementById('btnTestVcfEditor');
    if (btnTestVcfEditor) {
      btnTestVcfEditor.addEventListener('click', handleSaveContactAction);
    }

    const btnTogglePreviewMode = document.getElementById('btnTogglePreviewMode');
    const btnOpenFullPreview = document.getElementById('btnOpenFullPreview');
    const btnBackToEditor = document.getElementById('btnBackToEditor');

    if (btnTogglePreviewMode) {
      btnTogglePreviewMode.addEventListener('click', () => setViewMode(!isPublicScanView));
    }
    if (btnOpenFullPreview) {
      btnOpenFullPreview.addEventListener('click', () => setViewMode(true));
    }
    if (btnBackToEditor) {
      btnBackToEditor.addEventListener('click', () => {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        setViewMode(false);
      });
    }

    const btnSharePublic = document.getElementById('btnSharePublic');
    if (btnSharePublic) {
      btnSharePublic.addEventListener('click', async () => {
        const shareUrl = QrView.resolvePayload(state, 'url');
        const fullName = `${state.firstName || ''} ${state.lastName || ''}`.trim();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Carte de visite — ${fullName}`,
              text: `Coordonnées de ${fullName}`,
              url: shareUrl
            });
            return;
          } catch {
            // Fallback
          }
        }
        await navigator.clipboard.writeText(shareUrl);
        ProfileCardUI.showToast('Lien copié');
      });
    }

    const btnFillDemo = document.getElementById('btnFillDemo');
    if (btnFillDemo) {
      btnFillDemo.addEventListener('click', () => {
        state = { ...DEMO_DATA };
        populateForm();
        StorageService.saveDraft(state);
        scheduleBackendSave();
        renderAll();
        ProfileCardUI.showToast('Données par défaut chargées');
      });
    }

    const btnClearForm = document.getElementById('btnClearForm');
    if (btnClearForm) {
      btnClearForm.addEventListener('click', () => {
        state = {
          slug: 'contact',
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
          theme: 'obsidian',
          autoDownload: true,
          scans: 0
        };
        populateForm();
        StorageService.saveDraft(state);
        renderAll();
        ProfileCardUI.showToast('Formulaire vidé');
      });
    }

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnThemeTogglePublic = document.getElementById('btnThemeTogglePublic');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', StorageService.toggleTheme);
    if (btnThemeTogglePublic) btnThemeTogglePublic.addEventListener('click', StorageService.toggleTheme);
  }
})();
