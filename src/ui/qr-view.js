window.VCardApp = window.VCardApp || {};

window.VCardApp.QrView = (function () {
  const { THEME_PALETTES } = window.VCardApp.Config;
  const { buildPublicUrl } = window.VCardApp.UrlCodec;
  const { generateVCardString } = window.VCardApp.VCardService;
  const ApiService = window.VCardApp.ApiService;

  function resolvePayload(state, qrMode) {
    if (qrMode === 'vcard') {
      return generateVCardString(state, false);
    }
    if (ApiService && ApiService.isAvailable()) {
      return ApiService.getShortProfileUrl(state);
    }
    return buildPublicUrl(state, false);
  }

  function renderCanvas(state, qrMode) {
    const canvas = document.getElementById('qrCanvas');
    const urlDisplay = document.getElementById('generatedUrlDisplay');
    const sizeDisplay = document.getElementById('payloadSizeDisplay');
    const statusBadge = document.getElementById('qrStatusBadge');
    if (!canvas || !window.QRCode) return;

    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.indigo;
    const payload = resolvePayload(state, qrMode);

    if (urlDisplay) {
      urlDisplay.textContent = qrMode === 'vcard' ? 'Mode vCard 3.0 Direct (Hors-ligne)' : payload;
    }

    const byteLength = new Blob([payload]).size;
    if (sizeDisplay) {
      sizeDisplay.textContent = `${byteLength} octets`;
    }

    window.QRCode.toCanvas(
      canvas,
      payload,
      {
        width: 240,
        margin: 1,
        errorCorrectionLevel: byteLength > 600 ? 'L' : 'M',
        color: {
          dark: palette.qrDark || '#0f172a',
          light: '#ffffff'
        }
      },
      (err) => {
        if (!statusBadge) return;
        if (err) {
          statusBadge.textContent = 'Trop long';
          statusBadge.className = 'px-2 py-0.5 text-[11px] rounded-full font-semibold bg-rose-500/10 text-rose-600';
        } else if (qrMode === 'vcard') {
          statusBadge.textContent = 'vCard Direct';
          statusBadge.className = 'px-2 py-0.5 text-[11px] rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        } else if (ApiService && ApiService.isAvailable()) {
          statusBadge.textContent = 'QR Court (Backend)';
          statusBadge.className = 'px-2 py-0.5 text-[11px] rounded-full font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
        } else {
          statusBadge.textContent = 'Lien Autonome';
          statusBadge.className = 'px-2 py-0.5 text-[11px] rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        }
      }
    );
  }

  function downloadHighResPng(state, qrMode, onResult) {
    if (!window.QRCode) return;
    const offscreen = document.createElement('canvas');
    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.indigo;
    const payload = resolvePayload(state, qrMode);

    window.QRCode.toCanvas(
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
          if (onResult) onResult(false);
          return;
        }
        const safeName = `${state.firstName || 'Carte'}_${state.lastName || 'Visite'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const link = document.createElement('a');
        link.download = `QR_${safeName}.png`;
        link.href = offscreen.toDataURL('image/png');
        link.click();
        if (onResult) onResult(true);
      }
    );
  }

  return {
    resolvePayload,
    renderCanvas,
    downloadHighResPng
  };
})();
