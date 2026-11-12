(function () {
  const { DEMO_DATA, FORM_FIELDS } = window.VCardApp.Config;
  const StorageService = window.VCardApp.StorageService;
  const UrlCodec = window.VCardApp.UrlCodec;
  const VCardService = window.VCardApp.VCardService;
  const ApiService = window.VCardApp.ApiService;
  const QrView = window.VCardApp.QrView;
  const ProfileCardUI = window.VCardApp.ProfileCardUI;
  const CardCanvasExporter = window.VCardApp.CardCanvasExporter;

  let state = { ...DEMO_DATA };
  let qrMode = 'url';
  let isPublicScanView = false;
  let previewTab = 'mobile';
  let saveTimeout = null;
  let draftTimeout = null;
  let rafPending = false;

  document.addEventListener('DOMContentLoaded', () => {
    StorageService.initTheme();

    const searchParams = new URLSearchParams(window.location.search);
    const cardIdParam = searchParams.get('id');
    const isScanEvent = searchParams.get('scan') === '1';
    const urlPayload = UrlCodec.extractFromCurrentLocation();

    if (urlPayload) {
      state = { ...DEMO_DATA, ...urlPayload };
      isPublicScanView = true;
    } else if (cardIdParam) {
      state = StorageService.loadDraft();
      isPublicScanView = true;
    } else {
      state = StorageService.loadDraft();
      isPublicScanView = false;
    }

    // Immediate synchronous render (0ms wait)
    populateForm();
    setViewMode(isPublicScanView);
    bindEvents();
    renderAll(true);
    if (window.lucide) window.lucide.createIcons();

    if (urlPayload) {
      triggerAutoDownloadIfEnabled();
    }

    // Asynchronous non-blocking backend sync
    initBackendConnection(cardIdParam, isScanEvent);
  });

  async function initBackendConnection(cardIdParam, isScanEvent) {
    const backendStatus = await ApiService.checkBackend();
    updateBackendStatusUI(backendStatus);

    if (!backendStatus.available) return;

    if (cardIdParam) {
      const serverCard = await ApiService.fetchCardBySlug(cardIdParam, isScanEvent);
      if (serverCard) {
        state = { ...DEMO_DATA, ...serverCard };
        populateForm();
        renderAll(true);
        triggerAutoDownloadIfEnabled();
      }
    } else if (!isPublicScanView) {
      const existing = await ApiService.fetchCardBySlug(state.slug || 'koffi-kouadio', false);
      if (existing) {
        state = { ...state, ...existing };
        populateForm();
      } else {
        await ApiService.saveCard(state);
      }
      renderAll(true);
    }
  }

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

  function handleDownloadCardImage() {
    if (!CardCanvasExporter) return;
    ProfileCardUI.showToast('Génération de la carte de visite en cours...');
    CardCanvasExporter.downloadCardImage(state, qrMode, (ok, fileName) => {
      if (ok) {
        ProfileCardUI.showToast(`Carte de visite téléchargée (${fileName})`);
      } else {
        ProfileCardUI.showToast('Erreur lors de la génération de la carte');
      }
    });
  }

  function updateBackendStatusUI(backendStatus) {
    const modeIndicator = document.getElementById('backendStatusLabel');
    const scanCounterWrap = document.getElementById('scanCounterWrap');

    if (backendStatus.available) {
      if (modeIndicator) {
        modeIndicator.textContent = 'Serveur SQLite actif';
        modeIndicator.className = 'status-chip';
        modeIndicator.dataset.state = 'online';
      }
      if (scanCounterWrap) scanCounterWrap.classList.remove('hidden');
    } else {
      if (modeIndicator) {
        modeIndicator.textContent = 'Mode statique autonome';
        modeIndicator.className = 'status-chip';
        modeIndicator.dataset.state = 'offline';
      }
    }
  }

  function schedulePersistence() {
    if (draftTimeout) clearTimeout(draftTimeout);
    draftTimeout = setTimeout(() => {
      StorageService.saveDraft(state);
      QrView.renderCanvas(state, qrMode);
    }, 120);

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
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      if (editorHeader) editorHeader.classList.remove('hidden');
      if (editorView) editorView.classList.remove('hidden');
      if (publicView) publicView.classList.add('hidden');
    }
    renderAll(false);
  }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      renderAll(false);
    });
  }

  function renderAll(forceQr = false) {
    const editorAvatar = document.getElementById('editorAvatarPreview');
    const btnRemovePhoto = document.getElementById('btnRemovePhoto');
    const themeKey = state.theme || 'obsidian';

    document.documentElement.dataset.cardTheme = themeKey;

    if (editorAvatar && !isPublicScanView) {
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
      btn.classList.toggle('is-active', t === themeKey);
    });

    updateScanCountBadge();

    // Only update the currently visible card mount for maximum speed
    const activeMount = document.getElementById(isPublicScanView ? 'publicProfileMount' : 'mockupProfileMount');
    if (activeMount) {
      activeMount.innerHTML = ProfileCardUI.buildCardHtml(state);
      const saveBtn = activeMount.querySelector('[data-action="save-vcard"]');
      if (saveBtn) {
        saveBtn.addEventListener('click', handleSaveContactAction);
      }
      const cardDownloadBtn = activeMount.querySelector('[data-action="download-card-image"]');
      if (cardDownloadBtn) {
        cardDownloadBtn.addEventListener('click', handleDownloadCardImage);
      }
      if (window.lucide) {
        window.lucide.createIcons({ root: activeMount });
      }
    }

    if (forceQr) {
      QrView.renderCanvas(state, qrMode, true);
    }
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

        scheduleRender();
        schedulePersistence();
      });
    }

    const btnSaveServer = document.getElementById('btnSaveServer');
    if (btnSaveServer) {
      btnSaveServer.addEventListener('click', async () => {
        StorageService.saveDraft(state);
        if (!ApiService.isAvailable()) {
          ProfileCardUI.showToast('Brouillon enregistré localement');
          return;
        }
        try {
          const saved = await ApiService.saveCard(state);
          if (saved) {
            state.slug = saved.slug;
            state.scans = saved.scans;
            populateForm();
            renderAll(true);
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
        renderAll(true);
        schedulePersistence();
      });
    });

    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
      photoUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        StorageService.resizeImageToBase64(file, 180, 180, 0.8, (b64) => {
          state.photoBase64 = b64;
          renderAll(true);
          schedulePersistence();
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
        renderAll(true);
        schedulePersistence();
      });
    }

    const qrModeUrlBtn = document.getElementById('qrModeUrl');
    const qrModeVcardBtn = document.getElementById('qrModeVcard');
    if (qrModeUrlBtn && qrModeVcardBtn) {
      qrModeUrlBtn.addEventListener('click', () => {
        qrMode = 'url';
        qrModeUrlBtn.classList.add('is-active');
        qrModeVcardBtn.classList.remove('is-active');
        QrView.renderCanvas(state, qrMode, true);
      });
      qrModeVcardBtn.addEventListener('click', () => {
        qrMode = 'vcard';
        qrModeVcardBtn.classList.add('is-active');
        qrModeUrlBtn.classList.remove('is-active');
        QrView.renderCanvas(state, qrMode, true);
      });
    }

    const btnDownloadCardPng = document.getElementById('btnDownloadCardPng');
    if (btnDownloadCardPng) {
      btnDownloadCardPng.addEventListener('click', handleDownloadCardImage);
    }

    const btnDownloadCardPublic = document.getElementById('btnDownloadCardPublic');
    if (btnDownloadCardPublic) {
      btnDownloadCardPublic.addEventListener('click', handleDownloadCardImage);
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
        renderAll(true);
        schedulePersistence();
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
        renderAll(true);
        schedulePersistence();
        ProfileCardUI.showToast('Formulaire vidé');
      });
    }

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnThemeTogglePublic = document.getElementById('btnThemeTogglePublic');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', StorageService.toggleTheme);
    if (btnThemeTogglePublic) btnThemeTogglePublic.addEventListener('click', StorageService.toggleTheme);
  }
})();
