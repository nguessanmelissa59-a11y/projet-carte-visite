(function () {
  const ApiService = window.VCardApp && window.VCardApp.ApiService;
  const StorageService = window.VCardApp && window.VCardApp.StorageService;

  let pending = {
    email: '',
    purpose: 'register'
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
    bindThemeToggle();
    bindForms();
    if (window.lucide) window.lucide.createIcons();

    const status = await ApiService.checkBackend();
    if (!status.available) {
      setAuthMessage('Le serveur n’est pas démarré. Lancez npm start puis réessayez.');
      return;
    }
    await renderSessionState();
  });

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
    setStep(1);
  }

  function showCodeStep(data) {
    document.getElementById('authStepIdentity').classList.add('hidden');
    const otpForm = document.getElementById('otpForm');
    otpForm.classList.remove('hidden');
    setStep(2);

    const hint = document.getElementById('otpHint');
    const devHint = document.getElementById('devOtpHint');
    hint.textContent = `Un code a été préparé pour ${data.email || pending.email}.`;
    if (data.devOtp) {
      devHint.classList.remove('hidden');
      devHint.textContent = `Code local de test : ${data.devOtp}`;
      document.getElementById('otpCode').value = data.devOtp;
    } else {
      devHint.classList.add('hidden');
      devHint.textContent = '';
    }

    document.getElementById('otpPassword').value = '';
    document.getElementById('otpPasswordHint').textContent =
      pending.purpose === 'register'
        ? 'Pour vous connecter sans code la prochaine fois. 8 caractères minimum.'
        : 'Renseignez-le pour définir ou remplacer votre mot de passe. 8 caractères minimum.';
    document.getElementById('otpCode').focus();
  }

  function finishLogin() {
    setStep(3);
    setAuthMessage('Connexion réussie.');
    const next = new URLSearchParams(window.location.search).get('next');
    // Chemin local uniquement : "//hote" et "/\hote" sortent du site.
    const safeNext = next && /^\/(?![/\\])/.test(next) ? next : '/';
    window.location.href = safeNext;
  }

  async function requestLoginCode() {
    const emailInput = document.getElementById('loginEmail');
    if (!emailInput.reportValidity()) return;
    setAuthMessage('Envoi du code…');
    try {
      const email = emailInput.value.trim();
      const data = await ApiService.login({ email });
      pending = { email: data.email || email, purpose: 'login' };
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
      setAuthMessage('Envoi du code…');
      try {
        const firstName = document.getElementById('regFirstName').value.trim();
        const lastName = document.getElementById('regLastName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const data = await ApiService.register({ email, firstName, lastName });
        pending = { email: data.email, purpose: 'register' };
        showCodeStep(data);
        setAuthMessage('Entrez le code pour activer votre compte.');
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

    document.getElementById('btnLoginOtp').addEventListener('click', requestLoginCode);

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
          password: passwordInput.value
        });
        passwordInput.value = '';
        finishLogin();
      } catch (err) {
        setAuthMessage(err.message || 'Code incorrect');
      }
    });

    const backBtn = document.getElementById('btnBackToEmail');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
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
      setAuthMessage('Vous êtes déconnecté.');
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
    document.getElementById('passwordStatus').textContent = hasPassword
      ? 'Un mot de passe est défini. La connexion par code reste possible, y compris si vous l’oubliez.'
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
