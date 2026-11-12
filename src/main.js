(function () {
  const { DEMO_DATA, FORM_FIELDS } = window.VCardApp.Config;
  const StorageService = window.VCardApp.StorageService;
  const UrlCodec = window.VCardApp.UrlCodec;
  const VCardService = window.VCardApp.VCardService;
  const QrView = window.VCardApp.QrView;
  const ProfileCardUI = window.VCardApp.ProfileCardUI;

  let state = { ...DEMO_DATA };
  let qrMode = 'url';
  let isPublicScanView = false;

  document.addEventListener('DOMContentLoaded', () => {
    StorageService.initTheme();
    checkLocalEnvironmentNotice();

    const urlPayload = UrlCodec.extractFromCurrentLocation();
    if (urlPayload) {
      state = { ...DEMO_DATA, ...urlPayload };
      populateForm();
      setViewMode(true);

      if (state.autoDownload) {
        setTimeout(() => {
          VCardService.downloadVCard(state);
        }, 1000);
      }
    } else {
      state = StorageService.loadDraft();
      populateForm();
      setViewMode(false);
    }

    bindEvents();
    renderAll();
  });

  function checkLocalEnvironmentNotice() {
    const notice = document.getElementById('localhostNotice');
    if (!notice) return;
    const host = window.location.hostname;
    const isLocal = window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1';
    if (isLocal) {
      notice.classList.remove('hidden');
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
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-600', 'dark:ring-offset-slate-900');
      } else {
        btn.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-600', 'dark:ring-offset-slate-900');
      }
    });

    const cardMarkup = ProfileCardUI.buildCardHtml(state);
    const mockupMount = document.getElementById('mockupProfileMount');
    const publicMount = document.getElementById('publicProfileMount');

    if (mockupMount) mockupMount.innerHTML = cardMarkup;
    if (publicMount) publicMount.innerHTML = cardMarkup;

    document.querySelectorAll('[data-action="save-vcard"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        VCardService.downloadVCard(state, (fileName) => {
          ProfileCardUI.showToast(`Fiche contact "${fileName}" générée`, 'contact');
        });
      });
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
        StorageService.saveDraft(state);
        renderAll();
      });
    }

    document.querySelectorAll('#themeColorPicker .theme-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.theme = btn.getAttribute('data-theme') || 'indigo';
        StorageService.saveDraft(state);
        renderAll();
      });
    });

    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
      photoUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        StorageService.resizeImageToBase64(file, 160, 160, 0.75, (b64) => {
          state.photoBase64 = b64;
          StorageService.saveDraft(state);
          renderAll();
          ProfileCardUI.showToast('Photo optimisée et ajoutée', 'check-circle-2');
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
        renderAll();
      });
    }

    const qrModeUrlBtn = document.getElementById('qrModeUrl');
    const qrModeVcardBtn = document.getElementById('qrModeVcard');
    if (qrModeUrlBtn && qrModeVcardBtn) {
      qrModeUrlBtn.addEventListener('click', () => {
        qrMode = 'url';
        qrModeUrlBtn.className = 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition';
        qrModeVcardBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
        QrView.renderCanvas(state, qrMode);
      });
      qrModeVcardBtn.addEventListener('click', () => {
        qrMode = 'vcard';
        qrModeVcardBtn.className = 'px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm transition';
        qrModeUrlBtn.className = 'px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
        QrView.renderCanvas(state, qrMode);
      });
    }

    const btnDownloadQrPng = document.getElementById('btnDownloadQrPng');
    if (btnDownloadQrPng) {
      btnDownloadQrPng.addEventListener('click', () => {
        QrView.downloadHighResPng(state, qrMode, (ok) => {
          if (ok) {
            ProfileCardUI.showToast('QR Code Haute Définition (1024px) téléchargé', 'download');
          } else {
            ProfileCardUI.showToast('Erreur lors de la génération HD', 'alert-circle');
          }
        });
      });
    }

    const btnCopyLink = document.getElementById('btnCopyLink');
    if (btnCopyLink) {
      btnCopyLink.addEventListener('click', async () => {
        const url = UrlCodec.buildPublicUrl(state, false);
        try {
          await navigator.clipboard.writeText(url);
          const label = document.getElementById('copyLinkText');
          if (label) {
            const prev = label.textContent;
            label.textContent = 'Lien copié';
            setTimeout(() => (label.textContent = prev), 2000);
          }
          ProfileCardUI.showToast('Lien du profil copié dans le presse-papiers', 'check');
        } catch {
          prompt('Copiez ce lien de profil :', url);
        }
      });
    }

    const btnTestVcfEditor = document.getElementById('btnTestVcfEditor');
    if (btnTestVcfEditor) {
      btnTestVcfEditor.addEventListener('click', () => {
        VCardService.downloadVCard(state, (fileName) => {
          ProfileCardUI.showToast(`Fiche contact "${fileName}" générée`, 'contact');
        });
      });
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
        const shareUrl = UrlCodec.buildPublicUrl(state, false);
        const fullName = `${state.firstName || ''} ${state.lastName || ''}`.trim();
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Carte de visite — ${fullName}`,
              text: `Coordonnées de ${fullName} (${state.jobTitle || ''})`,
              url: shareUrl
            });
            return;
          } catch {
            // Fallback to clipboard
          }
        }
        await navigator.clipboard.writeText(shareUrl);
        ProfileCardUI.showToast('Lien de la carte copié', 'share-2');
      });
    }

    const btnFillDemo = document.getElementById('btnFillDemo');
    if (btnFillDemo) {
      btnFillDemo.addEventListener('click', () => {
        state = { ...DEMO_DATA };
        populateForm();
        StorageService.saveDraft(state);
        renderAll();
        ProfileCardUI.showToast('Données d’exemple chargées', 'sparkles');
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
        populateForm();
        StorageService.saveDraft(state);
        renderAll();
        ProfileCardUI.showToast('Formulaire réinitialisé', 'rotate-ccw');
      });
    }

    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const btnThemeTogglePublic = document.getElementById('btnThemeTogglePublic');
    if (btnThemeToggle) btnThemeToggle.addEventListener('click', StorageService.toggleTheme);
    if (btnThemeTogglePublic) btnThemeTogglePublic.addEventListener('click', StorageService.toggleTheme);
  }
})();

