(function () {
  const ApiService = window.VCardApp.ApiService;
  const StorageService = window.VCardApp.StorageService;

  let pending = {
    email: '',
    purpose: 'register'
  };

  document.addEventListener('DOMContentLoaded', async () => {
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
    document.getElementById('otpCode').focus();
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
      setAuthMessage('Vérification…');
      try {
        const email = document.getElementById('loginEmail').value.trim();
        const data = await ApiService.login({ email });
        pending = { email: data.email || email, purpose: 'login' };
        showCodeStep(data);
        setAuthMessage(data.message || 'Entrez le code reçu.');
      } catch (err) {
        setAuthMessage(err.message || 'Connexion impossible');
      }
    });

    document.getElementById('otpForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      setAuthMessage('Validation…');
      try {
        const code = document.getElementById('otpCode').value.trim();
        await ApiService.verifyOtp({
          email: pending.email,
          code,
          purpose: pending.purpose
        });
        setStep(3);
        setAuthMessage('Connexion réussie.');
        window.location.href = '/';
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

    document.getElementById('btnLogout').addEventListener('click', async () => {
      await ApiService.logout();
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
