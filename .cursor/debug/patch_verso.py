from pathlib import Path

path = Path(r"c:\Users\Meliisa\Desktop\projet_carte_visite\src\ui\card-canvas.js")
text = path.read_text(encoding="utf-8")

marker = "  async function generateCardCanvas(state, qrMode) {"
end_marker = "  async function paintGeneratedToTarget(targetCanvas, offscreen) {"

start = text.index(marker)
end = text.index(end_marker)

insert = r'''  function getVersoPalette(state) {
    const templateId =
      state.cardTemplate && RENDERERS[state.cardTemplate] ? state.cardTemplate : 'editorial';
    const tpl = (CARD_TEMPLATES && CARD_TEMPLATES[templateId]) || {};
    const swatch = tpl.swatch || ['#ffffff', '#18181b', '#e4e4e7'];
    const darkFaces = new Set(['corporate', 'nocturne', 'prestige', 'metro']);
    return {
      id: templateId,
      bg: swatch[0],
      accent: swatch[1],
      secondary: swatch[2] || swatch[1],
      isDark: darkFaces.has(templateId)
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

    if (palette.id === 'sunset' || palette.id === 'creative') {
      const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
      sky.addColorStop(0, palette.secondary);
      sky.addColorStop(0.45, palette.accent);
      sky.addColorStop(1, '#7c2d12');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, WIDTH * 0.42, HEIGHT);
      ctx.fillStyle = palette.bg;
      ctx.beginPath();
      ctx.moveTo(WIDTH * 0.34, 0);
      ctx.quadraticCurveTo(WIDTH * 0.48, HEIGHT * 0.28, WIDTH * 0.36, HEIGHT * 0.55);
      ctx.quadraticCurveTo(WIDTH * 0.26, HEIGHT * 0.82, WIDTH * 0.44, HEIGHT);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(WIDTH, 0);
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (palette.id === 'metro') {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, WIDTH * 0.4, HEIGHT);
      ctx.fillStyle = palette.secondary;
      ctx.fillRect(WIDTH * 0.4, 0, 18, HEIGHT);
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

    if (palette.id === 'lagoon' || palette.id === 'arctic' || palette.id === 'slate') {
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
    const contentLeft = palette.isDark && palette.id !== 'metro' ? 0 : WIDTH * 0.38;
    const contentWidth = WIDTH - contentLeft;
    const centerX = contentLeft + contentWidth / 2;
    const capsuleW = Math.min(520, contentWidth - 80);
    const capsuleH = 120;
    const capsuleX = centerX - capsuleW / 2;
    const capsuleY = HEIGHT / 2 - capsuleH / 2 - 10;

    const stroke = palette.isDark ? palette.secondary : palette.accent;
    const ink = palette.isDark ? '#fafafa' : '#18181b';

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
      ctx.fillStyle = palette.isDark ? 'rgba(250,250,250,0.65)' : '#71717a';
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

'''

path.write_text(text[:start] + insert + text[end:], encoding="utf-8")
print("ok", path.stat().st_size)
