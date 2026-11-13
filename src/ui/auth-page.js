(function () {
  const ApiService = window.VCardApp && window.VCardApp.ApiService;
  const StorageService = window.VCardApp && window.VCardApp.StorageService;

  // purpose reste vide tant qu'aucun code n'a été demandé : la page suit alors l'URL.
  let pending = {
    email: '',
    purpose: '',
    method: 'email'
  };
  let authMode = 'login';
  let emailDelivery = false;

  const GOOGLE_ERROR_MESSAGES = {
    google_unavailable:
      'La connexion avec Google n’est pas disponible ici. Utilisez votre e-mail ci-dessous.',
    google_cancelled: 'Connexion avec Google annulée.',
    google_email:
      'Cette adresse n’est pas gérée par Google. Créez votre compte avec votre e-mail ci-dessous.',
    google_failed: 'La connexion avec Google n’a pas abouti. Réessayez.'
  };

  document.addEventListener('DOMContentLoaded', async () => {
    if (!ApiService || !StorageService) {
      const el = document.getElementById('authMessage');
      if (el) {
        el.textContent =
          'Scripts non chargés. Ouvrez http://localhost:3000/auth (serveur npm start).';
      }
      return;
    }

    StorageService.initTheme();
    StorageService.bindThemeModeControls();
    authMode = resolveAuthMode();
    applyAuthMode(authMode);
    bindThemeToggle();
    bindForms();
    if (window.lucide) window.lucide.createIcons();

    const status = await ApiService.checkBackend();
    if (!status.available) {
      setAuthMessage('Le serveur n’est pas démarré. Lancez npm start puis réessayez.');
      return;
    }
    await renderSessionState();
    await applyAuthProviders();
    showGoogleError();
  });

  function safeNextParam() {
    const next = new URLSearchParams(window.location.search).get('next');
    // Chemin local uniquement : "//hote" et "/\hote" sortent du site.
    return next && /^\/(?![/\\])/.test(next) ? next : '';
  }

  async function applyAuthProviders() {
    const providers = await ApiService.fetchAuthProviders();
    emailDelivery = providers.emailDelivery;

    const block = document.getElementById('googleAuthBlock');
    const link = document.getElementById('btnGoogleAuth');
    if (!block || !link) return;
    const next = safeNextParam();
    link.href = next
      ? `/api/auth/google/start?next=${encodeURIComponent(next)}`
      : '/api/auth/google/start';
    block.classList.toggle('hidden', !providers.google);
  }

  // Le paramètre d'URL sert de clé dans une liste fixe : il n'est jamais affiché tel quel.
  function showGoogleError() {
    const params = new URLSearchParams(window.location.search);
    const key = params.get('error');
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(GOOGLE_ERROR_MESSAGES, key)) {
      setAuthMessage(GOOGLE_ERROR_MESSAGES[key]);
    }
    params.delete('error');
    const query = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
  }

  function resolveAuthMode() {
    const params = new URLSearchParams(window.location.search);
    const mode = String(params.get('mode') || '').toLowerCase();
    const path = String(window.location.pathname || '').toLowerCase();
    if (mode === 'register' || path === '/register' || path === '/register/') {
      return 'register';
    }
    return 'login';
  }

  function buildAuthHref(mode) {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    const target = new URLSearchParams();
    if (mode === 'register') target.set('mode', 'register');
    if (next && /^\/(?![/\\])/.test(next)) target.set('next', next);
    const query = target.toString();
    return query ? `/auth.html?${query}` : '/auth.html';
  }

  function applyAuthMode(mode) {
    authMode = mode === 'register' ? 'register' : 'login';
    const loginPanel = document.getElementById('authLoginPanel');
    const registerPanel = document.getElementById('authRegisterPanel');
    const eyebrow = document.getElementById('authEyebrow');
    const lead = document.getElementById('authLead');
    const linkToRegister = document.getElementById('linkToRegister');
    const linkToLogin = document.getElementById('linkToLogin');

    if (loginPanel) loginPanel.classList.toggle('hidden', authMode !== 'login');
    if (registerPanel) registerPanel.classList.toggle('hidden', authMode !== 'register');

    if (eyebrow) {
      eyebrow.textContent = authMode === 'register' ? 'Inscription' : 'Connexion';
    }
    if (lead) {
      lead.textContent =
        authMode === 'register'
          ? 'Créez votre compte, puis confirmez-le par e-mail ou en scannant un QR Code avec votre authenticator.'
          : 'Connectez-vous avec votre mot de passe, un code e-mail ou votre application authenticator.';
    }

    document.title =
      authMode === 'register'
        ? 'Créer un compte — EVC Melissa'
        : 'Se connecter — EVC Melissa';

    if (linkToRegister) linkToRegister.href = buildAuthHref('register');
    if (linkToLogin) linkToLogin.href = buildAuthHref('login');
  }

  function bindThemeToggle() {
    const btn = document.getElementById('btnThemeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      StorageService.toggleTheme();
      if (window.lucide) window.lucide.createIcons();
    });
  }

  function setStep(step) {
    [1, 2, 3].forEach((n) => {
      const el = document.getElementById(`stepBadge${n}`);
      if (!el) return;
      el.classList.toggle('is-active', n === step);
      el.classList.toggle('is-done', n < step);
    });
  }

  function showIdentityStep() {
    document.getElementById('authStepIdentity').classList.remove('hidden');
    document.getElementById('otpForm').classList.add('hidden');
    let mode = resolveAuthMode();
    if (pending.purpose === 'register') mode = 'register';
    else if (pending.purpose === 'login') mode = 'login';
    applyAuthMode(mode);
    setStep(1);
  }

  function clearTotpEnrollUi() {
    const block = document.getElementById('totpEnrollBlock');
    const canvas = document.getElementById('totpQrCanvas');
    const secretEl = document.getElementById('totpManualSecret');
    if (block) block.classList.add('hidden');
    if (secretEl) secretEl.textContent = '';
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function renderTotpQr(otpauthUrl) {
    const canvas = document.getElementById('totpQrCanvas');
    if (!canvas || !otpauthUrl) return;
    if (!window.QRCode || typeof window.QRCode.toCanvas !== 'function') {
      setAuthMessage('Impossible d’afficher le QR Code. Utilisez la clé manuelle ci-dessous.');
      return;
    }
    window.QRCode.toCanvas(
      canvas,
      otpauthUrl,
      {
        width: 192,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#18181b', light: '#ffffff' }
      },
      (err) => {
        if (err) {
          setAuthMessage('QR Code illisible. Utilisez la clé manuelle ci-dessous.');
        }
      }
    );
  }

  function showCodeStep(data) {
    document.getElementById('authStepIdentity').classList.add('hidden');
    const otpForm = document.getElementById('otpForm');
    otpForm.classList.remove('hidden');
    setStep(2);

    const method = data.method === 'authenticator' ? 'authenticator' : 'email';
    pending.method = method;

    const hint = document.getElementById('otpHint');
    const devHint = document.getElementById('devOtpHint');
    const recipient = data.email || pending.email;
    const totpBlock = document.getElementById('totpEnrollBlock');

    if (method === 'authenticator') {
      clearTotpEnrollUi();
      if (data.otpauthUrl && totpBlock) {
        totpBlock.classList.remove('hidden');
        const secretEl = document.getElementById('totpManualSecret');
        if (secretEl) secretEl.textContent = data.totpSecret || '';
        renderTotpQr(data.otpauthUrl);
        hint.textContent =
          'Scannez le QR Code avec votre application authenticator, puis saisissez le code à 6 chiffres.';
      } else {
        if (totpBlock) totpBlock.classList.add('hidden');
        hint.textContent = `Entrez le code à 6 chiffres de votre application authenticator pour ${recipient}.`;
      }
      if (devHint) {
        devHint.classList.add('hidden');
        devHint.textContent = '';
      }
      document.getElementById('otpCode').value = '';
    } else {
      clearTotpEnrollUi();
      hint.textContent = emailDelivery
        ? `Un code a été envoyé à ${recipient}. Pensez à regarder aussi les courriers indésirables.`
        : `Un code a été préparé pour ${recipient}.`;
      if (data.devOtp) {
        devHint.classList.remove('hidden');
        devHint.textContent = `Code local de test : ${data.devOtp}`;
        document.getElementById('otpCode').value = data.devOtp;
      } else {
        devHint.classList.add('hidden');
        devHint.textContent = '';
        document.getElementById('otpCode').value = '';
      }
    }

    const passwordInput = document.getElementById('otpPassword');
    const passwordLabel = document.getElementById('otpPasswordLabel');
    const passwordHint = document.getElementById('otpPasswordHint');
    const registerNeedsPassword = pending.purpose === 'register';
    passwordInput.value = '';
    passwordInput.required = registerNeedsPassword;
    if (passwordLabel) {
      passwordLabel.textContent = registerNeedsPassword
        ? 'Mot de passe'
        : 'Mot de passe (facultatif)';
    }
    if (passwordHint) {
      passwordHint.textContent = registerNeedsPassword
        ? 'Obligatoire pour créer le compte. 8 caractères minimum.'
        : 'Renseignez-le pour définir ou remplacer votre mot de passe. 8 caractères minimum.';
    }
    document.getElementById('otpCode').focus();
  }

  function finishLogin() {
    setStep(3);
    setAuthMessage('Connexion réussie.');
    window.location.href = safeNextParam() || '/';
  }

  function selectedRegisterMethod() {
    const checked = document.querySelector('input[name="regOtpMethod"]:checked');
    return checked && checked.value === 'authenticator' ? 'authenticator' : 'email';
  }

  async function requestLoginCode(method) {
    const emailInput = document.getElementById('loginEmail');
    if (!emailInput.reportValidity()) return;
    const otpMethod = method === 'authenticator' ? 'authenticator' : 'email';
    setAuthMessage(otpMethod === 'authenticator' ? 'Préparation…' : 'Envoi du code…');
    try {
      const email = emailInput.value.trim();
      const data = await ApiService.login({ email, method: otpMethod });
      pending = {
        email: data.email || email,
        purpose: 'login',
        method: data.method === 'authenticator' ? 'authenticator' : 'email'
      };
      document.getElementById('loginPassword').value = '';
      showCodeStep(data);
      setAuthMessage(data.message || 'Entrez le code reçu.');
    } catch (err) {
      setAuthMessage(err.message || 'Connexion impossible');
    }
  }

  function bindForms() {
    document.getElementById('registerForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const method = selectedRegisterMethod();
      setAuthMessage(method === 'authenticator' ? 'Préparation du QR Code…' : 'Envoi du code…');
      try {
        const firstName = document.getElementById('regFirstName').value.trim();
        const lastName = document.getElementById('regLastName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const data = await ApiService.register({ email, firstName, lastName, method });
        const resolvedMethod = data.method === 'authenticator' ? 'authenticator' : 'email';
        if (method === 'authenticator' && (resolvedMethod !== 'authenticator' || !data.otpauthUrl)) {
          setAuthMessage(
            'Le QR Authenticator n’est pas disponible sur ce serveur. Arrêtez npm start, relancez-le, puis réessayez.'
          );
          return;
        }
        pending = {
          email: data.email,
          purpose: 'register',
          method: resolvedMethod
        };
        showCodeStep(data);
        setAuthMessage(
          resolvedMethod === 'authenticator'
            ? data.message || 'Scannez le QR Code, puis validez le code affiché dans l’application.'
            : data.message || 'Entrez le code pour activer votre compte.'
        );
      } catch (err) {
        setAuthMessage(err.message || 'Impossible de créer le compte');
      }
    });

    document.getElementById('loginForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const passwordInput = document.getElementById('loginPassword');
      const password = passwordInput.value;
      if (!password) {
        setAuthMessage('Saisissez votre mot de passe, ou recevez un code par e-mail.');
        passwordInput.focus();
        return;
      }
      setAuthMessage('Connexion…');
      try {
        const email = document.getElementById('loginEmail').value.trim();
        await ApiService.loginWithPassword({ email, password });
        passwordInput.value = '';
        finishLogin();
      } catch (err) {
        passwordInput.value = '';
        setAuthMessage(err.message || 'Connexion impossible');
      }
    });

    document.getElementById('btnLoginOtp').addEventListener('click', () => requestLoginCode('email'));
    const btnLoginTotp = document.getElementById('btnLoginTotp');
    if (btnLoginTotp) {
      btnLoginTotp.addEventListener('click', () => requestLoginCode('authenticator'));
    }

    document.getElementById('otpForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      setAuthMessage('Validation…');
      try {
        const code = document.getElementById('otpCode').value.trim();
        const passwordInput = document.getElementById('otpPassword');
        await ApiService.verifyOtp({
          email: pending.email,
          code,
          purpose: pending.purpose,
          method: pending.method || 'email',
          password: passwordInput.value
        });
        passwordInput.value = '';
        clearTotpEnrollUi();
        finishLogin();
      } catch (err) {
        setAuthMessage(err.message || 'Code incorrect');
      }
    });

    const backBtn = document.getElementById('btnBackToEmail');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        clearTotpEnrollUi();
        showIdentityStep();
        setAuthMessage('');
      });
    }

    document.getElementById('profileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      setSessionMessage('Enregistrement…');
      try {
        const firstName = document.getElementById('profileFirstName').value.trim();
        const lastName = document.getElementById('profileLastName').value.trim();
        await ApiService.updateProfile({ firstName, lastName });
        setSessionMessage('Profil mis à jour.');
        await renderSessionState();
      } catch (err) {
        setSessionMessage(err.message || 'Mise à jour impossible');
      }
    });

    document.getElementById('passwordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const currentInput = document.getElementById('currentPassword');
      const newInput = document.getElementById('newPassword');
      setPasswordMessage('Enregistrement…');
      try {
        const user = await ApiService.setPassword({
          currentPassword: currentInput.value,
          password: newInput.value
        });
        currentInput.value = '';
        newInput.value = '';
        renderPasswordSection(user);
        setPasswordMessage('Mot de passe enregistré. Les autres appareils ont été déconnectés.');
      } catch (err) {
        currentInput.value = '';
        setPasswordMessage(err.message || 'Mot de passe non enregistré');
      }
    });

    document.getElementById('btnLogout').addEventListener('click', async () => {
      await ApiService.logout();
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      setPasswordMessage('');
      setSessionMessage('');
      await renderSessionState();
      showIdentityStep();
      setAuthMessage('Vous êtes déconnecté. Connectez-vous pour revenir à l’éditeur.');
      window.history.replaceState({}, '', buildAuthHref(authMode));
    });
  }

  async function renderSessionState() {
    const user = await ApiService.refreshSession();
    const guest = document.getElementById('authGuestPanel');
    const session = document.getElementById('authSessionPanel');

    if (!user) {
      guest.classList.remove('hidden');
      session.classList.add('hidden');
      showIdentityStep();
      return;
    }

    guest.classList.add('hidden');
    session.classList.remove('hidden');
    setStep(3);
    document.getElementById('sessionTitle').textContent =
      `${user.firstName} ${user.lastName}`.trim() || 'Compte';
    document.getElementById('sessionEmail').textContent = user.email;
    document.getElementById('profileFirstName').value = user.firstName || '';
    document.getElementById('profileLastName').value = user.lastName || '';
    renderPasswordSection(user);

    const cards = await ApiService.fetchMyCards();
    const list = document.getElementById('myCardsList');
    const empty = document.getElementById('myCardsEmpty');
    list.innerHTML = '';

    if (!cards.length) {
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      cards.forEach((card) => {
        const li = document.createElement('li');
        li.className = 'inset-block flex flex-wrap items-center justify-between gap-3';
        const title = `${card.firstName || ''} ${card.lastName || ''}`.trim() || card.slug;
        li.innerHTML = `
          <div class="min-w-0">
            <strong class="block truncate">${escapeHtml(title)}</strong>
            <span class="text-xs text-[color:var(--ink-muted)]">Lien public prêt</span>
          </div>
          <a class="btn btn-secondary h-11 min-h-11 px-3 text-sm no-underline" href="/?edit=${encodeURIComponent(card.slug)}">
            Modifier
          </a>
        `;
        list.appendChild(li);
      });
    }
  }

  function renderPasswordSection(user) {
    const hasPassword = Boolean(user && user.hasPassword);
    const currentField = document.getElementById('currentPasswordField');
    const currentInput = document.getElementById('currentPassword');
    currentField.classList.toggle('hidden', !hasPassword);
    currentInput.required = hasPassword;
    const hasTotp = Boolean(user && user.hasTotp);
    document.getElementById('passwordStatus').textContent = hasPassword
      ? 'Un mot de passe est défini. La connexion par code e-mail ou authenticator reste possible.'
      : hasTotp
        ? 'Aucun mot de passe : connectez-vous avec votre authenticator ou un code e-mail.'
        : 'Aucun mot de passe : vous vous connectez avec un code reçu par e-mail.';
    document.getElementById('passwordSubmitLabel').textContent = hasPassword
      ? 'Changer le mot de passe'
      : 'Définir un mot de passe';
  }

  function setPasswordMessage(text) {
    const el = document.getElementById('passwordMessage');
    if (el) el.textContent = text || '';
  }

  function setAuthMessage(text) {
    const el = document.getElementById('authMessage');
    if (el) el.textContent = text || '';
  }

  function setSessionMessage(text) {
    const el = document.getElementById('sessionMessage');
    if (el) el.textContent = text || '';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
