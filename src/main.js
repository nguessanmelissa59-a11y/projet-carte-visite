(function () {
  const { DEMO_DATA, FORM_FIELDS, CARD_TEMPLATES } = window.VCardApp.Config;
  const FieldValidation = window.VCardApp.FieldValidation;
  const StorageService = window.VCardApp.StorageService;
  const UrlCodec = window.VCardApp.UrlCodec;
  const VCardService = window.VCardApp.VCardService;
  const ApiService = window.VCardApp.ApiService;
  const QrView = window.VCardApp.QrView;
  const ProfileCardUI = window.VCardApp.ProfileCardUI;
  const CardCanvasExporter = window.VCardApp.CardCanvasExporter;
  const LookupCombobox = window.VCardApp.LookupCombobox;

  let state = { ...DEMO_DATA };
  let qrMode = 'url';
  let isPublicScanView = false;
  let previewTab = 'mobile';
  let saveTimeout = null;
  let draftTimeout = null;
  let rafPending = false;
  let jobTitleCombo = null;
  let organizationCombo = null;

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
        window.location.href = '/auth';
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
        : 'Se connecter';
    }
    if (authHint) {
      authHint.classList.toggle('hidden', Boolean(user) || !ApiService.isAvailable());
    }
  }

  function syncStateFromFormField(target) {
    if (!target || !target.name) return;
    let value = target.type === 'checkbox' ? target.checked : target.value;
    if (FieldValidation) {
      if (target.name === 'phone' || target.name === 'whatsapp') {
        value = FieldValidation.sanitizePhoneInput(value);
        if (target.value !== value) target.value = value;
      }
      if (target.name === 'email' && typeof value === 'string' && value) {
        value = FieldValidation.normalizeEmail(value);
        if (target.value !== value) target.value = value;
      }
      FieldValidation.validateField(target);
    }
    state[target.name] = value;
  }

  function ensureFormFieldsValid(showToast) {
    const form = document.getElementById('vcardForm');
    if (!FieldValidation || !form) return true;
    const result = FieldValidation.validateForm(form);
    if (!result.ok) {
      if (result.firstInvalid) {
        result.firstInvalid.focus();
        result.firstInvalid.reportValidity();
      }
      if (showToast) {
        ProfileCardUI.showToast('Corrigez les champs invalides avant d’enregistrer');
      }
      return false;
    }
    FORM_FIELDS.forEach((field) => {
      const el = document.getElementById(field);
      if (el) state[field] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return true;
  }

  async function saveCardToServer() {
    if (!ensureFormFieldsValid(true)) return;
    StorageService.saveDraft(state);
    if (!ApiService.isAvailable()) {
      ProfileCardUI.showToast('Brouillon enregistré sur cet appareil');
      return;
    }
    if (!ApiService.isAuthenticated()) {
      ProfileCardUI.showToast('Connectez-vous pour enregistrer votre carte');
      window.location.href = '/auth';
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

  let printPreviewReady = false;

  function getCardExporter() {
    return CardCanvasExporter || window.VCardApp.CardCanvasExporter || null;
  }

  function confirmDownloadCardPdf() {
    const exporter = getCardExporter();
    if (!exporter) {
      ProfileCardUI.showToast('Générateur de carte non disponible');
      return;
    }
    if (!printPreviewReady) {
      openPrintPreview({ focusDownload: true });
      ProfileCardUI.showToast('Vérifiez d’abord le recto et le verso');
      return;
    }
    ProfileCardUI.showToast('Préparation du PDF recto + verso (85×55 mm)...');
    exporter.downloadCardImage(state, qrMode, (ok, fileName) => {
      if (ok) {
        ProfileCardUI.showToast(`PDF recto + verso prêt (${fileName})`);
        closePrintPreview();
      } else {
        ProfileCardUI.showToast('Erreur lors de la génération du PDF imprimable');
      }
    });
  }

  function updateVirtualCardPreview() {
    const exporter = getCardExporter();
    if (!exporter) return;
    const rectoCanvas = document.getElementById('virtualCardPreviewCanvas');
    const versoCanvas = document.getElementById('virtualCardVersoCanvas');
    const jobs = [];
    if (rectoCanvas) jobs.push(exporter.renderCardToCanvas(rectoCanvas, state, qrMode));
    if (versoCanvas && typeof exporter.renderVersoToCanvas === 'function') {
      jobs.push(exporter.renderVersoToCanvas(versoCanvas, state, qrMode));
    }
    Promise.all(jobs)
      .then(() => {
        if (rectoCanvas && versoCanvas) printPreviewReady = true;
      })
      .catch(() => {
        printPreviewReady = false;
      });
  }

  async function renderPrintPreviewCanvases() {
    const exporter = getCardExporter();
    if (!exporter) return false;
    const rectoCanvas = document.getElementById('printPreviewRectoCanvas');
    const versoCanvas = document.getElementById('printPreviewVersoCanvas');
    try {
      if (rectoCanvas) await exporter.renderCardToCanvas(rectoCanvas, state, qrMode);
      if (versoCanvas && typeof exporter.renderVersoToCanvas === 'function') {
        await exporter.renderVersoToCanvas(versoCanvas, state, qrMode);
      }
      printPreviewReady = true;
      return true;
    } catch (err) {
      console.error('Erreur aperçu impression:', err);
      printPreviewReady = false;
      return false;
    }
  }

  function openPrintPreview(options) {
    const opts = options || {};
    const dialog = document.getElementById('printPreviewDialog');
    if (!dialog) {
      confirmDownloadCardPdf();
      return;
    }

    const tabPreviewCard = document.getElementById('tabPreviewCard');
    if (tabPreviewCard && !isPublicScanView) {
      tabPreviewCard.click();
    }

    dialog.hidden = false;
    dialog.classList.remove('hidden');
    document.body.classList.add('print-preview-open');
    printPreviewReady = false;

    renderPrintPreviewCanvases().then((ok) => {
      if (!ok) {
        ProfileCardUI.showToast('Impossible de préparer l’aperçu');
        return;
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      if (opts.focusDownload) {
        const confirmBtn = document.getElementById('btnConfirmPrintDownload');
        if (confirmBtn) confirmBtn.focus();
      }
    });
  }

  function closePrintPreview() {
    const dialog = document.getElementById('printPreviewDialog');
    if (!dialog) return;
    dialog.hidden = true;
    dialog.classList.add('hidden');
    document.body.classList.remove('print-preview-open');
  }

  /** Ancien nom : ouvre l’aperçu obligatoire avant téléchargement. */
  function handleDownloadCardImage() {
    openPrintPreview({ focusDownload: true });
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
    if (FieldValidation) FieldValidation.sanitizePhoneFields(state);
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
    const themeKey = state.theme || 'forest';

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

  async function copyTextToClipboard(text) {
    const value = String(text || '');
    if (!value) return false;

    if (
      window.isSecureContext &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }

  async function sharePublicProfile() {
    const shareUrl = QrView.resolvePayload(state, 'url');
    if (!shareUrl) {
      ProfileCardUI.showToast('Lien de partage indisponible');
      return;
    }

    const fullName = `${state.firstName || ''} ${state.lastName || ''}`.trim() || 'Contact';
    const shareData = {
      title: `Carte de visite — ${fullName}`,
      text: `Coordonnées de ${fullName}`,
      url: shareUrl
    };

    if (typeof navigator.share === 'function') {
      try {
        const canShare =
          typeof navigator.canShare !== 'function' || navigator.canShare(shareData);
        if (canShare) {
          await navigator.share(shareData);
          ProfileCardUI.showToast('Fiche partagée');
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    try {
      const copied = await copyTextToClipboard(shareUrl);
      if (copied) {
        ProfileCardUI.showToast('Lien copié');
        return;
      }
    } catch {
      // prompt fallback below
    }

    window.prompt('Copiez ce lien :', shareUrl);
    ProfileCardUI.showToast('Lien prêt à copier');
  }

  function bindEvents() {
    const form = document.getElementById('vcardForm');
    if (form) {
      if (FieldValidation) FieldValidation.applyLimits(form);

      form.addEventListener('input', (e) => {
        const target = e.target;
        if (!target.name) return;
        syncStateFromFormField(target);

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

      form.addEventListener('blur', (e) => {
        const target = e.target;
        if (!target || !target.name || !FieldValidation) return;
        syncStateFromFormField(target);
      }, true);

      ['phone', 'whatsapp'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('keydown', (e) => {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          const allowedKeys = [
            'Backspace',
            'Delete',
            'Tab',
            'Escape',
            'Enter',
            'ArrowLeft',
            'ArrowRight',
            'ArrowUp',
            'ArrowDown',
            'Home',
            'End'
          ];
          if (allowedKeys.includes(e.key)) return;
          if (e.key.length === 1 && /[A-Za-z]/.test(e.key)) {
            e.preventDefault();
          }
        });
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
        state.theme = btn.getAttribute('data-theme') || 'forest';
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
    const btnSwitchToVcard = document.getElementById('btnSwitchToVcard');

    function setQrMode(nextMode) {
      qrMode = nextMode === 'vcard' ? 'vcard' : 'url';
      if (qrModeUrlBtn && qrModeVcardBtn) {
        qrModeUrlBtn.classList.toggle('is-active', qrMode === 'url');
        qrModeVcardBtn.classList.toggle('is-active', qrMode === 'vcard');
      }
      QrView.renderCanvas(state, qrMode, true);
      if (window.lucide) window.lucide.createIcons();
    }

    if (qrModeUrlBtn && qrModeVcardBtn) {
      qrModeUrlBtn.addEventListener('click', () => setQrMode('url'));
      qrModeVcardBtn.addEventListener('click', () => setQrMode('vcard'));
    }
    if (btnSwitchToVcard) {
      btnSwitchToVcard.addEventListener('click', () => setQrMode('vcard'));
    }

    const btnDownloadCardPng = document.getElementById('btnDownloadCardPng');
    if (btnDownloadCardPng) {
      btnDownloadCardPng.addEventListener('click', () => openPrintPreview({ focusDownload: true }));
    }

    const btnDownloadCardPublic = document.getElementById('btnDownloadCardPublic');
    if (btnDownloadCardPublic) {
      btnDownloadCardPublic.addEventListener('click', () => openPrintPreview({ focusDownload: true }));
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
          const copied = await copyTextToClipboard(url);
          if (!copied) throw new Error('copy-failed');
          const label = document.getElementById('copyLinkText');
          if (label) {
            const prev = label.textContent;
            label.textContent = 'Lien copié';
            setTimeout(() => (label.textContent = prev), 2000);
          }
          ProfileCardUI.showToast('Lien copié dans le presse-papiers');
        } catch {
          window.prompt('Copiez ce lien :', url);
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
      btnDownloadFromCardPreview.addEventListener('click', () => {
        updateVirtualCardPreview();
        openPrintPreview({ focusDownload: true });
      });
    }

    const printPreviewDialog = document.getElementById('printPreviewDialog');
    if (printPreviewDialog) {
      printPreviewDialog.addEventListener('click', (e) => {
        const closer = e.target.closest('[data-print-preview-close]');
        if (closer) closePrintPreview();
      });
    }

    const btnConfirmPrintDownload = document.getElementById('btnConfirmPrintDownload');
    if (btnConfirmPrintDownload) {
      btnConfirmPrintDownload.addEventListener('click', confirmDownloadCardPdf);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const dialog = document.getElementById('printPreviewDialog');
      if (dialog && !dialog.hidden) closePrintPreview();
    });

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

    if (LookupCombobox && typeof LookupCombobox.mount === 'function') {
      jobTitleCombo = LookupCombobox.mount({
        inputId: 'jobTitle',
        kind: 'job-titles',
        labelCreate: 'Créer le poste',
        onChange(value) {
          state.jobTitle = String(value || '').trim().slice(0, 120);
          scheduleRender();
          schedulePersistence();
        }
      });
      organizationCombo = LookupCombobox.mount({
        inputId: 'organization',
        kind: 'organizations',
        labelCreate: 'Créer l’entreprise',
        onChange(value) {
          state.organization = String(value || '').trim().slice(0, 120);
          scheduleRender();
          schedulePersistence();
        }
      });
    }

    const btnSharePublic = document.getElementById('btnSharePublic');
    if (btnSharePublic) {
      btnSharePublic.addEventListener('click', () => {
        sharePublicProfile().catch(() => {
          ProfileCardUI.showToast('Partage impossible');
        });
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

    const clearForm = () => {
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
        theme: 'forest',
        cardTemplate: 'editorial',
        autoDownload: true,
        scans: 0
      };
      populateForm();
      renderCardTemplatePicker();
      renderAll(true);
      schedulePersistence();
      ProfileCardUI.showToast('Formulaire réinitialisé');
    };
    ['btnClearForm', 'btnClearFormMobile'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', clearForm);
    });

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnThemeTogglePublic = document.getElementById('btnThemeTogglePublic');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', StorageService.toggleTheme);
    if (btnThemeTogglePublic) btnThemeTogglePublic.addEventListener('click', StorageService.toggleTheme);
  }
})();
