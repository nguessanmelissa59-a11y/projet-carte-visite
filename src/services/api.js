window.VCardApp = window.VCardApp || {};

window.VCardApp.ApiService = (function () {
  let backendAvailable = false;
  let serverOrigin = window.location.origin;

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

  async function checkBackend() {
    if (window.location.protocol === 'file:') {
      backendAvailable = false;
      return { available: false, origin: '' };
    }
    try {
      const res = await fetch('/api/info', { method: 'GET' });
      if (!res.ok) throw new Error('Not available');
      const data = await res.json();
      backendAvailable = true;

      // If opened via localhost, use LAN IP for QR codes so phones on Wi-Fi can scan it
      const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      serverOrigin = isLocalhost && data.lanOrigin ? data.lanOrigin : window.location.origin;

      return { available: true, origin: serverOrigin, info: data };
    } catch {
      backendAvailable = false;
      serverOrigin = window.location.origin;
      return { available: false, origin: serverOrigin };
    }
  }

  async function fetchCardBySlug(slug, countScan = false) {
    const clean = slugify(slug);
    const query = countScan ? '?scan=1' : '';
    const res = await fetch(`/api/cards/${encodeURIComponent(clean)}${query}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.card || null;
  }

  async function saveCard(cardState) {
    if (!backendAvailable) return null;
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardState)
    });
    if (!res.ok) throw new Error('Erreur de sauvegarde');
    const data = await res.json();
    return data.card || null;
  }

  function isAvailable() {
    return backendAvailable;
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
    fetchCardBySlug,
    saveCard,
    isAvailable,
    getShortProfileUrl,
    getDirectVcfUrl
  };
})();

