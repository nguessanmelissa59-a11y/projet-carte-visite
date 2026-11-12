window.VCardApp = window.VCardApp || {};

window.VCardApp.CardCanvasExporter = (function () {
  const { THEME_PALETTES, CARD_TEMPLATES } = window.VCardApp.Config;
  const QrView = window.VCardApp.QrView;
  const ApiService = window.VCardApp.ApiService;

  const WIDTH = 1100;
  const HEIGHT = 660;

  /** Format carte de visite FR / ISO courant (impression). */
  const PRINT_CARD_WIDTH_MM = 85;
  const PRINT_CARD_HEIGHT_MM = 55;
  const PRINT_DPI = 300;
  const PRINT_CARD_WIDTH_PX = Math.round((PRINT_CARD_WIDTH_MM / 25.4) * PRINT_DPI);
  const PRINT_CARD_HEIGHT_PX = Math.round((PRINT_CARD_HEIGHT_MM / 25.4) * PRINT_DPI);
  const PRINT_PAGE_WIDTH_MM = 210;
  const PRINT_PAGE_HEIGHT_MM = 297;
  const MM_TO_PT = 72 / 25.4;

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

  function getInitials(state) {
    return (
      ((state.firstName || '').charAt(0) + (state.lastName || '').charAt(0)) || 'VC'
    ).toUpperCase();
  }

  function getFullName(state) {
    return `${state.firstName || ''} ${state.lastName || ''}`.trim() || 'Votre Nom';
  }

  function getAccent(state) {
    const palette = (THEME_PALETTES && THEME_PALETTES[state.theme]) || {};
    return palette.qrDark || palette.bannerColor || '#18181b';
  }

  function getDisplayUrl(state, qrMode) {
    if (ApiService && ApiService.isAvailable() && state.slug) {
      return `/c/${state.slug}`;
    }
    if (qrMode === 'vcard') return 'vCard Direct';
    return state.slug ? `/c/${state.slug}` : 'Carte Numérique';
  }

  function fitText(ctx, text, maxWidth, baseSize, minSize, fontBuilder) {
    let size = baseSize;
    ctx.font = fontBuilder(size);
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
      size -= 1;
      ctx.font = fontBuilder(size);
    }
    return size;
  }

  function collectContacts(state) {
    const items = [];
    if (state.phone) items.push({ label: 'Téléphone', value: state.phone });
    if (state.email) items.push({ label: 'Courriel', value: state.email });
    if (state.whatsapp && state.whatsapp !== state.phone) {
      items.push({ label: 'WhatsApp', value: state.whatsapp });
    }
    if (state.portfolioUrl) {
      items.push({
        label: 'Site',
        value: state.portfolioUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
      });
    } else if (state.linkedinUrl) {
      items.push({
        label: 'LinkedIn',
        value: state.linkedinUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
      });
    }
    if (state.location) items.push({ label: 'Lieu', value: state.location });
    return items.slice(0, 5);
  }

  async function buildQrCanvas(state, qrMode, accentHex, size) {
    const qrCanvas = document.createElement('canvas');
    const qrPayload = QrView
      ? QrView.resolvePayload(state, qrMode)
      : state.slug
        ? `/c/${state.slug}`
        : window.location.href;

    if (QrView && typeof QrView.paintQrToCanvas === 'function') {
      await QrView.paintQrToCanvas(qrCanvas, qrPayload, {
        width: size,
        margin: 1,
        dark: accentHex,
        light: '#ffffff',
        logoSrc: QrView.getLogoSrc(state)
      });
      return qrCanvas;
    }

    const byteLength = new Blob([qrPayload]).size;
    await new Promise((resolve) => {
      if (!window.QRCode) return resolve();
      window.QRCode.toCanvas(
        qrCanvas,
        qrPayload,
        {
          width: size,
          margin: 1,
          errorCorrectionLevel: byteLength > 600 ? 'L' : 'M',
          color: { dark: accentHex, light: '#ffffff' }
        },
        () => resolve()
      );
    });

    return qrCanvas;
  }

  async function drawAvatar(ctx, state, x, y, size, opts) {
    const options = opts || {};
    const radius = options.radius != null ? options.radius : size / 2;
    const fill = options.fill || '#18181b';
    const ring = options.ring || null;
    const textColor = options.textColor || '#ffffff';
    const avatarSrc = state.photoBase64 || state.photoUrl || '';
    const avatarImg = await loadImage(avatarSrc);

    if (ring) {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
      ctx.strokeStyle = ring;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (avatarImg) {
      ctx.save();
      if (radius >= size / 2 - 0.5) {
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
      } else {
        drawRoundedRect(ctx, x, y, size, size, radius);
        ctx.clip();
      }
      ctx.drawImage(avatarImg, x, y, size, size);
      ctx.restore();
      return;
    }

    if (radius >= size / 2 - 0.5) {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    } else {
      ctx.fillStyle = fill;
      drawRoundedRect(ctx, x, y, size, size, radius);
      ctx.fill();
    }

    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.round(size * 0.32)}px 'Fraunces', 'Figtree', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getInitials(state), x + size / 2, y + size / 2 + 1);
  }

  function drawContactRows(ctx, items, x, startY, opts) {
    const options = opts || {};
    const labelColor = options.labelColor || '#a1a1aa';
    const valueColor = options.valueColor || '#18181b';
    const gap = options.gap || 54;
    let y = startY;

    items.forEach((item) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = labelColor;
      ctx.font = "600 11px 'Figtree', sans-serif";
      ctx.fillText(item.label.toUpperCase(), x, y);
      ctx.fillStyle = valueColor;
      fitText(ctx, item.value, options.maxWidth || 580, 16, 12, (s) => `500 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(item.value, x, y + 22);
      y += gap;
    });
  }

  async function drawQrPanel(ctx, state, qrMode, accentHex, frame) {
    const { x, y, w, h, bg, border, titleColor, subColor } = frame;
    ctx.fillStyle = bg;
    drawRoundedRect(ctx, x, y, w, h, 18);
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, x, y, w, h, 18);
      ctx.stroke();
    }

    const qrSize = 230;
    const qrCanvas = await buildQrCanvas(state, qrMode, accentHex, qrSize);
    const box = 246;
    const boxX = x + (w - box) / 2;
    const boxY = y + 28;

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, boxX, boxY, box, box, 12);
    ctx.fill();
    ctx.drawImage(qrCanvas, boxX + 8, boxY + 8, qrSize, qrSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = titleColor;
    ctx.font = "bold 14px 'Fraunces', 'Figtree', serif";
    ctx.fillText('SCANNER LE QR CODE', x + w / 2, boxY + box + 42);
    ctx.fillStyle = subColor;
    ctx.font = "400 12px 'Figtree', sans-serif";
    ctx.fillText('Pour enregistrer les contacts', x + w / 2, boxY + box + 64);

    const pillW = 220;
    const pillH = 32;
    const pillX = x + (w - pillW) / 2;
    const pillY = boxY + box + 88;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
    ctx.fill();
    ctx.strokeStyle = border || '#e4e4e7';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText(getDisplayUrl(state, qrMode), x + w / 2, pillY + 21);
  }

  async function drawEditorial(ctx, state, qrMode, accentHex) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 14, HEIGHT);
    ctx.fillRect(14, 0, WIDTH - 14, 4);

    await drawAvatar(ctx, state, 54, 56, 104, { radius: 16, fill: accentHex });
    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#09090b';
    fitText(ctx, name, 490, 34, 22, (s) => `bold ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 186, 96);
    if (state.jobTitle) {
      ctx.fillStyle = '#52525b';
      fitText(ctx, state.jobTitle, 490, 20, 14, (s) => `500 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(state.jobTitle, 186, 128);
    }
    if (state.organization) {
      ctx.fillStyle = accentHex;
      ctx.font = "600 15px 'Figtree', sans-serif";
      ctx.fillText(state.organization.toUpperCase(), 186, 154);
    }

    ctx.strokeStyle = '#e4e4e7';
    ctx.beginPath();
    ctx.moveTo(54, 186);
    ctx.lineTo(690, 186);
    ctx.stroke();

    drawContactRows(ctx, collectContacts(state), 54, 222, {
      labelColor: '#a1a1aa',
      valueColor: '#18181b'
    });

    ctx.fillStyle = '#a1a1aa';
    ctx.font = "500 12px 'IBM Plex Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('CARTE DE VISITE NUMÉRIQUE • version 1.0', 54, 620);

    await drawQrPanel(ctx, state, qrMode, accentHex, {
      x: 726,
      y: 56,
      w: 320,
      h: 548,
      bg: '#f8f8f7',
      border: '#e4e4e7',
      titleColor: '#09090b',
      subColor: '#71717a'
    });
  }

  async function drawMinimal(ctx, state, qrMode) {
    const accent = '#1c1917';
    ctx.fillStyle = '#f3eee6';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#ebe4d8';
    drawRoundedRect(ctx, 36, 36, WIDTH - 72, HEIGHT - 72, 28);
    ctx.fill();

    await drawAvatar(ctx, state, 88, 90, 120, { radius: 60, fill: accent, textColor: '#f3eee6' });
    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c1917';
    fitText(ctx, name, 520, 40, 24, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 240, 140);
    if (state.jobTitle) {
      ctx.fillStyle = '#78716c';
      ctx.font = "400 20px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 240, 176);
    }
    if (state.organization) {
      ctx.fillStyle = '#a8a29e';
      ctx.font = "500 14px 'Figtree', sans-serif";
      ctx.fillText(state.organization, 240, 206);
    }

    drawContactRows(ctx, collectContacts(state), 88, 280, {
      labelColor: '#a8a29e',
      valueColor: '#292524',
      gap: 52,
      maxWidth: 540
    });

    await drawQrPanel(ctx, state, qrMode, accent, {
      x: 700,
      y: 90,
      w: 330,
      h: 480,
      bg: '#fffaf3',
      border: '#ddd6cb',
      titleColor: '#1c1917',
      subColor: '#78716c'
    });
  }

  async function drawCorporate(ctx, state, qrMode) {
    const accent = '#67e8f9';
    const deep = '#0b1c2c';
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#0b1c2c');
    grad.addColorStop(0.55, '#12324a');
    grad.addColorStop(1, '#0a1622');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = 'rgba(103, 232, 249, 0.08)';
    ctx.beginPath();
    ctx.arc(980, 80, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    drawRoundedRect(ctx, 40, 40, 620, HEIGHT - 80, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 40, 40, 620, HEIGHT - 80, 24);
    ctx.stroke();

    await drawAvatar(ctx, state, 72, 72, 100, {
      radius: 18,
      fill: '#1d4e89',
      ring: accent,
      textColor: '#ecfeff'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    fitText(ctx, name, 430, 34, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 198, 112);
    if (state.jobTitle) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = "400 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 198, 144);
    }
    if (state.organization) {
      ctx.fillStyle = accent;
      ctx.font = "600 13px 'IBM Plex Mono', monospace";
      ctx.fillText(state.organization.toUpperCase(), 198, 172);
    }

    drawContactRows(ctx, collectContacts(state), 72, 250, {
      labelColor: '#64748b',
      valueColor: '#e2e8f0',
      gap: 52,
      maxWidth: 520
    });

    await drawQrPanel(ctx, state, qrMode, '#0b1c2c', {
      x: 700,
      y: 70,
      w: 340,
      h: 520,
      bg: 'rgba(255,255,255,0.08)',
      border: 'rgba(103, 232, 249, 0.35)',
      titleColor: '#ecfeff',
      subColor: '#94a3b8'
    });
  }

  async function drawCreative(ctx, state, qrMode) {
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const wave = ctx.createLinearGradient(0, 0, WIDTH, 280);
    wave.addColorStop(0, '#ff7a59');
    wave.addColorStop(0.45, '#fb7185');
    wave.addColorStop(1, '#fbbf24');
    ctx.fillStyle = wave;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(WIDTH, 0);
    ctx.lineTo(WIDTH, 210);
    ctx.bezierCurveTo(860, 290, 620, 150, 420, 230);
    ctx.bezierCurveTo(260, 290, 120, 210, 0, 250);
    ctx.closePath();
    ctx.fill();

    await drawAvatar(ctx, state, 72, 88, 118, {
      radius: 59,
      fill: '#9f1239',
      ring: '#ffffff',
      textColor: '#fff7ed'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1c1917';
    fitText(ctx, name, 520, 38, 24, (s) => `800 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 220, 280);
    if (state.jobTitle) {
      ctx.fillStyle = '#9a3412';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 220, 314);
    }

    drawContactRows(ctx, collectContacts(state), 72, 360, {
      labelColor: '#c2410c',
      valueColor: '#1c1917',
      gap: 48,
      maxWidth: 540
    });

    await drawQrPanel(ctx, state, qrMode, '#9f1239', {
      x: 700,
      y: 250,
      w: 340,
      h: 360,
      bg: '#ffffff',
      border: '#fdba74',
      titleColor: '#9f1239',
      subColor: '#9a3412'
    });
  }

  async function drawEco(ctx, state, qrMode) {
    ctx.fillStyle = '#eef2eb';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#d7e3d4';
    ctx.beginPath();
    ctx.ellipse(980, -20, 260, 220, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e7c3a8';
    ctx.beginPath();
    ctx.ellipse(-40, 700, 280, 220, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 48, 48, WIDTH - 96, HEIGHT - 96, 28);
    ctx.fill();

    await drawAvatar(ctx, state, 88, 88, 110, {
      radius: 55,
      fill: '#4d7c5a',
      textColor: '#eef2eb'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1f2a24';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 230, 132);
    if (state.jobTitle) {
      ctx.fillStyle = '#4d7c5a';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 230, 166);
    }
    if (state.organization) {
      ctx.fillStyle = '#c26d3e';
      ctx.font = "600 14px 'Figtree', sans-serif";
      ctx.fillText(state.organization, 230, 194);
    }

    drawContactRows(ctx, collectContacts(state), 88, 270, {
      labelColor: '#7a8f7e',
      valueColor: '#1f2a24',
      gap: 50,
      maxWidth: 520
    });

    await drawQrPanel(ctx, state, qrMode, '#4d7c5a', {
      x: 700,
      y: 90,
      w: 330,
      h: 470,
      bg: '#f7faf5',
      border: '#c9d8c6',
      titleColor: '#1f2a24',
      subColor: '#4d7c5a'
    });
  }

  async function drawPrestige(ctx, state, qrMode) {
    const gold = '#c9a227';
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 28, 28, WIDTH - 56, HEIGHT - 56, 8);
    ctx.stroke();
    drawRoundedRect(ctx, 40, 40, WIDTH - 80, HEIGHT - 80, 4);
    ctx.stroke();

    await drawAvatar(ctx, state, 88, 90, 120, {
      radius: 60,
      fill: '#1a1a1a',
      ring: gold,
      textColor: gold
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f5e6b8';
    fitText(ctx, name, 500, 38, 24, (s) => `600 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 240, 140);
    if (state.jobTitle) {
      ctx.fillStyle = '#c9a227';
      ctx.font = "400 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 240, 176);
    }
    if (state.organization) {
      ctx.fillStyle = '#a1a1aa';
      ctx.font = "500 13px 'IBM Plex Mono', monospace";
      ctx.fillText(state.organization.toUpperCase(), 240, 206);
    }

    drawContactRows(ctx, collectContacts(state), 88, 280, {
      labelColor: '#737373',
      valueColor: '#f5f5f4',
      gap: 50,
      maxWidth: 520
    });

    await drawQrPanel(ctx, state, qrMode, '#0a0a0a', {
      x: 700,
      y: 90,
      w: 330,
      h: 480,
      bg: '#141414',
      border: gold,
      titleColor: '#f5e6b8',
      subColor: '#c9a227'
    });
  }

  async function drawNocturne(ctx, state, qrMode) {
    ctx.fillStyle = '#111113';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 18, HEIGHT);

    await drawAvatar(ctx, state, 64, 70, 108, {
      radius: 16,
      fill: '#27272a',
      textColor: '#fafafa'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fafafa';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 200, 115);
    if (state.jobTitle) {
      ctx.fillStyle = '#a1a1aa';
      ctx.font = "400 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 200, 148);
    }

    drawContactRows(ctx, collectContacts(state), 64, 250, {
      labelColor: '#71717a',
      valueColor: '#e4e4e7',
      gap: 52,
      maxWidth: 560
    });

    await drawQrPanel(ctx, state, qrMode, '#09090b', {
      x: 720,
      y: 70,
      w: 320,
      h: 520,
      bg: '#18181b',
      border: '#3f3f46',
      titleColor: '#fafafa',
      subColor: '#a1a1aa'
    });
  }

  async function drawAtelier(ctx, state, qrMode) {
    ctx.fillStyle = '#f7f1e8';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(0, 0, WIDTH, 12);
    ctx.fillRect(0, HEIGHT - 12, WIDTH, 12);

    await drawAvatar(ctx, state, 70, 70, 112, {
      radius: 12,
      fill: '#2a2118',
      textColor: '#f7f1e8'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2a2118';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 210, 118);
    if (state.jobTitle) {
      ctx.fillStyle = '#8b5e3c';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 210, 152);
    }

    drawContactRows(ctx, collectContacts(state), 70, 250, {
      labelColor: '#a18060',
      valueColor: '#2a2118',
      gap: 52,
      maxWidth: 560
    });

    await drawQrPanel(ctx, state, qrMode, '#2a2118', {
      x: 710,
      y: 70,
      w: 330,
      h: 520,
      bg: '#fffaf2',
      border: '#d6c4ae',
      titleColor: '#2a2118',
      subColor: '#8b5e3c'
    });
  }

  async function drawLagoon(ctx, state, qrMode) {
    ctx.fillStyle = '#ecfeff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const band = ctx.createLinearGradient(0, 0, WIDTH, 0);
    band.addColorStop(0, '#0f766e');
    band.addColorStop(1, '#155e75');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, WIDTH, 150);

    ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.beginPath();
    ctx.ellipse(980, 40, 180, 120, 0, 0, Math.PI * 2);
    ctx.fill();

    await drawAvatar(ctx, state, 72, 88, 116, {
      radius: 58,
      fill: '#0f766e',
      ring: '#ffffff',
      textColor: '#ecfeff'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#134e4a';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 220, 270);
    if (state.jobTitle) {
      ctx.fillStyle = '#0f766e';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 220, 304);
    }

    drawContactRows(ctx, collectContacts(state), 72, 350, {
      labelColor: '#0f766e',
      valueColor: '#115e59',
      gap: 48,
      maxWidth: 540
    });

    await drawQrPanel(ctx, state, qrMode, '#0f766e', {
      x: 700,
      y: 190,
      w: 340,
      h: 420,
      bg: '#ffffff',
      border: '#99f6e4',
      titleColor: '#134e4a',
      subColor: '#0f766e'
    });
  }

  async function drawSlate(ctx, state, qrMode) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 28, HEIGHT);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 1) {
      const y = 80 + i * 70;
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(680, y);
      ctx.stroke();
    }

    await drawAvatar(ctx, state, 70, 70, 108, {
      radius: 14,
      fill: '#334155',
      textColor: '#f8fafc'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 206, 115);
    if (state.jobTitle) {
      ctx.fillStyle = '#64748b';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 206, 148);
    }
    if (state.organization) {
      ctx.fillStyle = '#334155';
      ctx.font = "600 13px 'IBM Plex Mono', monospace";
      ctx.fillText(state.organization.toUpperCase(), 206, 176);
    }

    drawContactRows(ctx, collectContacts(state), 70, 250, {
      labelColor: '#94a3b8',
      valueColor: '#1e293b',
      gap: 52,
      maxWidth: 560
    });

    await drawQrPanel(ctx, state, qrMode, '#334155', {
      x: 710,
      y: 70,
      w: 330,
      h: 520,
      bg: '#ffffff',
      border: '#cbd5e1',
      titleColor: '#0f172a',
      subColor: '#64748b'
    });
  }

  async function drawSunset(ctx, state, qrMode) {
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const sky = ctx.createLinearGradient(0, 0, 0, 240);
    sky.addColorStop(0, '#fb923c');
    sky.addColorStop(0.55, '#ea580c');
    sky.addColorStop(1, '#9a3412');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, 220);

    ctx.fillStyle = '#fff7ed';
    ctx.beginPath();
    ctx.moveTo(0, 190);
    ctx.quadraticCurveTo(280, 250, 560, 200);
    ctx.quadraticCurveTo(820, 160, WIDTH, 210);
    ctx.lineTo(WIDTH, 240);
    ctx.lineTo(0, 240);
    ctx.closePath();
    ctx.fill();

    await drawAvatar(ctx, state, 72, 150, 118, {
      radius: 59,
      fill: '#9a3412',
      ring: '#ffffff',
      textColor: '#fff7ed'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7c2d12';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 220, 310);
    if (state.jobTitle) {
      ctx.fillStyle = '#c2410c';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 220, 344);
    }

    drawContactRows(ctx, collectContacts(state), 72, 390, {
      labelColor: '#ea580c',
      valueColor: '#7c2d12',
      gap: 46,
      maxWidth: 540
    });

    await drawQrPanel(ctx, state, qrMode, '#9a3412', {
      x: 700,
      y: 260,
      w: 340,
      h: 350,
      bg: '#ffffff',
      border: '#fdba74',
      titleColor: '#7c2d12',
      subColor: '#c2410c'
    });
  }

  async function drawSumi(ctx, state, qrMode) {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, WIDTH, 8);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 8, WIDTH, 4);

    await drawAvatar(ctx, state, 70, 70, 112, {
      radius: 8,
      fill: '#111111',
      textColor: '#fafafa'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111111';
    fitText(ctx, name, 500, 38, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 210, 118);
    if (state.jobTitle) {
      ctx.fillStyle = '#525252';
      ctx.font = "400 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 210, 152);
    }
    if (state.organization) {
      ctx.fillStyle = '#b91c1c';
      ctx.font = "600 13px 'IBM Plex Mono', monospace";
      ctx.fillText(state.organization.toUpperCase(), 210, 180);
    }

    ctx.strokeStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.moveTo(70, 220);
    ctx.lineTo(680, 220);
    ctx.stroke();

    drawContactRows(ctx, collectContacts(state), 70, 260, {
      labelColor: '#a3a3a3',
      valueColor: '#171717',
      gap: 50,
      maxWidth: 560
    });

    await drawQrPanel(ctx, state, qrMode, '#111111', {
      x: 710,
      y: 70,
      w: 330,
      h: 520,
      bg: '#ffffff',
      border: '#d4d4d4',
      titleColor: '#111111',
      subColor: '#b91c1c'
    });
  }

  async function drawArctic(ctx, state, qrMode) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    ctx.lineTo(0, 420);
    ctx.lineTo(420, HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(WIDTH, 0);
    ctx.lineTo(WIDTH, 260);
    ctx.lineTo(720, 0);
    ctx.closePath();
    ctx.fill();

    await drawAvatar(ctx, state, 72, 72, 110, {
      radius: 18,
      fill: '#0284c7',
      textColor: '#f0f9ff'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    fitText(ctx, name, 500, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 210, 118);
    if (state.jobTitle) {
      ctx.fillStyle = '#0284c7';
      ctx.font = "500 18px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 210, 152);
    }

    drawContactRows(ctx, collectContacts(state), 72, 250, {
      labelColor: '#64748b',
      valueColor: '#1e293b',
      gap: 52,
      maxWidth: 560
    });

    await drawQrPanel(ctx, state, qrMode, '#0ea5e9', {
      x: 710,
      y: 70,
      w: 330,
      h: 520,
      bg: '#ffffff',
      border: '#bae6fd',
      titleColor: '#0f172a',
      subColor: '#0284c7'
    });
  }

  async function drawMetro(ctx, state, qrMode) {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 420, HEIGHT);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(420, 0, 18, HEIGHT);

    await drawAvatar(ctx, state, 56, 70, 112, {
      radius: 8,
      fill: '#fef08a',
      textColor: '#18181b'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fafafa';
    fitText(ctx, name, 280, 30, 18, (s) => `800 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 56, 230);
    if (state.jobTitle) {
      ctx.fillStyle = '#fef08a';
      ctx.font = "500 15px 'Figtree', sans-serif";
      const title = state.jobTitle.length > 34 ? `${state.jobTitle.slice(0, 32)}…` : state.jobTitle;
      ctx.fillText(title, 56, 260);
    }

    const leftItems = collectContacts(state).slice(0, 4);
    drawContactRows(ctx, leftItems, 56, 320, {
      labelColor: '#a1a1aa',
      valueColor: '#f4f4f5',
      gap: 50,
      maxWidth: 320
    });

    await drawQrPanel(ctx, state, qrMode, '#18181b', {
      x: 500,
      y: 70,
      w: 520,
      h: 520,
      bg: '#ffffff',
      border: '#e4e4e7',
      titleColor: '#18181b',
      subColor: '#71717a'
    });
  }

  const RENDERERS = {
    editorial: drawEditorial,
    minimal: drawMinimal,
    corporate: drawCorporate,
    creative: drawCreative,
    eco: drawEco,
    prestige: drawPrestige,
    nocturne: drawNocturne,
    atelier: drawAtelier,
    lagoon: drawLagoon,
    slate: drawSlate,
    sunset: drawSunset,
    sumi: drawSumi,
    arctic: drawArctic,
    metro: drawMetro
  };

  async function generateCardCanvas(state, qrMode) {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    const templateId =
      state.cardTemplate && RENDERERS[state.cardTemplate] ? state.cardTemplate : 'editorial';
    const accentHex = getAccent(state);
    const renderer = RENDERERS[templateId];

    if (templateId === 'editorial') {
      await renderer(ctx, state, qrMode, accentHex);
    } else {
      await renderer(ctx, state, qrMode);
    }

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

  function canvasToJpegBytes(canvas, quality) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function buildPrintCardCanvas(sourceCanvas) {
    const out = document.createElement('canvas');
    out.width = PRINT_CARD_WIDTH_PX;
    out.height = PRINT_CARD_HEIGHT_PX;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    const scale = Math.min(out.width / sourceCanvas.width, out.height / sourceCanvas.height);
    const drawW = sourceCanvas.width * scale;
    const drawH = sourceCanvas.height * scale;
    const dx = (out.width - drawW) / 2;
    const dy = (out.height - drawH) / 2;
    ctx.drawImage(sourceCanvas, dx, dy, drawW, drawH);
    return out;
  }

  function buildPrintablePdfBytes(jpegBytes, pixelW, pixelH) {
    const pageW = PRINT_PAGE_WIDTH_MM * MM_TO_PT;
    const pageH = PRINT_PAGE_HEIGHT_MM * MM_TO_PT;
    const cardW = PRINT_CARD_WIDTH_MM * MM_TO_PT;
    const cardH = PRINT_CARD_HEIGHT_MM * MM_TO_PT;
    const cardX = (pageW - cardW) / 2;
    const cardY = (pageH - cardH) / 2;
    const mark = 8;
    const gap = 2;
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];

    function sizeOf() {
      return chunks.reduce((n, c) => n + c.length, 0);
    }

    function write(data) {
      if (typeof data === 'string') chunks.push(encoder.encode(data));
      else chunks.push(data);
    }

    function startObj() {
      offsets.push(sizeOf());
    }

    write('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    startObj();
    write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    startObj();
    write('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    startObj();
    write(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] ` +
        `/Resources << /XObject << /Im0 4 0 R >> /Font << /F1 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`
    );

    startObj();
    write(
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelW} /Height ${pixelH} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    );
    write(jpegBytes);
    write('\nendstream\nendobj\n');

    startObj();
    write('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    const content = [
      'q',
      `${cardW.toFixed(2)} 0 0 ${cardH.toFixed(2)} ${cardX.toFixed(2)} ${cardY.toFixed(2)} cm`,
      '/Im0 Do',
      'Q',
      '0.4 w',
      '0 0 0 RG',
      `${(cardX - mark).toFixed(2)} ${cardY.toFixed(2)} m ${(cardX - gap).toFixed(2)} ${cardY.toFixed(2)} l S`,
      `${cardX.toFixed(2)} ${(cardY - mark).toFixed(2)} m ${cardX.toFixed(2)} ${(cardY - gap).toFixed(2)} l S`,
      `${(cardX + cardW + gap).toFixed(2)} ${cardY.toFixed(2)} m ${(cardX + cardW + mark).toFixed(2)} ${cardY.toFixed(2)} l S`,
      `${(cardX + cardW).toFixed(2)} ${(cardY - mark).toFixed(2)} m ${(cardX + cardW).toFixed(2)} ${(cardY - gap).toFixed(2)} l S`,
      `${(cardX - mark).toFixed(2)} ${(cardY + cardH).toFixed(2)} m ${(cardX - gap).toFixed(2)} ${(cardY + cardH).toFixed(2)} l S`,
      `${cardX.toFixed(2)} ${(cardY + cardH + gap).toFixed(2)} m ${cardX.toFixed(2)} ${(cardY + cardH + mark).toFixed(2)} l S`,
      `${(cardX + cardW + gap).toFixed(2)} ${(cardY + cardH).toFixed(2)} m ${(cardX + cardW + mark).toFixed(2)} ${(cardY + cardH).toFixed(2)} l S`,
      `${(cardX + cardW).toFixed(2)} ${(cardY + cardH + gap).toFixed(2)} m ${(cardX + cardW).toFixed(2)} ${(cardY + cardH + mark).toFixed(2)} l S`,
      'BT /F1 9 Tf 0.35 0.35 0.35 rg',
      `50 ${(cardY - 28).toFixed(2)} Td`,
      '(Carte 85 x 55 mm - Imprimer a echelle reelle, sans ajustement) Tj',
      'ET'
    ].join('\n');
    const contentBytes = encoder.encode(content);

    startObj();
    write(`6 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    write(contentBytes);
    write('\nendstream\nendobj\n');

    const xrefStart = sizeOf();
    write(`xref\n0 ${offsets.length}\n`);
    write('0000000000 65535 f \n');
    for (let i = 1; i < offsets.length; i += 1) {
      write(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }
    write(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

    const total = sizeOf();
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  function triggerBlobDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function downloadCardImage(state, qrMode, onComplete) {
    try {
      const source = await generateCardCanvas(state, qrMode);
      const printCanvas = buildPrintCardCanvas(source);
      const jpegBytes = canvasToJpegBytes(printCanvas, 0.95);
      const pdfBytes = buildPrintablePdfBytes(
        jpegBytes,
        printCanvas.width,
        printCanvas.height
      );
      const safeFirst = (state.firstName || 'Carte').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeLast = (state.lastName || 'Visite').replace(/[^a-zA-Z0-9_-]/g, '_');
      const tpl = state.cardTemplate || 'editorial';
      const fileName = `Carte_Visite_${safeFirst}_${safeLast}_${tpl}_85x55mm.pdf`;
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      triggerBlobDownload(blob, fileName);
      if (typeof onComplete === 'function') onComplete(true, fileName);
    } catch (err) {
      console.error('Erreur génération carte imprimable:', err);
      if (typeof onComplete === 'function') onComplete(false, null);
    }
  }

  function listTemplates() {
    return CARD_TEMPLATES || {};
  }

  function getPrintSpecs() {
    return {
      cardWidthMm: PRINT_CARD_WIDTH_MM,
      cardHeightMm: PRINT_CARD_HEIGHT_MM,
      dpi: PRINT_DPI,
      pageWidthMm: PRINT_PAGE_WIDTH_MM,
      pageHeightMm: PRINT_PAGE_HEIGHT_MM,
      cardWidthPx: PRINT_CARD_WIDTH_PX,
      cardHeightPx: PRINT_CARD_HEIGHT_PX
    };
  }

  return {
    generateCardCanvas,
    renderCardToCanvas,
    downloadCardImage,
    listTemplates,
    getPrintSpecs
  };
})();
