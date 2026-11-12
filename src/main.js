(function () {
  const { DEMO_DATA, FORM_FIELDS, CARD_TEMPLATES } = window.VCardApp.Config;
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
    const editSlugParam = searchParams.get('edit');
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
    renderCardTemplatePicker();
    setViewMode(isPublicScanView);
    bindEvents();
    renderAll(true);
    if (window.lucide) window.lucide.createIcons();

    if (urlPayload) {
      triggerAutoDownloadIfEnabled();
    }

    // Asynchronous non-blocking backend sync
    initBackendConnection(cardIdParam, isScanEvent, editSlugParam);
  });

  async function initBackendConnection(cardIdParam, isScanEvent, editSlugParam) {
    const backendStatus = await ApiService.checkBackend();
    updateBackendStatusUI(backendStatus);
    updateAuthChrome();

    if (!backendStatus.available) return;

    if (cardIdParam) {
      const serverCard = await ApiService.fetchCardBySlug(cardIdParam, isScanEvent);
      if (serverCard) {
        state = { ...DEMO_DATA, ...serverCard };
        populateForm();
        renderAll(true);
        triggerAutoDownloadIfEnabled();
      }
      return;
    }

    if (isPublicScanView) return;

    if (editSlugParam) {
      if (!ApiService.isAuthenticated()) {
        window.location.href = '/auth.html';
        return;
      }
      const serverCard = await ApiService.fetchCardBySlug(editSlugParam, false);
      if (serverCard) {
        if (serverCard.userId && serverCard.userId !== ApiService.getCurrentUser().id) {
          ProfileCardUI.showToast('Cette carte appartient à un autre compte');
        } else {
          state = { ...DEMO_DATA, ...serverCard };
          populateForm();
        }
      }
      renderAll(true);
      return;
    }

    if (ApiService.isAuthenticated()) {
      const myCards = await ApiService.fetchMyCards();
      if (myCards.length) {
        const preferred =
          myCards.find((card) => card.slug === state.slug) || myCards[0];
        const serverCard = await ApiService.fetchCardBySlug(preferred.slug, false);
        if (serverCard) {
          state = { ...DEMO_DATA, ...serverCard };
          populateForm();
        }
      }
      renderAll(true);
      return;
    }

    renderAll(true);
  }

  function updateAuthChrome() {
    const user = ApiService.getCurrentUser();
    const accountLabel = document.getElementById('accountLinkLabel');
    const authHint = document.getElementById('authSaveHint');
    if (accountLabel) {
      accountLabel.textContent = user
        ? user.firstName || user.email.split('@')[0]
        : 'Connexion';
    }
    if (authHint) {
      authHint.classList.toggle('hidden', Boolean(user) || !ApiService.isAvailable());
    }
  }

  async function saveCardToServer() {
    StorageService.saveDraft(state);
    if (!ApiService.isAvailable()) {
      ProfileCardUI.showToast('Brouillon enregistré sur cet appareil');
      return;
    }
    if (!ApiService.isAuthenticated()) {
      ProfileCardUI.showToast('Connectez-vous pour enregistrer votre carte');
      window.location.href = '/auth.html';
      return;
    }
    try {
      const saved = await ApiService.saveCard(state);
      if (saved) {
        state.slug = saved.slug;
        state.scans = saved.scans;
        populateForm();
        renderAll(true);
        ProfileCardUI.showToast('Carte enregistrée. Vous pouvez partager le QR.');
      }
    } catch (err) {
      ProfileCardUI.showToast(err.message || 'Enregistrement impossible');
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
    const exporter = CardCanvasExporter || window.VCardApp.CardCanvasExporter;
    if (!exporter) {
      ProfileCardUI.showToast('Générateur de carte non disponible');
      return;
    }
    ProfileCardUI.showToast('Génération de la carte de visite virtuelle...');
    exporter.downloadCardImage(state, qrMode, (ok, fileName) => {
      if (ok) {
        ProfileCardUI.showToast(`Carte virtuelle téléchargée (${fileName})`);
      } else {
        ProfileCardUI.showToast('Erreur lors de la génération de la carte');
      }
    });
  }

  function updateVirtualCardPreview() {
    const cardCanvas = document.getElementById('virtualCardPreviewCanvas');
    const exporter = CardCanvasExporter || window.VCardApp.CardCanvasExporter;
    if (!cardCanvas || !exporter) return;
    exporter.renderCardToCanvas(cardCanvas, state, qrMode);
  }

  function renderCardTemplatePicker() {
    const mount = document.getElementById('cardTemplatePicker');
    if (!mount || !CARD_TEMPLATES) return;

    const activeId = state.cardTemplate || 'editorial';
    mount.innerHTML = Object.values(CARD_TEMPLATES)
      .map((tpl) => {
        const swatches = (tpl.swatch || [])
          .map((color) => `<span style="background:${ProfileCardUI.escapeHtml(color)}"></span>`)
          .join('');
        const activeClass = tpl.id === activeId ? ' is-active' : '';
        return `
          <button type="button" class="card-template-option${activeClass}" data-card-template="${ProfileCardUI.escapeHtml(tpl.id)}" role="option" aria-selected="${tpl.id === activeId}">
            <span class="card-template-swatches" aria-hidden="true">${swatches}</span>
            <span class="card-template-meta">
              <strong>${ProfileCardUI.escapeHtml(tpl.label)}</strong>
              <span>${ProfileCardUI.escapeHtml(tpl.blurb)}</span>
            </span>
          </button>
        `;
      })
      .join('');
  }

  function setCardTemplate(templateId) {
    const nextId =
      templateId && CARD_TEMPLATES && CARD_TEMPLATES[templateId] ? templateId : 'editorial';
    state.cardTemplate = nextId;
    renderCardTemplatePicker();
    updateVirtualCardPreview();
    schedulePersistence();
  }

  function updateBackendStatusUI(backendStatus) {
    const modeIndicator = document.getElementById('backendStatusLabel');
    const scanCounterWrap = document.getElementById('scanCounterWrap');

    if (backendStatus.available) {
      if (modeIndicator) {
        modeIndicator.textContent = 'Prêt';
        modeIndicator.className = 'status-chip';
        modeIndicator.dataset.state = 'online';
      }
      if (scanCounterWrap) scanCounterWrap.classList.remove('hidden');
    } else {
      if (modeIndicator) {
        modeIndicator.textContent = 'Hors ligne';
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

    if (!ApiService.isAvailable() || !ApiService.isAuthenticated()) return;
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

    const btnRemoveQrLogo = document.getElementById('btnRemoveQrLogo');
    if (btnRemoveQrLogo) {
      const hasQrLogo = Boolean(state.qrLogoBase64 || state.qrLogoUrl);
      btnRemoveQrLogo.classList.toggle('hidden', !hasQrLogo);
    }

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

    if (!isPublicScanView && previewTab === 'card') {
      updateVirtualCardPreview();
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

        if (target.name === 'qrLogoUrl') {
          const url = String(target.value || '').trim();
          if (url && !/^https?:\/\//i.test(url)) {
            ProfileCardUI.showToast('URL logo : http(s) uniquement');
          } else if (url) {
            state.qrLogoBase64 = '';
            const upload = document.getElementById('qrLogoUpload');
            if (upload) upload.value = '';
          }
        }

        scheduleRender();
        schedulePersistence();
      });
    }

    const btnSaveServer = document.getElementById('btnSaveServer');
    if (btnSaveServer) {
      btnSaveServer.addEventListener('click', () => {
        saveCardToServer();
      });
    }
    const btnSaveServerBottom = document.getElementById('btnSaveServerBottom');
    if (btnSaveServerBottom) {
      btnSaveServerBottom.addEventListener('click', () => {
        saveCardToServer();
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

    const qrLogoUpload = document.getElementById('qrLogoUpload');
    if (qrLogoUpload) {
      qrLogoUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(file.type)) {
          ProfileCardUI.showToast('Format logo non supporté');
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          ProfileCardUI.showToast('Logo trop volumineux (max 2 Mo)');
          return;
        }

        const applyLogo = (b64) => {
          if (!b64 || !/^data:image\//i.test(b64)) {
            ProfileCardUI.showToast('Impossible de lire le logo');
            return;
          }
          state.qrLogoBase64 = b64;
          state.qrLogoUrl = '';
          const qrLogoUrlInput = document.getElementById('qrLogoUrl');
          if (qrLogoUrlInput) qrLogoUrlInput.value = '';
          renderAll(true);
          schedulePersistence();
          ProfileCardUI.showToast('Logo QR appliqué');
        };

        if (/svg\+xml/i.test(file.type)) {
          const reader = new FileReader();
          reader.onload = () => applyLogo(String(reader.result || ''));
          reader.onerror = () => ProfileCardUI.showToast('Impossible de lire le logo');
          reader.readAsDataURL(file);
          return;
        }

        StorageService.resizeImageToBase64(file, 160, 160, 0.85, applyLogo);
      });
    }

    const btnRemoveQrLogo = document.getElementById('btnRemoveQrLogo');
    if (btnRemoveQrLogo) {
      btnRemoveQrLogo.addEventListener('click', () => {
        state.qrLogoBase64 = '';
        state.qrLogoUrl = '';
        const qrLogoUrlInput = document.getElementById('qrLogoUrl');
        const qrLogoUploadInput = document.getElementById('qrLogoUpload');
        if (qrLogoUrlInput) qrLogoUrlInput.value = '';
        if (qrLogoUploadInput) qrLogoUploadInput.value = '';
        renderAll(true);
        schedulePersistence();
        ProfileCardUI.showToast('Logo QR retiré');
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

    const tabPreviewMobile = document.getElementById('tabPreviewMobile');
    const tabPreviewCard = document.getElementById('tabPreviewCard');
    const previewMobileContainer = document.getElementById('previewMobileContainer');
    const previewCardContainer = document.getElementById('previewCardContainer');
    const btnDownloadFromCardPreview = document.getElementById('btnDownloadFromCardPreview');

    if (btnDownloadFromCardPreview) {
      btnDownloadFromCardPreview.addEventListener('click', handleDownloadCardImage);
    }

    const cardTemplatePicker = document.getElementById('cardTemplatePicker');
    if (cardTemplatePicker) {
      cardTemplatePicker.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-card-template]');
        if (!btn) return;
        setCardTemplate(btn.getAttribute('data-card-template'));
      });
    }

    if (tabPreviewMobile && tabPreviewCard) {
      tabPreviewMobile.addEventListener('click', () => {
        previewTab = 'mobile';
        tabPreviewMobile.classList.add('is-active');
        tabPreviewCard.classList.remove('is-active');
        if (previewMobileContainer) previewMobileContainer.classList.remove('hidden');
        if (previewCardContainer) previewCardContainer.classList.add('hidden');
      });

      tabPreviewCard.addEventListener('click', () => {
        previewTab = 'card';
        tabPreviewCard.classList.add('is-active');
        tabPreviewMobile.classList.remove('is-active');
        if (previewMobileContainer) previewMobileContainer.classList.remove('hidden');
        if (previewCardContainer) previewCardContainer.classList.remove('hidden');
        updateVirtualCardPreview();
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
        renderCardTemplatePicker();
        renderAll(true);
        schedulePersistence();
        ProfileCardUI.showToast('Exemple chargé');
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
          qrLogoUrl: '',
          qrLogoBase64: '',
          theme: 'obsidian',
          cardTemplate: 'editorial',
          autoDownload: true,
          scans: 0
        };
        populateForm();
        renderCardTemplatePicker();
        renderAll(true);
        schedulePersistence();
        ProfileCardUI.showToast('Formulaire réinitialisé');
      });
    }

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnThemeTogglePublic = document.getElementById('btnThemeTogglePublic');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', StorageService.toggleTheme);
    if (btnThemeTogglePublic) btnThemeTogglePublic.addEventListener('click', StorageService.toggleTheme);
  }
})();
