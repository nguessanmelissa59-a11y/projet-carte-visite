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
    bindTabs();
    bindForms();
    if (window.lucide) window.lucide.createIcons();

    const status = await ApiService.checkBackend();
    if (!status.available) {
      setAuthMessage('Serveur indisponible. Lancez `npm start` pour activer l’authentification.');
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

  function bindTabs() {
    const tabRegister = document.getElementById('tabRegister');
    const tabLogin = document.getElementById('tabLogin');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    function showRegister() {
      tabRegister.classList.add('is-active');
      tabLogin.classList.remove('is-active');
      tabRegister.setAttribute('aria-selected', 'true');
      tabLogin.setAttribute('aria-selected', 'false');
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }

    function showLogin() {
      tabLogin.classList.add('is-active');
      tabRegister.classList.remove('is-active');
      tabLogin.setAttribute('aria-selected', 'true');
      tabRegister.setAttribute('aria-selected', 'false');
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    }

    tabRegister.addEventListener('click', showRegister);
    tabLogin.addEventListener('click', showLogin);
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
        revealOtpStep(data);
        setAuthMessage(data.message || 'Code envoyé.');
      } catch (err) {
        setAuthMessage(err.message || 'Erreur d’inscription');
      }
    });

    document.getElementById('loginForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      setAuthMessage('Envoi du code…');
      try {
        const email = document.getElementById('loginEmail').value.trim();
        const data = await ApiService.login({ email });
        pending = { email: data.email || email, purpose: 'login' };
        if (data.devOtp || data.expiresInSec) {
          revealOtpStep(data);
        }
        setAuthMessage(data.message || 'Si un compte existe, un code a été préparé.');
      } catch (err) {
        setAuthMessage(err.message || 'Erreur de connexion');
      }
    });

    document.getElementById('otpForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      setAuthMessage('Vérification…');
      try {
        const code = document.getElementById('otpCode').value.trim();
        await ApiService.verifyOtp({
          email: pending.email,
          code,
          purpose: pending.purpose
        });
        setAuthMessage('Session ouverte.');
        await renderSessionState();
      } catch (err) {
        setAuthMessage(err.message || 'OTP invalide');
      }
    });

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
      setAuthMessage('Déconnecté.');
    });
  }

  function revealOtpStep(data) {
    const otpForm = document.getElementById('otpForm');
    const hint = document.getElementById('otpHint');
    const devHint = document.getElementById('devOtpHint');
    otpForm.classList.remove('hidden');
    hint.textContent = `Un code a été préparé pour ${data.email || pending.email}. Valable ${data.expiresInSec || 600} s.`;
    if (data.devOtp) {
      devHint.classList.remove('hidden');
      devHint.textContent = `Mode local : code = ${data.devOtp}`;
      document.getElementById('otpCode').value = data.devOtp;
    } else {
      devHint.classList.add('hidden');
      devHint.textContent = '';
    }
    document.getElementById('otpCode').focus();
    if (window.lucide) window.lucide.createIcons({ root: otpForm });
  }

  async function renderSessionState() {
    const user = await ApiService.refreshSession();
    const guest = document.getElementById('authGuestPanel');
    const session = document.getElementById('authSessionPanel');

    if (!user) {
      guest.classList.remove('hidden');
      session.classList.add('hidden');
      return;
    }

    guest.classList.add('hidden');
    session.classList.remove('hidden');
    document.getElementById('sessionTitle').textContent = `${user.firstName} ${user.lastName}`.trim() || 'Compte';
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
            <span class="text-xs font-mono text-[color:var(--ink-muted)]">/c/${escapeHtml(card.slug)}</span>
          </div>
          <a class="btn btn-ghost h-11 min-h-11 px-3 text-xs no-underline" href="/?id=${encodeURIComponent(card.slug)}">
            Modifier
          </a>
        `;
        list.appendChild(li);
      });
    }

    if (window.lucide) window.lucide.createIcons({ root: session });
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
