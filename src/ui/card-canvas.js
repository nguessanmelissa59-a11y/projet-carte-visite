window.VCardApp = window.VCardApp || {};

window.VCardApp.CardCanvasExporter = (function () {
  const { THEME_PALETTES } = window.VCardApp.Config;
  const QrView = window.VCardApp.QrView;
  const ApiService = window.VCardApp.ApiService;

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
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  async function generateCardCanvas(state, qrMode) {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Fallback
      }
    }

    const palette = (THEME_PALETTES && THEME_PALETTES[state.theme]) || {
      qrDark: '#18181b',
      headerBg: 'bg-zinc-900'
    };
    const accentHex = palette.qrDark || '#18181b';

    // Business card standard dimensions (1100 x 660 px, high definition 300 DPI ready)
    const width = 1100;
    const height = 660;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle card border
    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Left vertical accent strip
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 14, height);

    // Top subtle hairline accent
    ctx.fillStyle = accentHex;
    ctx.fillRect(14, 0, width - 14, 4);

    // 2. Avatar or Initials
    const avatarSrc = state.photoBase64 || state.photoUrl || '';
    const avatarImg = await loadImage(avatarSrc);
    const hasAvatar = Boolean(avatarImg);
    const avatarSize = 104;
    const avatarX = 54;
    const avatarY = 56;

    if (hasAvatar) {
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 16);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Border around avatar
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 16);
      ctx.stroke();
    } else {
      // Initials block
      ctx.fillStyle = accentHex;
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 16);
      ctx.fill();

      const initials = (
        ((state.firstName || '').charAt(0) + (state.lastName || '').charAt(0)) || 'VC'
      ).toUpperCase();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "bold 34px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }

    // 3. Identity Header
    const textStartX = avatarX + avatarSize + 28;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Full Name
    const fullName = `${state.firstName || ''} ${state.lastName || ''}`.trim() || 'Votre Nom';
    ctx.fillStyle = '#09090B';
    let nameFontSize = 34;
    ctx.font = `bold ${nameFontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
    while (ctx.measureText(fullName).width > 490 && nameFontSize > 22) {
      nameFontSize -= 2;
      ctx.font = `bold ${nameFontSize}px 'Plus Jakarta Sans', 'Inter', sans-serif`;
    }
    ctx.fillText(fullName, textStartX, 96);

    // Job Title
    if (state.jobTitle) {
      ctx.fillStyle = '#52525B';
      let titleFontSize = 20;
      ctx.font = `500 ${titleFontSize}px 'Inter', sans-serif`;
      while (ctx.measureText(state.jobTitle).width > 490 && titleFontSize > 15) {
        titleFontSize -= 1;
        ctx.font = `500 ${titleFontSize}px 'Inter', sans-serif`;
      }
      ctx.fillText(state.jobTitle, textStartX, 128);
    }

    // Organization / Company
    if (state.organization) {
      ctx.fillStyle = accentHex;
      ctx.font = "600 15px 'Inter', sans-serif";
      ctx.fillText(state.organization.toUpperCase(), textStartX, 154);
    }

    // 4. Horizontal Separator
    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(54, 186);
    ctx.lineTo(690, 186);
    ctx.stroke();

    // 5. Contact Details (Left side rows)
    const contactItems = [];
    if (state.phone) contactItems.push({ label: 'TÉLÉPHONE', value: state.phone, isMono: true });
    if (state.email) contactItems.push({ label: 'COURRIEL', value: state.email, isMono: false });
    if (state.whatsapp && state.whatsapp !== state.phone) {
      contactItems.push({ label: 'WHATSAPP', value: state.whatsapp, isMono: true });
    }
    if (state.portfolioUrl) {
      const cleanUrl = state.portfolioUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      contactItems.push({ label: 'SITE WEB', value: cleanUrl, isMono: false });
    } else if (state.linkedinUrl) {
      const cleanLi = state.linkedinUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      contactItems.push({ label: 'LINKEDIN', value: cleanLi, isMono: false });
    }
    if (state.location) {
      contactItems.push({ label: 'LOCALISATION', value: state.location, isMono: false });
    }

    const itemsToDisplay = contactItems.slice(0, 5);
    const itemGap = itemsToDisplay.length > 4 ? 50 : 58;
    let startY = 222;
    itemsToDisplay.forEach((item) => {
      // Label
      ctx.fillStyle = '#A1A1AA';
      ctx.font = "600 11px 'Inter', sans-serif";
      ctx.fillText(item.label, 54, startY);

      // Value
      ctx.fillStyle = '#18181B';
      let valFontSize = item.isMono ? 16 : 15;
      const fontFam = item.isMono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif";
      ctx.font = `500 ${valFontSize}px ${fontFam}`;
      while (ctx.measureText(item.value).width > 620 && valFontSize > 12) {
        valFontSize -= 1;
        ctx.font = `500 ${valFontSize}px ${fontFam}`;
      }
      ctx.fillText(item.value, 54, startY + 23);

      startY += itemGap;
    });

    // Bio or subtle footnote
    if (state.bio) {
      ctx.fillStyle = '#71717A';
      ctx.font = "italic 13px 'Inter', sans-serif";
      const truncatedBio = state.bio.length > 70 ? state.bio.slice(0, 68) + '...' : state.bio;
      ctx.fillText(`« ${truncatedBio} »`, 54, 592);
    } else {
      ctx.fillStyle = '#A1A1AA';
      ctx.font = "500 12px 'JetBrains Mono', monospace";
      ctx.fillText('CARTE DE VISITE NUMÉRIQUE • vCard 3.0', 54, 592);
    }

    // 6. Right Side: Framed QR Code Module
    const qrFrameX = 726;
    const qrFrameY = 56;
    const qrFrameW = 320;
    const qrFrameH = 548;

    // QR container box
    ctx.fillStyle = '#F8F8F7';
    drawRoundedRect(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 18);
    ctx.fill();

    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, 18);
    ctx.stroke();

    // Top micro-bar inside QR container
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.moveTo(qrFrameX + 18, qrFrameY);
    ctx.lineTo(qrFrameX + qrFrameW - 18, qrFrameY);
    ctx.lineWidth = 3;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    // Render QR Code onto an offscreen canvas
    const qrCanvas = document.createElement('canvas');
    const qrPayload = QrView ? QrView.resolvePayload(state, qrMode) : (state.slug ? `/c/${state.slug}` : window.location.href);
    const byteLength = new Blob([qrPayload]).size;

    await new Promise((resolve) => {
      if (!window.QRCode) return resolve();
      window.QRCode.toCanvas(
        qrCanvas,
        qrPayload,
        {
          width: 250,
          margin: 1,
          errorCorrectionLevel: byteLength > 600 ? 'L' : 'M',
          color: {
            dark: accentHex,
            light: '#ffffff'
          }
        },
        (err) => {
          if (err) console.warn('QR Code canvas generation warning:', err);
          resolve();
        }
      );
    });

    // White backing card for QR Code
    const qrBoxSize = 264;
    const qrBoxX = qrFrameX + (qrFrameW - qrBoxSize) / 2;
    const qrBoxY = qrFrameY + 36;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 12);
    ctx.fill();

    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 12);
    ctx.stroke();

    // Draw the QR Code image inside
    ctx.drawImage(qrCanvas, qrBoxX + 7, qrBoxY + 7, 250, 250);

    // Captions below QR Code
    ctx.textAlign = 'center';

    ctx.fillStyle = '#09090B';
    ctx.font = "bold 14px 'Plus Jakarta Sans', 'Inter', sans-serif";
    ctx.fillText('SCANNER LE QR CODE', qrFrameX + qrFrameW / 2, qrBoxY + qrBoxSize + 48);

    ctx.fillStyle = '#71717A';
    ctx.font = "400 12px 'Inter', sans-serif";
    ctx.fillText('Ajout automatique aux contacts', qrFrameX + qrFrameW / 2, qrBoxY + qrBoxSize + 70);

    // Pill with short slug or URL
    const pillY = qrBoxY + qrBoxSize + 100;
    const pillW = 240;
    const pillH = 34;
    const pillX = qrFrameX + (qrFrameW - pillW) / 2;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
    ctx.stroke();

    const displayUrl =
      ApiService && ApiService.isAvailable() && state.slug
        ? `/c/${state.slug}`
        : qrMode === 'vcard'
        ? 'vCard Direct (Offline)'
        : (state.slug ? `/c/${state.slug}` : 'Carte Numérique');

    ctx.fillStyle = accentHex;
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.fillText(displayUrl, qrFrameX + qrFrameW / 2, pillY + 22);

    return canvas;
  }

  async function renderCardToCanvas(targetCanvas, state, qrMode) {
    if (!targetCanvas) return;
    try {
      const offscreen = await generateCardCanvas(state, qrMode);
      targetCanvas.width = offscreen.width;
      targetCanvas.height = offscreen.height;
      const ctx = targetCanvas.getContext('2d');
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.drawImage(offscreen, 0, 0);
    } catch (err) {
      console.error('Erreur renderCardToCanvas:', err);
    }
  }

  async function downloadCardImage(state, qrMode, onComplete) {
    try {
      const canvas = await generateCardCanvas(state, qrMode);
      const safeFirst = (state.firstName || 'Carte').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeLast = (state.lastName || 'Visite').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Carte_Visite_${safeFirst}_${safeLast}.png`;

      canvas.toBlob((blob) => {
        if (!blob) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (typeof onComplete === 'function') onComplete(true, fileName);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 3000);

        if (typeof onComplete === 'function') {
          onComplete(true, fileName);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Erreur génération carte de visite image:', err);
      if (typeof onComplete === 'function') {
        onComplete(false, null);
      }
    }
  }

  return {
    generateCardCanvas,
    renderCardToCanvas,
    downloadCardImage
  };
})();
