window.VCardApp = window.VCardApp || {};

window.VCardApp.HeroCard = (function () {
  const RENDER_DELAY_MS = 140;
  const MAX_TILT_X_DEG = 9;
  const MAX_TILT_Y_DEG = 13;

  let els = null;
  let options = null;
  let flipped = false;
  let inView = true;
  let dirty = false;
  let renderTimer = null;
  let renderToken = 0;
  let tiltFrame = 0;

  function getTemplates() {
    return (window.VCardApp.Config && window.VCardApp.Config.CARD_TEMPLATES) || {};
  }

  /** Modele suivant ou precedent, en boucle. Identifiant inconnu : repart du premier. */
  function nextTemplateId(ids, currentId, direction) {
    if (!Array.isArray(ids) || !ids.length) return '';
    const index = ids.indexOf(currentId);
    const from = index === -1 ? 0 : index;
    const step = direction < 0 ? -1 : 1;
    return ids[(from + step + ids.length) % ids.length];
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function updateTemplateLabel(state) {
    const templates = getTemplates();
    const ids = Object.keys(templates);
    const currentId = templates[state.cardTemplate] ? state.cardTemplate : ids[0];
    if (!currentId) return;
    if (els.templateName) els.templateName.textContent = templates[currentId].label || currentId;
    if (els.templateIndex) {
      els.templateIndex.textContent = `${pad2(ids.indexOf(currentId) + 1)} / ${pad2(ids.length)}`;
    }
  }

  function paint(target, source) {
    if (!target || !source) return;
    target.width = source.width;
    target.height = source.height;
    target.getContext('2d').drawImage(source, 0, 0);
  }

  async function render() {
    const exporter = window.VCardApp.CardCanvasExporter;
    if (!els || !exporter) return;
    dirty = false;
    const token = ++renderToken;
    const state = options.getState();
    const qrMode = options.getQrMode();
    updateTemplateLabel(state);
    try {
      const [recto, verso] = await Promise.all([
        exporter.generateCardCanvas(state, qrMode),
        exporter.generateVersoCanvas(state, qrMode)
      ]);
      // Une saisie plus recente a relance un rendu : celui-ci est perime.
      if (token !== renderToken) return;
      paint(els.recto, recto);
      paint(els.verso, verso);
      els.card.classList.add('is-ready');
    } catch (err) {
      console.error('Erreur aperçu carte:', err);
    }
  }

  function isShown() {
    return Boolean(els) && els.stage.offsetParent !== null;
  }

  function refresh() {
    if (!els) return;
    dirty = true;
    updateTemplateLabel(options.getState());
    if (!inView || !isShown()) return;
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, RENDER_DELAY_MS);
  }

  function setFlipped(next) {
    if (!els) return;
    flipped = Boolean(next);
    els.card.classList.toggle('is-flipped', flipped);
    els.card.setAttribute(
      'aria-label',
      flipped ? 'Votre carte de visite, verso branding' : 'Votre carte de visite, recto'
    );
    if (els.flipButton) els.flipButton.setAttribute('aria-pressed', flipped ? 'true' : 'false');
    if (els.flipLabel) els.flipLabel.textContent = flipped ? 'Voir le recto' : 'Voir le verso';
    if (els.faceLabel) els.faceLabel.textContent = flipped ? 'Verso' : 'Recto';
  }

  function resetTilt() {
    if (tiltFrame) cancelAnimationFrame(tiltFrame);
    tiltFrame = 0;
    els.card.classList.remove('is-tilting');
    els.card.style.removeProperty('--tilt-x');
    els.card.style.removeProperty('--tilt-y');
    els.card.style.removeProperty('--sheen');
  }

  function bindTilt() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    els.mat.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      const rect = els.mat.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = requestAnimationFrame(() => {
        tiltFrame = 0;
        els.card.classList.add('is-tilting');
        els.card.style.setProperty('--tilt-x', `${(-y * 2 * MAX_TILT_X_DEG).toFixed(2)}deg`);
        els.card.style.setProperty('--tilt-y', `${(x * 2 * MAX_TILT_Y_DEG).toFixed(2)}deg`);
        els.card.style.setProperty('--sheen', `${((1 - (x + 0.5)) * 100).toFixed(1)}%`);
      });
    });

    els.mat.addEventListener('pointerleave', resetTilt);
  }

  function stepTemplate(direction) {
    const ids = Object.keys(getTemplates());
    const nextId = nextTemplateId(ids, options.getState().cardTemplate, direction);
    if (nextId && typeof options.onTemplateChange === 'function') {
      options.onTemplateChange(nextId);
    }
  }

  /**
   * Branche la carte du heros. Retourne false si le bloc est absent de la page.
   * @param {{ getState: Function, getQrMode: Function, onTemplateChange: Function }} opts
   */
  function mount(opts) {
    const stage = document.getElementById('heroStage');
    const card = document.getElementById('heroCard');
    if (!stage || !card || !opts || typeof opts.getState !== 'function') return false;

    options = opts;
    els = {
      stage,
      card,
      mat: document.getElementById('heroMat') || stage,
      recto: document.getElementById('heroCardRecto'),
      verso: document.getElementById('heroCardVerso'),
      flipButton: document.getElementById('btnHeroFlip'),
      flipLabel: document.getElementById('heroFlipLabel'),
      faceLabel: document.getElementById('heroFaceLabel'),
      templateName: document.getElementById('heroTemplateName'),
      templateIndex: document.getElementById('heroTemplateIndex')
    };

    card.addEventListener('click', () => setFlipped(!flipped));
    if (els.flipButton) els.flipButton.addEventListener('click', () => setFlipped(!flipped));

    const prev = document.getElementById('btnHeroTemplatePrev');
    const next = document.getElementById('btnHeroTemplateNext');
    if (prev) prev.addEventListener('click', () => stepTemplate(-1));
    if (next) next.addEventListener('click', () => stepTemplate(1));

    bindTilt();

    // Hors ecran, on ne redessine pas a chaque frappe : rattrapage au retour dans la vue.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        inView = entries.some((entry) => entry.isIntersecting);
        if (inView && dirty) refresh();
      });
      observer.observe(stage);
    }

    setFlipped(false);
    return true;
  }

  return {
    mount,
    refresh,
    setFlipped,
    nextTemplateId
  };
})();
