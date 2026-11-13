window.VCardApp = window.VCardApp || {};

window.VCardApp.FlowProgress = (function () {
  const has = (value) => typeof value === 'string' && value.trim().length > 0;

  const COMPLETION_ITEMS = [
    { label: 'nom', isFilled: (s) => has(s.firstName) && has(s.lastName) },
    { label: 'poste', isFilled: (s) => has(s.jobTitle) },
    { label: 'entreprise', isFilled: (s) => has(s.organization) },
    { label: 'téléphone', isFilled: (s) => has(s.phone) },
    { label: 'e-mail', isFilled: (s) => has(s.email) },
    { label: 'ville', isFilled: (s) => has(s.location) },
    { label: 'photo', isFilled: (s) => has(s.photoBase64) || has(s.photoUrl) },
    { label: 'lien', isFilled: (s) => has(s.linkedinUrl) || has(s.portfolioUrl) },
    { label: 'présentation', isFilled: (s) => has(s.bio) }
  ];

  // local : pas de serveur, brouillon sur l'appareil. unsaved : serveur present, carte absente.
  const SAVE_LABELS = {
    local: 'Brouillon sur cet appareil',
    unsaved: 'Non enregistrée',
    dirty: 'Modifications en cours',
    saving: 'Enregistrement…',
    saved: 'Enregistrée',
    error: 'Enregistrement impossible'
  };

  const MAX_HINT_ITEMS = 3;

  function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function compute(state, context) {
    const s = state || {};
    const ctx = context || {};
    const saveState = Object.prototype.hasOwnProperty.call(SAVE_LABELS, ctx.saveState)
      ? ctx.saveState
      : 'local';

    const missing = COMPLETION_ITEMS.filter((item) => !item.isFilled(s)).map((item) => item.label);
    const total = COMPLETION_ITEMS.length;
    const filled = total - missing.length;

    const infosDone = has(s.firstName) && has(s.lastName) && (has(s.phone) || has(s.email));
    const saveDone = saveState === 'local' ? infosDone : Boolean(ctx.cardOnServer);
    const shareDone = saveDone && Boolean(ctx.shared);

    // Le lien court ne mene nulle part tant que la carte n'existe pas sur le serveur.
    const linkLocked =
      Boolean(ctx.backendAvailable) && !ctx.cardOnServer && ctx.qrMode !== 'vcard';

    let saveLabel = SAVE_LABELS[saveState];
    if (saveState === 'saved') {
      const time = formatTime(ctx.savedAt);
      if (time) saveLabel = `Enregistrée à ${time}`;
    }

    let hint = '';
    if (missing.length) {
      const shown = missing.slice(0, MAX_HINT_ITEMS).join(', ');
      const more = missing.length > MAX_HINT_ITEMS ? '…' : '.';
      hint = `Pour une fiche complète, ajoutez : ${shown}${more}`;
    }

    return {
      filled,
      total,
      missing,
      hint,
      infosDone,
      saveState,
      saveLabel,
      linkLocked,
      steps: {
        infos: infosDone ? 'done' : 'active',
        save: saveDone ? 'done' : infosDone ? 'active' : 'todo',
        share: shareDone ? 'done' : saveDone ? 'active' : 'todo'
      },
      stepTexts: {
        infos: infosDone ? `${filled}/${total} renseignés` : 'Nom et un contact requis',
        save: saveLabel,
        share: linkLocked ? 'Après enregistrement' : ctx.shared ? 'Partagée' : 'QR et lien prêts'
      }
    };
  }

  function render(state, context) {
    const result = compute(state, context);
    const list = document.getElementById('flowSteps');

    if (list) {
      list.querySelectorAll('[data-step]').forEach((item) => {
        const key = item.getAttribute('data-step');
        const status = result.steps[key];
        if (!status) return;
        item.classList.toggle('is-done', status === 'done');
        item.classList.toggle('is-active', status === 'active');
        if (status === 'active') item.setAttribute('aria-current', 'step');
        else item.removeAttribute('aria-current');

        const text = item.querySelector('[data-step-state]');
        if (text && text.textContent !== result.stepTexts[key]) {
          text.textContent = result.stepTexts[key];
        }
      });
    }

    const hintEl = document.getElementById('flowHint');
    if (hintEl) {
      if (hintEl.textContent !== result.hint) hintEl.textContent = result.hint;
      hintEl.hidden = !result.hint;
    }

    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
      if (statusEl.textContent !== result.saveLabel) statusEl.textContent = result.saveLabel;
      if (result.saveState === 'saved') statusEl.dataset.state = 'online';
      else if (result.saveState === 'error') statusEl.dataset.state = 'offline';
      else delete statusEl.dataset.state;
    }

    const lockEl = document.getElementById('shareLockNotice');
    if (lockEl) lockEl.hidden = !result.linkLocked;

    return result;
  }

  function isVisible(el) {
    return Boolean(el) && el.offsetParent !== null;
  }

  function pointAt(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    el.classList.add('is-pointed');
    setTimeout(() => el.classList.remove('is-pointed'), 1400);
  }

  function activateStep(trigger) {
    if (!trigger) return;
    const target = document.getElementById(trigger.getAttribute('data-step-target'));
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: 'auto' });

    const focusIds = (trigger.getAttribute('data-step-focus') || '').split(',').filter(Boolean);
    const focusEl = focusIds.map((id) => document.getElementById(id)).find(isVisible);
    pointAt(focusEl);
  }

  /** Les etapes servent de sommaire : un clic amene a la zone concernee. */
  function bind() {
    const list = document.getElementById('flowSteps');
    if (!list) return;
    list.addEventListener('click', (event) => {
      activateStep(event.target.closest('[data-step-target]'));
    });
    list.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = event.target.closest('[data-step-target]');
      if (!trigger) return;
      event.preventDefault();
      activateStep(trigger);
    });
  }

  return {
    compute,
    render,
    bind
  };
})();
