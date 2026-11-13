window.VCardApp = window.VCardApp || {};

window.VCardApp.ApiService = (function () {
  let backendAvailable = false;
  let serverOrigin = window.location.origin;
  let currentUser = null;

  function slugify(text) {
    return (
      String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'contact'
    );
  }

  async function parseJson(res) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return data;
  }

  async function checkBackend() {
    if (window.location.protocol === 'file:' || /\.github\.io$/i.test(window.location.hostname)) {
      backendAvailable = false;
      return { available: false, origin: window.location.origin };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);
    try {
      const res = await fetch('/api/info', { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('Not available');
      const data = await res.json();
      backendAvailable = true;

      const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      serverOrigin = isLocalhost && data.lanOrigin ? data.lanOrigin : window.location.origin;

      await refreshSession();
      return { available: true, origin: serverOrigin, info: data, user: currentUser };
    } catch {
      clearTimeout(timer);
      backendAvailable = false;
      serverOrigin = window.location.origin;
      currentUser = null;
      return { available: false, origin: serverOrigin, user: null };
    }
  }

  async function refreshSession() {
    if (!backendAvailable) {
      currentUser = null;
      return null;
    }
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });
      if (!res.ok) {
        currentUser = null;
        return null;
      }
      const data = await parseJson(res);
      currentUser = data.user || null;
      return currentUser;
    } catch {
      currentUser = null;
      return null;
    }
  }

  async function register({ email, firstName, lastName }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, lastName })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Inscription impossible');
    return data;
  }

  async function login({ email }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Connexion impossible');
    return data;
  }

  async function verifyOtp({ email, code, purpose }) {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, purpose })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Vérification OTP échouée');
    currentUser = data.user || null;
    return data;
  }

  async function logout() {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    currentUser = null;
    const data = await parseJson(res);
    return data;
  }

  async function updateProfile({ firstName, lastName }) {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Mise à jour impossible');
    currentUser = data.user || null;
    return data.user;
  }

  async function fetchMyCards() {
    const res = await fetch('/api/me/cards', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) return [];
    const data = await parseJson(res);
    return data.cards || [];
  }

  async function fetchCardBySlug(slug, countScan = false) {
    const clean = slugify(slug);
    const query = countScan ? '?scan=1' : '';
    const res = await fetch(`/api/cards/${encodeURIComponent(clean)}${query}`);
    if (!res.ok) return null;
    const data = await parseJson(res);
    return data.card || null;
  }

  async function saveCard(cardState) {
    if (!backendAvailable) return null;
    const res = await fetch('/api/cards', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardState)
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Erreur de sauvegarde');
    return data.card || null;
  }

  async function searchLookup(kind, query) {
    if (!backendAvailable) return [];
    const path =
      kind === 'organizations' ? '/api/lookups/organizations' : '/api/lookups/job-titles';
    const url = `${path}?q=${encodeURIComponent(String(query || ''))}&limit=20`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) return [];
    const data = await parseJson(res);
    return Array.isArray(data.items) ? data.items : [];
  }

  async function createLookup(kind, name) {
    if (!backendAvailable) return null;
    const path =
      kind === 'organizations' ? '/api/lookups/organizations' : '/api/lookups/job-titles';
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Création impossible');
    return data.item || null;
  }

  async function searchLookup(kind, query) {
    if (!backendAvailable) return [];
    const path =
      kind === 'organizations' ? '/api/lookups/organizations' : '/api/lookups/job-titles';
    const url = `${path}?q=${encodeURIComponent(String(query || ''))}&limit=20`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) return [];
    const data = await parseJson(res);
    return Array.isArray(data.items) ? data.items : [];
  }

  async function createLookup(kind, name) {
    if (!backendAvailable) return null;
    const path =
      kind === 'organizations' ? '/api/lookups/organizations' : '/api/lookups/job-titles';
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data.error || 'Création impossible');
    return data.item || null;
  }

  function isAvailable() {
    return backendAvailable;
  }

  function getCurrentUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return Boolean(currentUser);
  }

  function getShortProfileUrl(state) {
    const cleanSlug = slugify(state.slug || `${state.firstName || ''}-${state.lastName || ''}`);
    return `${serverOrigin}/c/${cleanSlug}`;
  }

  function getDirectVcfUrl(state) {
    const cleanSlug = slugify(state.slug || `${state.firstName || ''}-${state.lastName || ''}`);
    return `${serverOrigin}/v/${cleanSlug}`;
  }

  return {
    slugify,
    checkBackend,
    refreshSession,
    register,
    login,
    verifyOtp,
    logout,
    updateProfile,
    fetchMyCards,
    fetchCardBySlug,
    saveCard,
    searchLookup,
    createLookup,
    isAvailable,
    getCurrentUser,
    isAuthenticated,
    getShortProfileUrl,
    getDirectVcfUrl
  };
})();
