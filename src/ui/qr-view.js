window.VCardApp = window.VCardApp || {};

window.VCardApp.QrView = (function () {
  const { THEME_PALETTES } = window.VCardApp.Config;
  const { buildPublicUrl } = window.VCardApp.UrlCodec;
  const { generateVCardString } = window.VCardApp.VCardService;
  const ApiService = window.VCardApp.ApiService;

  const LOGO_RATIO = 0.18;
  const LOGO_PAD_RATIO = 0.08;

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

  function getLogoSrc(state) {
    const base64 = (state && state.qrLogoBase64) || '';
    const url = (state && state.qrLogoUrl) || '';
    if (base64 && /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(base64)) {
      return base64;
    }
    if (url && /^https?:\/\//i.test(url.trim())) {
      return url.trim();
    }
    return '';
  }

  function logoSignature(state) {
    const src = getLogoSrc(state);
    if (!src) return 'none';
    return src.slice(0, 64);
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  async function overlayLogo(canvas, logoSrc) {
    if (!canvas || !logoSrc) return false;
    const img = await loadImage(logoSrc);
    if (!img) return false;

    const ctx = canvas.getContext('2d');
    const size = Math.min(canvas.width, canvas.height);
    const logoSize = Math.round(size * LOGO_RATIO);
    const pad = Math.round(logoSize * LOGO_PAD_RATIO);
    const box = logoSize + pad * 2;
    const x = Math.round((canvas.width - box) / 2);
    const y = Math.round((canvas.height - box) / 2);
    const radius = Math.max(6, Math.round(box * 0.16));

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, x, y, box, box, radius);
    ctx.fill();

    ctx.save();
    drawRoundedRect(ctx, x + pad, y + pad, logoSize, logoSize, Math.max(4, Math.round(radius * 0.7)));
    ctx.clip();
    ctx.drawImage(img, x + pad, y + pad, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = 'rgba(24, 24, 27, 0.12)';
    ctx.lineWidth = Math.max(1, Math.round(size * 0.004));
    drawRoundedRect(ctx, x, y, box, box, radius);
    ctx.stroke();

    return true;
  }

  function resolveErrorCorrection(byteLength, hasLogo) {
    if (hasLogo) return 'H';
    return byteLength > 600 ? 'L' : 'M';
  }

  function paintQrToCanvas(targetCanvas, payload, options) {
    const opts = options || {};
    return new Promise((resolve) => {
      if (!targetCanvas || !window.QRCode || typeof window.QRCode.toCanvas !== 'function') {
        resolve({ ok: false, error: 'missing-lib' });
        return;
      }

      const width = opts.width || 240;
      const margin = opts.margin != null ? opts.margin : 1;
      const dark = opts.dark || '#18181b';
      const light = opts.light || '#ffffff';
      const logoSrc = opts.logoSrc || '';
      const byteLength = new Blob([payload]).size;
      const errorCorrectionLevel = resolveErrorCorrection(byteLength, Boolean(logoSrc));

      window.QRCode.toCanvas(
        targetCanvas,
        payload,
        {
          width,
          margin,
          errorCorrectionLevel,
          color: { dark, light }
        },
        async (err) => {
          if (err) {
            resolve({ ok: false, error: err });
            return;
          }
          let logoApplied = false;
          if (logoSrc) {
            logoApplied = await overlayLogo(targetCanvas, logoSrc);
          }
          resolve({ ok: true, logoApplied, errorCorrectionLevel, byteLength });
        }
      );
    });
  }

  function renderCanvas(state, qrMode, force = false) {
    const canvas = document.getElementById('qrCanvas');
    const urlDisplay = document.getElementById('generatedUrlDisplay');
    const sizeDisplay = document.getElementById('payloadSizeDisplay');
    const statusBadge = document.getElementById('qrStatusBadge');
    const logoPreview = document.getElementById('qrLogoPreview');
    const offlineNotice = document.getElementById('offlineModeNotice');
    const offlineTeaser = document.getElementById('offlineModeTeaser');
    const shareSubtitle = document.getElementById('shareBandSubtitle');

    if (!canvas) return;
    if (!window.QRCode || typeof window.QRCode.toCanvas !== 'function') {
      if (statusBadge) {
        statusBadge.textContent = 'Lib QR absente';
        statusBadge.dataset.state = 'offline';
      }
      if (sizeDisplay) sizeDisplay.textContent = '0 octets';
      return;
    }

    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.forest;
    const isOfflineMode = qrMode === 'vcard';
    const payload = resolvePayload(state, qrMode);
    const linkUrl = isOfflineMode ? resolvePayload(state, 'url') : payload;
    const logoSrc = getLogoSrc(state);
    const signature = `${qrMode}|${state.theme}|${payload}|${isOfflineMode ? linkUrl : ''}|${logoSignature(state)}`;

    if (logoPreview) {
      logoPreview.replaceChildren();
      if (logoSrc) {
        const img = document.createElement('img');
        img.src = logoSrc;
        img.alt = 'Logo QR';
        img.className = 'w-full h-full object-cover';
        logoPreview.appendChild(img);
      } else {
        logoPreview.textContent = 'QR';
      }
    }

    if (!force && signature === lastRenderedSignature) {
      return;
    }
    lastRenderedSignature = signature;

    if (urlDisplay) {
      urlDisplay.textContent = linkUrl;
    }
    if (offlineNotice) {
      offlineNotice.hidden = !isOfflineMode;
    }
    if (offlineTeaser) {
      offlineTeaser.hidden = isOfflineMode;
    }
    if (shareSubtitle) {
      shareSubtitle.textContent = isOfflineMode
        ? 'QR Contact : fiche enregistrable sans Internet'
        : 'Choisissez le type de QR, puis scannez ou envoyez';
    }

    const byteLength = new Blob([payload]).size;
    if (sizeDisplay) {
      sizeDisplay.textContent = `${byteLength} octets`;
    }

    paintQrToCanvas(canvas, payload, {
      width: 240,
      margin: 1,
      dark: palette.qrDark || '#18181b',
      light: '#ffffff',
      logoSrc
    }).then((result) => {
      if (!statusBadge) return;
      statusBadge.className = 'status-chip';
      if (!result.ok) {
        statusBadge.textContent = result.error === 'missing-lib' ? 'Lib QR absente' : 'Trop long';
        statusBadge.dataset.state = 'offline';
        return;
      }
      if (logoSrc && result.logoApplied) {
        statusBadge.textContent = 'QR + logo (ECC H)';
        statusBadge.dataset.state = 'online';
      } else if (logoSrc && !result.logoApplied) {
        statusBadge.textContent = 'Logo non charge';
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
    });
  }

  function downloadHighResPng(state, qrMode, onResult) {
    if (!window.QRCode) {
      if (onResult) onResult(false);
      return;
    }

    const offscreen = document.createElement('canvas');
    const palette = THEME_PALETTES[state.theme] || THEME_PALETTES.forest;
    const payload = resolvePayload(state, qrMode);
    const logoSrc = getLogoSrc(state);

    paintQrToCanvas(offscreen, payload, {
      width: 1024,
      margin: 2,
      dark: palette.qrDark || '#18181b',
      light: '#ffffff',
      logoSrc
    }).then((result) => {
      if (!result.ok) {
        if (onResult) onResult(false);
        return;
      }
      const safeName = `${state.firstName || 'Carte'}_${state.lastName || 'Visite'}`.replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );
      const link = document.createElement('a');
      link.download = `QR_${safeName}${logoSrc ? '_logo' : ''}.png`;
      link.href = offscreen.toDataURL('image/png');
      link.click();
      if (onResult) onResult(true);
    });
  }

  return {
    resolvePayload,
    getLogoSrc,
    paintQrToCanvas,
    overlayLogo,
    renderCanvas,
    downloadHighResPng
  };
})();
