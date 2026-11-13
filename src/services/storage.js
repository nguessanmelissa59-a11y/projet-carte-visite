window.VCardApp = window.VCardApp || {};

window.VCardApp.StorageService = (function () {
  const { STORAGE_KEY, THEME_STORAGE_KEY, DEMO_DATA } = window.VCardApp.Config;
  const THEME_MODES = new Set(['auto', 'light', 'dark']);
  let mediaQuery = null;

  function saveDraft(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded or private browsing restriction
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEMO_DATA, ...JSON.parse(raw) };
      }
    } catch {
      // Corrupted JSON fallback
    }
    return { ...DEMO_DATA };
  }

  function getStoredThemeMode() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEME_MODES.has(saved)) return saved;
    // Ancienne valeur booléenne light/dark uniquement.
    if (saved === 'dark' || saved === 'light') return saved;
    return 'auto';
  }

  function resolveDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyThemeMode(mode) {
    const next = THEME_MODES.has(mode) ? mode : 'auto';
    const isDark = resolveDark(next);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.themeMode = next;
    syncThemeModeButtons(next);
  }

  function syncThemeModeButtons(activeMode) {
    document.querySelectorAll('[data-theme-mode]').forEach((btn) => {
      const mode = btn.getAttribute('data-theme-mode');
      const isActive = mode === activeMode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function onSystemThemeChange() {
    if (getStoredThemeMode() === 'auto') {
      applyThemeMode('auto');
    }
  }

  function initTheme() {
    applyThemeMode(getStoredThemeMode());
    if (!mediaQuery) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', onSystemThemeChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(onSystemThemeChange);
      }
    }
  }

  function setThemeMode(mode) {
    const next = THEME_MODES.has(mode) ? mode : 'auto';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyThemeMode(next);
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const next = isDark ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.dataset.themeMode = next;
    syncThemeModeButtons(next);
  }

  function bindThemeModeControls(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-theme-mode]').forEach((btn) => {
      if (btn.dataset.boundThemeMode === '1') return;
      btn.dataset.boundThemeMode = '1';
      btn.addEventListener('click', () => {
        setThemeMode(btn.getAttribute('data-theme-mode'));
      });
    });
    syncThemeModeButtons(getStoredThemeMode());
  }

  function resizeImageToBase64(file, maxWidth, maxHeight, quality, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        canvas.width = maxWidth;
        canvas.height = maxHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxWidth, maxHeight);
        callback(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  return {
    saveDraft,
    loadDraft,
    initTheme,
    toggleTheme,
    setThemeMode,
    bindThemeModeControls,
    getStoredThemeMode,
    resizeImageToBase64
  };
})();
