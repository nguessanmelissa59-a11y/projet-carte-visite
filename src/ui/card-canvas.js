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

  /**
   * Impositions A4 : chaque ligne est une paire recto | verso cote a cote.
   * cols reste a 2 (recto puis verso) ; rows = nombre de cartes completes.
   */
  const PRINT_LAYOUTS = {
    single: { id: 'single', cols: 2, rows: 1 },
    sheet: { id: 'sheet', cols: 2, rows: 5 }
  };

  function resolvePrintLayout(layoutId) {
    return Object.prototype.hasOwnProperty.call(PRINT_LAYOUTS, layoutId)
      ? PRINT_LAYOUTS[layoutId]
      : PRINT_LAYOUTS.single;
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

  function getInitials(state) {
    return (
      ((state.firstName || '').charAt(0) + (state.lastName || '').charAt(0)) || 'VC'
    ).toUpperCase();
  }

  function getFullName(state) {
    return `${state.firstName || ''} ${state.lastName || ''}`.trim() || 'Votre Nom';
  }

  function getThemePalette(state) {
    return (THEME_PALETTES && THEME_PALETTES[state.theme]) || {};
  }

  /** Accent visuel carte (bandeaux, filets, or → couleur choisie). */
  function getAccent(state) {
    const palette = getThemePalette(state);
    return palette.bannerColor || palette.qrDark || '#0a6b45';
  }

  /** Teinte plus foncée pour modules QR (meilleur contraste de scan). */
  function getQrAccent(state) {
    const palette = getThemePalette(state);
    return palette.qrDark || palette.bannerColor || '#0a6b45';
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

  function drawHairline(ctx, x1, y1, x2, y2, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawCornerMarks(ctx, inset, arm, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    const pairs = [
      [inset, inset, 1, 0, 0, 1],
      [WIDTH - inset, inset, -1, 0, 0, 1],
      [inset, HEIGHT - inset, 1, 0, 0, -1],
      [WIDTH - inset, HEIGHT - inset, -1, 0, 0, -1]
    ];
    pairs.forEach(([x, y, hx, hy, vx, vy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + hx * arm, y + hy * arm);
      ctx.moveTo(x, y);
      ctx.lineTo(x + vx * arm, y + vy * arm);
      ctx.stroke();
    });
  }

  function drawMicroLabel(ctx, text, x, y, color, align) {
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.font = "600 10px 'IBM Plex Mono', monospace";
    ctx.fillText(String(text || '').toUpperCase(), x, y);
  }

  function drawIdentityBlock(ctx, state, x, y, opts) {
    const o = opts || {};
    const name = getFullName(state);
    const maxW = o.maxWidth || 500;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = o.nameColor || '#18181b';
    fitText(ctx, name, maxW, o.nameSize || 36, o.nameMin || 20, (s) =>
      `${o.nameWeight || 700} ${s}px 'Fraunces', Georgia, serif`
    );
    ctx.fillText(name, x, y);
    let cursor = y + (o.jobGap || 34);
    if (state.jobTitle) {
      ctx.fillStyle = o.jobColor || '#52525b';
      fitText(ctx, state.jobTitle, maxW, o.jobSize || 18, 13, (s) =>
        `500 ${s}px 'Figtree', sans-serif`
      );
      ctx.fillText(state.jobTitle, x, cursor);
      cursor += o.orgGap || 28;
    }
    if (state.organization) {
      ctx.fillStyle = o.orgColor || o.accent || '#18181b';
      ctx.font = o.orgMono
        ? "600 12px 'IBM Plex Mono', monospace"
        : "600 14px 'Figtree', sans-serif";
      const org = o.orgUpper ? state.organization.toUpperCase() : state.organization;
      fitText(ctx, org, maxW, o.orgMono ? 12 : 14, 11, (s) =>
        o.orgMono
          ? `600 ${s}px 'IBM Plex Mono', monospace`
          : `600 ${s}px 'Figtree', sans-serif`
      );
      ctx.fillText(org, x, cursor);
    }
  }

  function drawContactRows(ctx, items, x, startY, opts) {
    const options = opts || {};
    const labelColor = options.labelColor || '#a1a1aa';
    const valueColor = options.valueColor || '#18181b';
    const gap = options.gap || 54;
    const rule = options.rule || null;
    let y = startY;

    items.forEach((item, index) => {
      if (rule && index > 0) {
        drawHairline(ctx, x, y - gap * 0.38, x + (options.maxWidth || 520), y - gap * 0.38, rule, 1);
      }
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = labelColor;
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.fillText(item.label.toUpperCase(), x, y);
      if (options.bullet) {
        ctx.fillStyle = options.bullet;
        ctx.beginPath();
        ctx.arc(x - 14, y + 14, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = valueColor;
      fitText(
        ctx,
        item.value,
        options.maxWidth || 580,
        options.valueSize || 16,
        12,
        (s) => `500 ${s}px 'Figtree', sans-serif`
      );
      ctx.fillText(item.value, x, y + 22);
      y += gap;
    });
  }

  function drawContactColumns(ctx, items, x, startY, opts) {
    const options = opts || {};
    const colW = options.colWidth || 260;
    const gapX = options.gapX || 36;
    const gapY = options.gapY || 64;
    items.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = x + col * (colW + gapX);
      const cy = startY + row * gapY;
      ctx.textAlign = 'left';
      ctx.fillStyle = options.labelColor || '#a1a1aa';
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.fillText(item.label.toUpperCase(), cx, cy);
      ctx.fillStyle = options.valueColor || '#18181b';
      fitText(ctx, item.value, colW, 15, 11, (s) => `500 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(item.value, cx, cy + 22);
    });
  }

  async function drawQrPanel(ctx, state, qrMode, accentHex, frame) {
    const radius = frame.radius != null ? frame.radius : 16;
    const qrSize = frame.qrSize || (frame.compact ? 188 : 220);
    const pad = frame.pad != null ? frame.pad : frame.compact ? 18 : 24;
    const { x, y, w, h, bg, border, titleColor, subColor } = frame;

    if (bg) {
      ctx.fillStyle = bg;
      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.fill();
    }
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = frame.borderWidth || 1.25;
      drawRoundedRect(ctx, x, y, w, h, radius);
      ctx.stroke();
    }

    const qrCanvas = await buildQrCanvas(state, qrMode, getQrAccent(state) || accentHex, qrSize);
    const box = qrSize + 16;
    const boxX = x + (w - box) / 2;
    const boxY = y + pad;

    ctx.fillStyle = frame.qrBg || '#ffffff';
    drawRoundedRect(ctx, boxX, boxY, box, box, frame.qrRadius != null ? frame.qrRadius : 10);
    ctx.fill();
    ctx.drawImage(qrCanvas, boxX + 8, boxY + 8, qrSize, qrSize);

    if (frame.hideCaption) return;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = titleColor || '#09090b';
    ctx.font = "700 12px 'Fraunces', Georgia, serif";
    ctx.fillText(frame.title || 'SCANNER', x + w / 2, boxY + box + 28);
    if (!frame.hideSub) {
      ctx.fillStyle = subColor || '#71717a';
      ctx.font = "400 11px 'Figtree', sans-serif";
      ctx.fillText(frame.subtitle || 'Enregistrer le contact', x + w / 2, boxY + box + 48);
    }

    if (frame.hideUrl) return;

    const pillW = Math.min(w - 28, 210);
    const pillH = 28;
    const pillX = x + (w - pillW) / 2;
    const pillY = boxY + box + (frame.hideSub ? 40 : 64);
    ctx.fillStyle = frame.pillBg || '#ffffff';
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 7);
    ctx.fill();
    ctx.strokeStyle = border || '#e4e4e7';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 7);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    const url = getDisplayUrl(state, qrMode);
    fitText(ctx, url, pillW - 16, 11, 9, (s) => `600 ${s}px 'IBM Plex Mono', monospace`);
    ctx.fillText(url, x + w / 2, pillY + 19);
  }

  async function drawEditorial(ctx, state, qrMode, accentHex) {
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(36, 36, WIDTH - 72, HEIGHT - 72);
    ctx.fillStyle = accentHex;
    ctx.fillRect(36, 36, 8, HEIGHT - 72);
    drawCornerMarks(ctx, 18, 16, '#d4d4d8');
    drawMicroLabel(ctx, '01  ·  Éditorial', 60, 64, '#a1a1aa');
    drawMicroLabel(ctx, '85 × 55 mm', WIDTH - 56, 64, '#a1a1aa', 'right');

    await drawAvatar(ctx, state, 60, 92, 96, { radius: 14, fill: accentHex });
    drawIdentityBlock(ctx, state, 178, 128, {
      maxWidth: 480,
      nameSize: 34,
      accent: accentHex,
      orgColor: accentHex,
      orgUpper: true,
      orgMono: true
    });

    drawHairline(ctx, 60, 220, 700, 220, '#e4e4e7', 1);
    drawContactColumns(ctx, collectContacts(state), 60, 258, {
      labelColor: '#a1a1aa',
      valueColor: '#18181b',
      colWidth: 280,
      gapX: 40,
      gapY: 70
    });

    drawMicroLabel(ctx, 'Carte numérique', 60, HEIGHT - 52, '#a1a1aa');

    await drawQrPanel(ctx, state, qrMode, accentHex, {
      x: 760,
      y: 88,
      w: 280,
      h: 484,
      bg: '#f4f4f5',
      border: '#e4e4e7',
      titleColor: '#09090b',
      subColor: '#71717a',
      radius: 12,
      qrSize: 200,
      compact: true
    });
  }

  async function drawMinimal(ctx, state, qrMode) {
    const ink = '#1c1917';
    ctx.fillStyle = '#f6f1ea';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = ink;
    fitText(ctx, name, 620, 64, 32, (s) => `500 ${s}px 'Fraunces', Georgia, serif`);
    ctx.fillText(name, 72, 160);

    if (state.jobTitle) {
      ctx.fillStyle = '#78716c';
      fitText(ctx, state.jobTitle, 560, 22, 14, (s) => `400 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(state.jobTitle, 72, 204);
    }
    if (state.organization) {
      drawHairline(ctx, 72, 232, 200, 232, '#d6d3d1', 1);
      ctx.fillStyle = '#a8a29e';
      ctx.font = "500 13px 'Figtree', sans-serif";
      ctx.fillText(state.organization, 72, 258);
    }

    await drawAvatar(ctx, state, 72, 300, 72, {
      radius: 36,
      fill: ink,
      textColor: '#f6f1ea'
    });

    drawContactRows(ctx, collectContacts(state).slice(0, 4), 168, 318, {
      labelColor: '#a8a29e',
      valueColor: '#292524',
      gap: 48,
      maxWidth: 420,
      valueSize: 15
    });

    await drawQrPanel(ctx, state, qrMode, ink, {
      x: 780,
      y: 120,
      w: 250,
      h: 400,
      bg: '#fffdf9',
      border: '#e7e0d5',
      titleColor: ink,
      subColor: '#78716c',
      radius: 20,
      qrSize: 190,
      compact: true,
      hideSub: true,
      title: 'QR'
    });
  }

  async function drawCorporate(ctx, state, qrMode) {
    const deep = '#0b1c2c';
    const accent = '#2f6fed';
    const mist = '#e8eef6';

    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = deep;
    ctx.fillRect(0, 0, WIDTH, 132);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 132, WIDTH, 4);

    // Blueprint grid
    ctx.strokeStyle = 'rgba(47, 111, 237, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = 40; gx < WIDTH; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 136);
      ctx.lineTo(gx, HEIGHT);
      ctx.stroke();
    }
    for (let gy = 160; gy < HEIGHT; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(WIDTH, gy);
      ctx.stroke();
    }

    await drawAvatar(ctx, state, 48, 36, 78, {
      radius: 10,
      fill: accent,
      textColor: '#f8fafc'
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    fitText(ctx, getFullName(state), 520, 30, 18, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(getFullName(state), 148, 72);
    if (state.jobTitle) {
      ctx.fillStyle = '#93c5fd';
      ctx.font = "400 15px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 148, 100);
    }
    if (state.organization) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#bfdbfe';
      ctx.font = "600 12px 'IBM Plex Mono', monospace";
      ctx.fillText(state.organization.toUpperCase(), WIDTH - 48, 78);
    }

    drawMicroLabel(ctx, 'Coordonnées', 48, 178, '#64748b');
    drawContactColumns(ctx, collectContacts(state), 48, 210, {
      labelColor: '#64748b',
      valueColor: deep,
      colWidth: 300,
      gapX: 48,
      gapY: 72
    });

    await drawQrPanel(ctx, state, qrMode, deep, {
      x: 760,
      y: 168,
      w: 290,
      h: 440,
      bg: '#ffffff',
      border: '#cbd5e1',
      titleColor: deep,
      subColor: accent,
      radius: 10,
      qrSize: 200,
      compact: true
    });
  }

  async function drawCreative(ctx, state, qrMode) {
    ctx.fillStyle = '#fff8f1';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const band = ctx.createLinearGradient(0, 0, WIDTH * 0.7, HEIGHT);
    band.addColorStop(0, '#ff6b4a');
    band.addColorStop(0.55, '#fb7185');
    band.addColorStop(1, '#f59e0b');
    ctx.fillStyle = band;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(WIDTH * 0.62, 0);
    ctx.lineTo(WIDTH * 0.38, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(180, 120, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(80, 420, 140, 0, Math.PI * 2);
    ctx.fill();

    await drawAvatar(ctx, state, 56, 56, 120, {
      radius: 60,
      fill: '#7f1d1d',
      ring: '#ffffff',
      textColor: '#fff7ed'
    });

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 56, 220, 420, 360, 28);
    ctx.fill();

    drawIdentityBlock(ctx, state, 84, 280, {
      maxWidth: 360,
      nameSize: 32,
      nameColor: '#1c1917',
      jobColor: '#c2410c',
      orgColor: '#9a3412',
      orgUpper: false
    });

    drawContactRows(ctx, collectContacts(state).slice(0, 3), 84, 400, {
      labelColor: '#ea580c',
      valueColor: '#1c1917',
      gap: 48,
      maxWidth: 360,
      valueSize: 15
    });

    await drawQrPanel(ctx, state, qrMode, '#9f1239', {
      x: 720,
      y: 120,
      w: 320,
      h: 420,
      bg: '#ffffff',
      border: '#fdba74',
      titleColor: '#9f1239',
      subColor: '#9a3412',
      radius: 24,
      qrSize: 210
    });
  }

  async function drawEco(ctx, state, qrMode) {
    ctx.fillStyle = '#f3f6f0';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Botanical arcs
    ctx.strokeStyle = 'rgba(77, 124, 90, 0.28)';
    ctx.lineWidth = 2;
    [
      [920, -40, 280],
      [1040, 80, 220],
      [-60, 620, 260],
      [120, 720, 200]
    ].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(194, 109, 62, 0.12)';
    ctx.beginPath();
    ctx.ellipse(980, 560, 160, 100, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 44, 44, 640, HEIGHT - 88, 32);
    ctx.fill();

    await drawAvatar(ctx, state, 76, 76, 104, {
      radius: 52,
      fill: '#4d7c5a',
      textColor: '#eef2eb'
    });
    drawIdentityBlock(ctx, state, 204, 118, {
      maxWidth: 430,
      nameSize: 34,
      nameColor: '#1f2a24',
      jobColor: '#4d7c5a',
      orgColor: '#c26d3e'
    });

    drawHairline(ctx, 76, 220, 640, 220, '#d7e3d4', 1);
    drawContactRows(ctx, collectContacts(state), 76, 258, {
      labelColor: '#7a8f7e',
      valueColor: '#1f2a24',
      gap: 52,
      maxWidth: 540,
      rule: '#e4ece1'
    });

    await drawQrPanel(ctx, state, qrMode, '#4d7c5a', {
      x: 720,
      y: 90,
      w: 320,
      h: 480,
      bg: 'rgba(255,255,255,0.88)',
      border: '#c9d8c6',
      titleColor: '#1f2a24',
      subColor: '#4d7c5a',
      radius: 28,
      qrSize: 200,
      compact: true
    });
  }

  async function drawPrestige(ctx, state, qrMode) {
    const gold = '#c9a227';
    const cream = '#f5e6b8';
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 28, 28, WIDTH - 56, HEIGHT - 56, 6);
    ctx.stroke();
    drawRoundedRect(ctx, 42, 42, WIDTH - 84, HEIGHT - 84, 3);
    ctx.stroke();

    // Centered invitation layout
    await drawAvatar(ctx, state, WIDTH / 2 - 52, 78, 104, {
      radius: 52,
      fill: '#171717',
      ring: gold,
      textColor: gold
    });

    const name = getFullName(state);
    ctx.textAlign = 'center';
    ctx.fillStyle = cream;
    fitText(ctx, name, 720, 40, 24, (s) => `500 ${s}px 'Fraunces', Georgia, serif`);
    ctx.fillText(name, WIDTH / 2, 230);
    if (state.jobTitle) {
      ctx.fillStyle = gold;
      ctx.font = "400 16px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, WIDTH / 2, 262);
    }
    if (state.organization) {
      drawHairline(ctx, WIDTH / 2 - 60, 284, WIDTH / 2 + 60, 284, gold, 1);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = "500 12px 'IBM Plex Mono', monospace";
      ctx.fillText(state.organization.toUpperCase(), WIDTH / 2, 308);
    }

    const contacts = collectContacts(state).slice(0, 4);
    const rowW = 900;
    const startX = (WIDTH - rowW) / 2;
    contacts.forEach((item, i) => {
      const cx = startX + i * (rowW / Math.max(contacts.length, 1)) + rowW / contacts.length / 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#737373';
      ctx.font = "600 9px 'IBM Plex Mono', monospace";
      ctx.fillText(item.label.toUpperCase(), cx, 360);
      ctx.fillStyle = '#f5f5f4';
      fitText(ctx, item.value, 200, 13, 10, (s) => `500 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(item.value, cx, 384);
    });

    await drawQrPanel(ctx, state, qrMode, '#0a0a0a', {
      x: WIDTH / 2 - 120,
      y: 420,
      w: 240,
      h: 200,
      bg: '#141414',
      border: gold,
      titleColor: cream,
      subColor: gold,
      radius: 8,
      qrSize: 132,
      compact: true,
      hideSub: true,
      hideUrl: true,
      title: 'SCAN',
      qrRadius: 6
    });
  }

  async function drawNocturne(ctx, state, qrMode) {
    ctx.fillStyle = '#0c0c0e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Constellation
    ctx.fillStyle = 'rgba(250,250,250,0.35)';
    const stars = [
      [120, 80],
      [220, 140],
      [160, 200],
      [980, 90],
      [900, 160],
      [1040, 240],
      [860, 520],
      [70, 560]
    ];
    stars.forEach(([sx, sy], i) => {
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = 'rgba(161,161,170,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 80);
    ctx.lineTo(220, 140);
    ctx.lineTo(160, 200);
    ctx.stroke();

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 12, HEIGHT);
    ctx.fillStyle = '#a1a1aa';
    ctx.fillRect(12, 0, 2, HEIGHT);

    await drawAvatar(ctx, state, 56, 64, 112, {
      radius: 18,
      fill: '#27272a',
      textColor: '#fafafa'
    });
    drawIdentityBlock(ctx, state, 192, 108, {
      maxWidth: 480,
      nameSize: 36,
      nameColor: '#fafafa',
      jobColor: '#a1a1aa',
      orgColor: '#d4d4d8',
      orgMono: true,
      orgUpper: true
    });

    drawContactRows(ctx, collectContacts(state), 56, 260, {
      labelColor: '#71717a',
      valueColor: '#e4e4e7',
      gap: 52,
      maxWidth: 560,
      bullet: '#a1a1aa'
    });

    await drawQrPanel(ctx, state, qrMode, '#09090b', {
      x: 740,
      y: 80,
      w: 300,
      h: 500,
      bg: '#141416',
      border: '#3f3f46',
      titleColor: '#fafafa',
      subColor: '#a1a1aa',
      radius: 14,
      qrSize: 210,
      compact: true
    });
  }

  async function drawAtelier(ctx, state, qrMode) {
    ctx.fillStyle = '#f4ebdf';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawCornerMarks(ctx, 22, 18, '#2a2118');

    ctx.fillStyle = '#2a2118';
    ctx.fillRect(0, 0, WIDTH, 10);
    ctx.fillRect(0, HEIGHT - 10, WIDTH, 10);
    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(0, 10, WIDTH, 3);
    ctx.fillRect(0, HEIGHT - 13, WIDTH, 3);

    // Paper grain lines
    ctx.strokeStyle = 'rgba(42, 33, 24, 0.04)';
    ctx.lineWidth = 1;
    for (let y = 40; y < HEIGHT - 40; y += 7) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(WIDTH - 40, y);
      ctx.stroke();
    }

    drawMicroLabel(ctx, 'Atelier · épreuve', 56, 48, '#8b5e3c');
    drawMicroLabel(ctx, 'Reg. A', WIDTH - 56, 48, '#8b5e3c', 'right');

    await drawAvatar(ctx, state, 56, 78, 118, {
      radius: 10,
      fill: '#2a2118',
      textColor: '#f7f1e8'
    });
    drawIdentityBlock(ctx, state, 198, 124, {
      maxWidth: 480,
      nameSize: 36,
      nameColor: '#2a2118',
      jobColor: '#8b5e3c',
      orgColor: '#5c4030'
    });

    drawHairline(ctx, 56, 230, 680, 230, '#d6c4ae', 1.5);
    drawContactRows(ctx, collectContacts(state), 56, 268, {
      labelColor: '#a18060',
      valueColor: '#2a2118',
      gap: 50,
      maxWidth: 560,
      rule: '#e8dccb'
    });

    // Ink stamp feel for QR
    await drawQrPanel(ctx, state, qrMode, '#2a2118', {
      x: 730,
      y: 90,
      w: 310,
      h: 480,
      bg: '#fffaf2',
      border: '#2a2118',
      borderWidth: 2,
      titleColor: '#2a2118',
      subColor: '#8b5e3c',
      radius: 8,
      qrSize: 200,
      compact: true,
      title: 'TIMBRE QR'
    });
  }

  async function drawLagoon(ctx, state, qrMode) {
    ctx.fillStyle = '#e6f7f8';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const layers = [
      ['#0f766e', 0, 118],
      ['#14b8a6', 90, 100],
      ['#5eead4', 170, 70]
    ];
    layers.forEach(([color, y, h], i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, y + 30);
      ctx.bezierCurveTo(220, y - 10 - i * 8, 480, y + 50, 760, y + 10);
      ctx.bezierCurveTo(920, y - 10, WIDTH, y + 40, WIDTH, y + 40);
      ctx.lineTo(WIDTH, y + h);
      ctx.lineTo(0, y + h);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 48, 210, 640, 400, 24);
    ctx.fill();

    await drawAvatar(ctx, state, 72, 72, 100, {
      radius: 50,
      fill: '#0f766e',
      ring: '#ffffff',
      textColor: '#ecfeff'
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    fitText(ctx, getFullName(state), 520, 34, 20, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(getFullName(state), 196, 118);
    if (state.jobTitle) {
      ctx.fillStyle = 'rgba(236,254,255,0.85)';
      ctx.font = "500 16px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 196, 148);
    }

    drawContactRows(ctx, collectContacts(state), 72, 260, {
      labelColor: '#0f766e',
      valueColor: '#115e59',
      gap: 50,
      maxWidth: 560
    });

    await drawQrPanel(ctx, state, qrMode, '#0f766e', {
      x: 720,
      y: 220,
      w: 320,
      h: 380,
      bg: '#ffffff',
      border: '#99f6e4',
      titleColor: '#134e4a',
      subColor: '#0f766e',
      radius: 20,
      qrSize: 190,
      compact: true
    });
  }

  async function drawSlate(ctx, state, qrMode) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 88, HEIGHT);

    ctx.save();
    ctx.translate(44, HEIGHT / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText('PLAN  ·  ARDOISE', 0, 0);
    ctx.restore();

    // Elevation ticks
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    for (let i = 0; i < 11; i += 1) {
      const y = 70 + i * 50;
      ctx.beginPath();
      ctx.moveTo(110, y);
      ctx.lineTo(i % 2 === 0 ? 140 : 128, y);
      ctx.stroke();
    }
    drawHairline(ctx, 150, 70, 680, 70, '#e2e8f0', 1);
    drawHairline(ctx, 150, HEIGHT - 70, 680, HEIGHT - 70, '#e2e8f0', 1);

    await drawAvatar(ctx, state, 160, 96, 100, {
      radius: 12,
      fill: '#334155',
      textColor: '#f8fafc'
    });
    drawIdentityBlock(ctx, state, 284, 138, {
      maxWidth: 380,
      nameSize: 34,
      nameColor: '#0f172a',
      jobColor: '#64748b',
      orgColor: '#334155',
      orgMono: true,
      orgUpper: true
    });

    drawContactRows(ctx, collectContacts(state), 160, 260, {
      labelColor: '#94a3b8',
      valueColor: '#1e293b',
      gap: 52,
      maxWidth: 500,
      rule: '#e2e8f0'
    });

    await drawQrPanel(ctx, state, qrMode, '#334155', {
      x: 740,
      y: 80,
      w: 300,
      h: 500,
      bg: '#ffffff',
      border: '#cbd5e1',
      titleColor: '#0f172a',
      subColor: '#64748b',
      radius: 6,
      qrSize: 210,
      compact: true
    });
  }

  async function drawSunset(ctx, state, qrMode) {
    ctx.fillStyle = '#1c0a05';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.7);
    sky.addColorStop(0, '#431407');
    sky.addColorStop(0.35, '#9a3412');
    sky.addColorStop(0.7, '#ea580c');
    sky.addColorStop(1, '#fb923c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.72);

    // Sun disk
    const sun = ctx.createRadialGradient(820, 210, 20, 820, 210, 160);
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.45, '#fb923c');
    sun.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(820, 210, 160, 0, Math.PI * 2);
    ctx.fill();

    // Horizon land
    ctx.fillStyle = '#1c0a05';
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT * 0.62);
    ctx.quadraticCurveTo(280, HEIGHT * 0.54, 560, HEIGHT * 0.64);
    ctx.quadraticCurveTo(820, HEIGHT * 0.72, WIDTH, HEIGHT * 0.58);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(0, HEIGHT);
    ctx.closePath();
    ctx.fill();

    await drawAvatar(ctx, state, 56, 56, 96, {
      radius: 48,
      fill: '#7c2d12',
      ring: '#ffedd5',
      textColor: '#fff7ed'
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff7ed';
    fitText(ctx, getFullName(state), 520, 36, 22, (s) => `700 ${s}px 'Fraunces', serif`);
    ctx.fillText(getFullName(state), 176, 100);
    if (state.jobTitle) {
      ctx.fillStyle = '#fdba74';
      ctx.font = "500 16px 'Figtree', sans-serif";
      ctx.fillText(state.jobTitle, 176, 130);
    }

    ctx.fillStyle = '#fff7ed';
    drawRoundedRect(ctx, 48, 420, 620, 190, 18);
    ctx.fill();
    drawContactColumns(ctx, collectContacts(state).slice(0, 4), 72, 460, {
      labelColor: '#c2410c',
      valueColor: '#7c2d12',
      colWidth: 260,
      gapX: 40,
      gapY: 70
    });

    await drawQrPanel(ctx, state, qrMode, '#9a3412', {
      x: 720,
      y: 360,
      w: 320,
      h: 250,
      bg: '#fff7ed',
      border: '#fdba74',
      titleColor: '#7c2d12',
      subColor: '#c2410c',
      radius: 16,
      qrSize: 140,
      compact: true,
      hideSub: true,
      hideUrl: true,
      title: 'SCAN'
    });
  }

  async function drawSumi(ctx, state, qrMode) {
    ctx.fillStyle = '#f7f7f5';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = '#111111';
    ctx.fillRect(48, 48, 10, HEIGHT - 96);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(62, 48, 4, HEIGHT - 96);

    // Large empty ma, identity top
    await drawAvatar(ctx, state, 100, 72, 92, {
      radius: 6,
      fill: '#111111',
      textColor: '#fafafa'
    });
    drawIdentityBlock(ctx, state, 216, 112, {
      maxWidth: 460,
      nameSize: 38,
      nameColor: '#111111',
      jobColor: '#525252',
      orgColor: '#b91c1c',
      orgMono: true,
      orgUpper: true
    });

    drawHairline(ctx, 100, 210, 700, 210, '#e5e5e5', 1);
    drawContactRows(ctx, collectContacts(state), 100, 250, {
      labelColor: '#a3a3a3',
      valueColor: '#171717',
      gap: 52,
      maxWidth: 540
    });

    // Hanko seal (vermillion stamp)
    const sealX = 620;
    const sealY = 470;
    ctx.save();
    ctx.translate(sealX, sealY);
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, -46, -46, 92, 92, 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(185, 28, 28, 0.08)';
    drawRoundedRect(ctx, -46, -46, 92, 92, 8);
    ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = "700 28px 'Fraunces', serif";
    ctx.fillText(getInitials(state), 0, 2);
    ctx.restore();

    await drawQrPanel(ctx, state, qrMode, '#111111', {
      x: 760,
      y: 72,
      w: 280,
      h: 516,
      bg: '#ffffff',
      border: '#d4d4d4',
      titleColor: '#111111',
      subColor: '#b91c1c',
      radius: 4,
      qrSize: 210,
      compact: true,
      title: 'QR'
    });
  }

  async function drawArctic(ctx, state, qrMode) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Ice facets
    const facets = [
      ['#e2e8f0', [0, 0, 380, 0, 220, 280]],
      ['#bae6fd', [WIDTH, 0, WIDTH, 300, 680, 0]],
      ['#cbd5e1', [0, HEIGHT, 0, 380, 360, HEIGHT]],
      ['#7dd3fc', [WIDTH, HEIGHT, 740, HEIGHT, WIDTH, 400]]
    ];
    facets.forEach(([color, [x1, y1, x2, y2, x3, y3]]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 56, 56, WIDTH - 112, HEIGHT - 112, 20);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 56, 56, WIDTH - 112, HEIGHT - 112, 20);
    ctx.stroke();

    await drawAvatar(ctx, state, 88, 88, 100, {
      radius: 16,
      fill: '#0284c7',
      textColor: '#f0f9ff'
    });
    drawIdentityBlock(ctx, state, 214, 128, {
      maxWidth: 460,
      nameSize: 34,
      nameColor: '#0f172a',
      jobColor: '#0284c7',
      orgColor: '#1e293b',
      orgMono: true,
      orgUpper: true
    });

    drawContactColumns(ctx, collectContacts(state), 88, 260, {
      labelColor: '#64748b',
      valueColor: '#1e293b',
      colWidth: 280,
      gapX: 36,
      gapY: 68
    });

    await drawQrPanel(ctx, state, qrMode, '#0ea5e9', {
      x: 740,
      y: 100,
      w: 280,
      h: 460,
      bg: '#f8fafc',
      border: '#bae6fd',
      titleColor: '#0f172a',
      subColor: '#0284c7',
      radius: 14,
      qrSize: 190,
      compact: true
    });
  }

  async function drawMetro(ctx, state, qrMode) {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, 400, HEIGHT);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(400, 0, 14, HEIGHT);

    // Route line
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(56, 300);
    ctx.lineTo(56, 560);
    ctx.stroke();

    await drawAvatar(ctx, state, 48, 48, 100, {
      radius: 8,
      fill: '#fde047',
      textColor: '#18181b'
    });

    const name = getFullName(state);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fafafa';
    fitText(ctx, name, 280, 28, 16, (s) => `800 ${s}px 'Fraunces', serif`);
    ctx.fillText(name, 48, 190);
    if (state.jobTitle) {
      ctx.fillStyle = '#fde047';
      fitText(ctx, state.jobTitle, 280, 14, 11, (s) => `500 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(state.jobTitle, 48, 220);
    }
    if (state.organization) {
      drawMicroLabel(ctx, state.organization, 48, 250, '#a1a1aa');
    }

    const stops = collectContacts(state).slice(0, 4);
    stops.forEach((item, i) => {
      const y = 320 + i * 58;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(56, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(56, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a1a1aa';
      ctx.font = "600 9px 'IBM Plex Mono', monospace";
      ctx.fillText(item.label.toUpperCase(), 80, y - 8);
      ctx.fillStyle = '#f4f4f5';
      fitText(ctx, item.value, 260, 14, 11, (s) => `500 ${s}px 'Figtree', sans-serif`);
      ctx.fillText(item.value, 80, y + 14);
    });

    await drawQrPanel(ctx, state, qrMode, '#18181b', {
      x: 460,
      y: 70,
      w: 560,
      h: 520,
      bg: '#ffffff',
      border: '#e4e4e7',
      titleColor: '#18181b',
      subColor: '#71717a',
      radius: 12,
      qrSize: 240,
      title: 'STATION QR'
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

  function getVersoPalette(state) {
    const templateId =
      state.cardTemplate && RENDERERS[state.cardTemplate] ? state.cardTemplate : 'editorial';
    const tpl = (CARD_TEMPLATES && CARD_TEMPLATES[templateId]) || {};
    const swatch = tpl.swatch || ['#ffffff', '#18181b', '#e4e4e7'];
    const themeAccent = getAccent(state);
    const darkFaces = new Set(['nocturne', 'prestige', 'metro', 'sunset']);
    const isDark = darkFaces.has(templateId);

    // Le modèle garde sa structure ; la couleur choisie remplace l’accent de charte.
    if (templateId === 'metro') {
      return {
        id: templateId,
        bg: '#fafafa',
        accent: '#18181b',
        secondary: themeAccent,
        isDark: true
      };
    }

    if (templateId === 'prestige' || templateId === 'sunset') {
      return {
        id: templateId,
        bg: themeAccent,
        accent: '#0a0a0a',
        secondary: swatch[2] || '#f5e6b8',
        isDark: true
      };
    }

    if (templateId === 'nocturne') {
      return {
        id: templateId,
        bg: '#0c0c0e',
        accent: '#18181b',
        secondary: themeAccent,
        isDark: true
      };
    }

    return {
      id: templateId,
      bg: swatch[0],
      accent: themeAccent,
      secondary: swatch[2] || themeAccent,
      isDark
    };
  }

  function getBrandTitle(state) {
    const org = (state.organization || '').trim();
    if (org) return org;
    return getFullName(state);
  }

  async function drawVersoLogoMark(ctx, state, x, y, size, palette) {
    const logoSrc =
      QrView && typeof QrView.getLogoSrc === 'function' ? QrView.getLogoSrc(state) : '';
    const logoImg = await loadImage(logoSrc);
    const fill = palette.isDark ? palette.secondary : palette.accent;
    const textColor = palette.isDark ? palette.accent : '#ffffff';

    if (logoImg) {
      const pad = Math.round(size * 0.08);
      ctx.fillStyle = '#ffffff';
      drawRoundedRect(ctx, x, y, size, size, Math.round(size * 0.22));
      ctx.fill();
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, x, y, size, size, Math.round(size * 0.22));
      ctx.stroke();
      ctx.save();
      drawRoundedRect(
        ctx,
        x + pad,
        y + pad,
        size - pad * 2,
        size - pad * 2,
        Math.round(size * 0.16)
      );
      ctx.clip();
      ctx.drawImage(logoImg, x + pad, y + pad, size - pad * 2, size - pad * 2);
      ctx.restore();
      return;
    }

    await drawAvatar(ctx, state, x, y, size, {
      radius: Math.round(size * 0.22),
      fill,
      textColor
    });
  }

  function drawVersoDecoration(ctx, palette) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (palette.id === 'sunset') {
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, '#431407');
      sky.addColorStop(0.45, palette.accent);
      sky.addColorStop(1, palette.secondary);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#fde68a';
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(WIDTH * 0.72, HEIGHT * 0.28, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1c0a05';
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT * 0.62);
      ctx.quadraticCurveTo(WIDTH * 0.4, HEIGHT * 0.52, WIDTH, HEIGHT * 0.68);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (palette.id === 'creative') {
      const band = ctx.createLinearGradient(0, 0, WIDTH * 0.6, HEIGHT);
      band.addColorStop(0, palette.accent);
      band.addColorStop(1, palette.secondary);
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH * 0.55, 0);
      ctx.lineTo(WIDTH * 0.32, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (palette.id === 'metro') {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, WIDTH * 0.4, HEIGHT);
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(WIDTH * 0.4, 0, 14, HEIGHT);
      return;
    }

    if (palette.id === 'sumi') {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, 18, HEIGHT);
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(18, 0, 6, HEIGHT);
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 3;
      drawRoundedRect(ctx, WIDTH * 0.72, HEIGHT * 0.62, 88, 88, 8);
      ctx.stroke();
      return;
    }

    if (palette.id === 'atelier') {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, WIDTH, 12);
      ctx.fillRect(0, HEIGHT - 12, WIDTH, 12);
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(0, 12, WIDTH, 3);
      ctx.fillRect(0, HEIGHT - 15, WIDTH, 3);
      drawCornerMarks(ctx, 24, 16, palette.accent);
      return;
    }

    if (palette.id === 'arctic') {
      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH * 0.4, 0);
      ctx.lineTo(WIDTH * 0.22, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(WIDTH, 0);
      ctx.lineTo(WIDTH, HEIGHT * 0.45);
      ctx.lineTo(WIDTH * 0.62, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    if (palette.isDark) {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = palette.secondary;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH * 0.55, 0);
      ctx.quadraticCurveTo(WIDTH * 0.35, HEIGHT * 0.5, WIDTH * 0.58, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    if (palette.id === 'lagoon' || palette.id === 'slate') {
      ctx.fillStyle = palette.secondary;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(WIDTH * 0.46, 0);
      ctx.quadraticCurveTo(WIDTH * 0.32, HEIGHT * 0.5, WIDTH * 0.5, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(0, HEIGHT * 0.2);
      ctx.quadraticCurveTo(WIDTH * 0.22, HEIGHT * 0.45, 0, HEIGHT * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = palette.accent;
    ctx.fillRect(0, 0, WIDTH * 0.38, HEIGHT);
    ctx.fillStyle = palette.bg;
    ctx.beginPath();
    ctx.moveTo(WIDTH * 0.3, 0);
    ctx.quadraticCurveTo(WIDTH * 0.44, HEIGHT * 0.35, WIDTH * 0.32, HEIGHT * 0.7);
    ctx.quadraticCurveTo(WIDTH * 0.26, HEIGHT * 0.9, WIDTH * 0.4, HEIGHT);
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.lineTo(WIDTH, 0);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Verso : meme charte que le template, face branding (logo / org),
   * sans recopier telephone, e-mail ni QR du recto.
   */
  async function drawVerso(ctx, state, _qrMode, _accentHex) {
    const palette = getVersoPalette(state);
    drawVersoDecoration(ctx, palette);

    const brand = getBrandTitle(state);
    const contentOnDark = palette.isDark && palette.id !== 'metro';
    const contentLeft = contentOnDark ? 0 : WIDTH * 0.38;
    const contentWidth = WIDTH - contentLeft;
    const centerX = contentLeft + contentWidth / 2;
    const capsuleW = Math.min(520, contentWidth - 80);
    const capsuleH = 120;
    const capsuleX = centerX - capsuleW / 2;
    const capsuleY = HEIGHT / 2 - capsuleH / 2 - 10;

    const stroke = contentOnDark ? palette.secondary : palette.accent;
    const ink = contentOnDark ? '#fafafa' : '#18181b';

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, capsuleX, capsuleY, capsuleW, capsuleH, 56);
    ctx.stroke();

    const markSize = 72;
    const markX = capsuleX + 28;
    const markY = capsuleY + (capsuleH - markSize) / 2;
    await drawVersoLogoMark(ctx, state, markX, markY, markSize, palette);

    const textX = markX + markSize + 22;
    const textMax = capsuleX + capsuleW - textX - 28;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    fitText(ctx, brand, textMax, 34, 18, (s) => `700 ${s}px 'Fraunces', Georgia, serif`);
    ctx.fillText(brand, textX, capsuleY + capsuleH / 2);

    if (state.location) {
      ctx.textAlign = 'center';
      ctx.fillStyle = contentOnDark ? 'rgba(250,250,250,0.65)' : '#71717a';
      ctx.font = "400 18px 'Figtree', system-ui, sans-serif";
      ctx.fillText(state.location, centerX, capsuleY + capsuleH + 48);
    }
  }

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

  async function generateVersoCanvas(state, qrMode) {
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
    const accentHex = getAccent(state);
    await drawVerso(ctx, state, qrMode, accentHex);
    return canvas;
  }

  async function paintGeneratedToTarget(targetCanvas, offscreen) {
    if (!targetCanvas || !offscreen) return;
    targetCanvas.width = offscreen.width;
    targetCanvas.height = offscreen.height;
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(offscreen, 0, 0);
  }

  async function renderCardToCanvas(targetCanvas, state, qrMode) {
    if (!targetCanvas) return;
    try {
      const offscreen = await generateCardCanvas(state, qrMode);
      await paintGeneratedToTarget(targetCanvas, offscreen);
    } catch (err) {
      console.error('Erreur renderCardToCanvas:', err);
    }
  }

  async function renderVersoToCanvas(targetCanvas, state, qrMode) {
    if (!targetCanvas) return;
    try {
      const offscreen = await generateVersoCanvas(state, qrMode);
      await paintGeneratedToTarget(targetCanvas, offscreen);
    } catch (err) {
      console.error('Erreur renderVersoToCanvas:', err);
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

  /**
   * Contenu d'une page : chaque ligne place le recto (Im0) a gauche et le verso (Im1)
   * a droite, grille centree, traits de coupe, puis libelle.
   */
  function buildPageContent(layout, pageW, pageH, cardW, cardH, label) {
    const mark = 8;
    const gap = 2;
    const cols = 2;
    const rows = Math.max(1, layout && layout.rows ? layout.rows : 1);
    const gridW = cardW * cols;
    const gridH = cardH * rows;
    const originX = (pageW - gridW) / 2;
    const originY = (pageH - gridH) / 2;
    const right = originX + gridW;
    const top = originY + gridH;
    const safeLabel = String(label || '')
      .replace(/[()\\]/g, ' ')
      .slice(0, 90);
    const ops = [];

    for (let row = 0; row < rows; row += 1) {
      const y = originY + row * cardH;
      const xRecto = originX;
      const xVerso = originX + cardW;
      ops.push(
        'q',
        `${cardW.toFixed(2)} 0 0 ${cardH.toFixed(2)} ${xRecto.toFixed(2)} ${y.toFixed(2)} cm`,
        '/Im0 Do',
        'Q',
        'q',
        `${cardW.toFixed(2)} 0 0 ${cardH.toFixed(2)} ${xVerso.toFixed(2)} ${y.toFixed(2)} cm`,
        '/Im1 Do',
        'Q'
      );
    }

    ops.push('0.4 w', '0 0 0 RG');
    for (let col = 0; col <= cols; col += 1) {
      const x = (originX + col * cardW).toFixed(2);
      ops.push(
        `${x} ${(originY - mark).toFixed(2)} m ${x} ${(originY - gap).toFixed(2)} l S`,
        `${x} ${(top + gap).toFixed(2)} m ${x} ${(top + mark).toFixed(2)} l S`
      );
    }
    for (let row = 0; row <= rows; row += 1) {
      const y = (originY + row * cardH).toFixed(2);
      ops.push(
        `${(originX - mark).toFixed(2)} ${y} m ${(originX - gap).toFixed(2)} ${y} l S`,
        `${(right + gap).toFixed(2)} ${y} m ${(right + mark).toFixed(2)} ${y} l S`
      );
    }

    const labelY = Math.max(originY - 28, 12);
    ops.push(
      'BT /F1 9 Tf 0.35 0.35 0.35 rg',
      `50 ${labelY.toFixed(2)} Td`,
      `(${safeLabel}) Tj`,
      'ET'
    );
    return ops.join('\n');
  }

  /**
   * Construit un PDF A4 d'une page : recto et verso cote a cote (une ou plusieurs paires).
   * @param {Array<{jpegBytes: Uint8Array, pixelW: number, pixelH: number, label?: string}>} pages
   *        pages[0] = recto, pages[1] = verso
   * @param {{cols: number, rows: number}} [layout]
   */
  function buildPrintablePdfBytes(pages, layout) {
    const pageList = Array.isArray(pages) ? pages : [];
    if (!pageList.length) {
      throw new Error('PDF imprimable: aucune page');
    }

    const recto = pageList[0];
    const verso = pageList[1] || pageList[0];
    const hasGrid = layout && layout.cols > 0 && layout.rows > 0;
    const pageLayout = hasGrid ? layout : PRINT_LAYOUTS.single;
    const pageW = PRINT_PAGE_WIDTH_MM * MM_TO_PT;
    const pageH = PRINT_PAGE_HEIGHT_MM * MM_TO_PT;
    const cardW = PRINT_CARD_WIDTH_MM * MM_TO_PT;
    const cardH = PRINT_CARD_HEIGHT_MM * MM_TO_PT;
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    const label =
      recto.label ||
      'Recto + verso 85 x 55 mm - cote a cote - Imprimer a 100%';

    function sizeOf() {
      return chunks.reduce((n, c) => n + c.length, 0);
    }

    function write(data) {
      if (typeof data === 'string') chunks.push(encoder.encode(data));
      else chunks.push(data);
    }

    function startObj() {
      offsets.push(sizeOf());
      return offsets.length - 1;
    }

    function writeJpegImage(objId, face) {
      startObj();
      write(
        `${objId} 0 obj\n<< /Type /XObject /Subtype /Image ` +
          `/Width ${face.pixelW} /Height ${face.pixelH} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
          `/Length ${face.jpegBytes.length} >>\nstream\n`
      );
      write(face.jpegBytes);
      write('endstream\nendobj\n');
    }

    write('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    const pageObjId = 3;
    const rectoImageObjId = 4;
    const versoImageObjId = 5;
    const contentObjId = 6;
    const fontObjId = 7;

    startObj();
    write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    startObj();
    write('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    startObj();
    write(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] ` +
        `/Resources << /XObject << /Im0 ${rectoImageObjId} 0 R /Im1 ${versoImageObjId} 0 R >> ` +
        `/Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
    );

    writeJpegImage(rectoImageObjId, recto);
    writeJpegImage(versoImageObjId, verso);

    const content = buildPageContent(pageLayout, pageW, pageH, cardW, cardH, label);
    const contentBytes = encoder.encode(content);
    startObj();
    write(`${contentObjId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    write(contentBytes);
    write('\nendstream\nendobj\n');

    startObj();
    write(
      `${fontObjId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
    );

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

  /**
   * Genere et telecharge le PDF imprimable recto + verso.
   * @param {object} state
   * @param {string} qrMode
   * @param {(ok: boolean, fileName: string|null) => void} [onComplete]
   * @param {{layout?: string}} [options] layout : 'single' (defaut) ou 'sheet'
   */
  async function downloadCardImage(state, qrMode, onComplete, options) {
    try {
      const layout = resolvePrintLayout(options && options.layout);
      const cardCount = layout.rows;
      const isSheet = cardCount > 1;
      const [rectoSource, versoSource] = await Promise.all([
        generateCardCanvas(state, qrMode),
        generateVersoCanvas(state, qrMode)
      ]);
      const rectoPrint = buildPrintCardCanvas(rectoSource);
      const versoPrint = buildPrintCardCanvas(versoSource);
      const pdfBytes = buildPrintablePdfBytes(
        [
          {
            jpegBytes: canvasToJpegBytes(rectoPrint, 0.95),
            pixelW: rectoPrint.width,
            pixelH: rectoPrint.height,
            label: isSheet
              ? `Planche ${cardCount} cartes - recto | verso cote a cote - 85 x 55 mm - Imprimer a 100%`
              : 'Recto | verso cote a cote - 85 x 55 mm - Fond perdu 3 mm / marges 4 mm - Imprimer a 100%'
          },
          {
            jpegBytes: canvasToJpegBytes(versoPrint, 0.95),
            pixelW: versoPrint.width,
            pixelH: versoPrint.height
          }
        ],
        layout
      );
      const safeFirst = (state.firstName || 'Carte').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeLast = (state.lastName || 'Visite').replace(/[^a-zA-Z0-9_-]/g, '_');
      const tpl = state.cardTemplate || 'editorial';
      const layoutTag = isSheet ? `_planche-${cardCount}` : '';
      const fileName = `Carte_Visite_${safeFirst}_${safeLast}_${tpl}${layoutTag}_recto-verso_85x55mm.pdf`;
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
      cardHeightPx: PRINT_CARD_HEIGHT_PX,
      sheetCols: PRINT_LAYOUTS.sheet.cols,
      sheetRows: PRINT_LAYOUTS.sheet.rows
    };
  }

  return {
    generateCardCanvas,
    generateVersoCanvas,
    renderCardToCanvas,
    renderVersoToCanvas,
    downloadCardImage,
    buildPrintablePdfBytes,
    resolvePrintLayout,
    listTemplates,
    getPrintSpecs
  };
})();
