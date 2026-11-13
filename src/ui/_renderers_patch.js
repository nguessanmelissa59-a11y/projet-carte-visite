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

    const qrCanvas = await buildQrCanvas(state, qrMode, accentHex, qrSize);
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

