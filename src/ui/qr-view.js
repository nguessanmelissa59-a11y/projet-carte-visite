window.VCardApp = window.VCardApp || {};

window.VCardApp.QrView = (function () {
  const { THEME_PALETTES } = window.VCardApp.Config;
  const { buildPublicUrl } = window.VCardApp.UrlCodec;
  const { generateVCardString } = window.VCardApp.VCardService;
  const ApiService = window.VCardApp.ApiService;

  let lastRenderedSignature = '';

  function resolvePayload(state, qrMode) {
    if (qrMode === 'vcard') {
      return generateVCardString(state, false);
    }
    if (ApiService && ApiService.isAvailable()) {
      return ApiService.getShortProfileUrl(state);
    }
    return buildPublicUrl(state, false);
  }

  function renderCanvas(state, qrMode, force = false) {
    const canvas = document.getElementById('qrCanvas');
    const urlDisplay = document.getElementById('generatedUrlDisplay');
    const sizeDisplay = document.getElementById('payloadSizeDisplay');
    const statusBadge = document.getElementById('qrStatusBadge');
    if (!canvas || !window.QRCode) return;

    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.obsidian;
    const payload = resolvePayload(state, qrMode);
    const signature = `${qrMode}|${state.theme}|${payload}`;

    if (!force && signature === lastRenderedSignature) {
      return;
    }
    lastRenderedSignature = signature;

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
          dark: palette.qrDark || '#18181b',
          light: '#ffffff'
        }
      },
      (err) => {
        if (!statusBadge) return;
        statusBadge.className = 'status-chip';
        if (err) {
          statusBadge.textContent = 'Trop long';
          statusBadge.dataset.state = 'offline';
        } else if (qrMode === 'vcard') {
          statusBadge.textContent = 'vCard Hors-ligne';
          delete statusBadge.dataset.state;
        } else if (ApiService && ApiService.isAvailable()) {
          statusBadge.textContent = 'QR Court (SQLite)';
          statusBadge.dataset.state = 'online';
        } else {
          statusBadge.textContent = 'Lien Autonome';
          delete statusBadge.dataset.state;
        }
      }
    );
  }

  function downloadHighResPng(state, qrMode, onResult) {
    if (!window.QRCode) return;
    const offscreen = document.createElement('canvas');
    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.obsidian;
    const payload = resolvePayload(state, qrMode);

    window.QRCode.toCanvas(
      offscreen,
      payload,
      {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: palette.qrDark || '#18181b',
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
