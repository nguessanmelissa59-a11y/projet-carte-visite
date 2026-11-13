window.VCardApp = window.VCardApp || {};

window.VCardApp.LookupCombobox = (function () {
  const ApiService = () => window.VCardApp.ApiService;
  const escapeHtml = (str) => {
    if (window.VCardApp.ProfileCardUI && window.VCardApp.ProfileCardUI.escapeHtml) {
      return window.VCardApp.ProfileCardUI.escapeHtml(str);
    }
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function mount(options) {
    const {
      inputId,
      kind,
      labelCreate = 'Créer',
      onChange
    } = options;

    const input = document.getElementById(inputId);
    if (!input) return null;

    const wrap = document.createElement('div');
    wrap.className = 'lookup-combo';
    wrap.dataset.lookupKind = kind;

    const parent = input.parentElement;
    parent.insertBefore(wrap, input);
    wrap.appendChild(input);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('autocomplete', 'off');

    const listId = `${inputId}LookupList`;
    input.setAttribute('aria-controls', listId);

    const list = document.createElement('ul');
    list.id = listId;
    list.className = 'lookup-combo__list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.appendChild(list);

    let items = [];
    let activeIndex = -1;
    let open = false;

    function setOpen(next) {
      open = next;
      list.hidden = !open;
      input.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) activeIndex = -1;
    }

    function renderList(query) {
      const q = String(query || '').trim();
      const exact = items.some((it) => it.name.toLowerCase() === q.toLowerCase());
      const rows = items
        .map((it, index) => {
          const active = index === activeIndex ? ' is-active' : '';
          return `<li role="option" class="lookup-combo__option${active}" data-index="${index}" data-name="${escapeHtml(it.name)}">${escapeHtml(it.name)}</li>`;
        })
        .join('');

      let createRow = '';
      if (q && !exact) {
        createRow = `<li role="option" class="lookup-combo__option lookup-combo__create" data-create="1" data-name="${escapeHtml(q)}">${escapeHtml(labelCreate)} « ${escapeHtml(q)} »</li>`;
      }

      if (!rows && !createRow) {
        list.innerHTML = `<li class="lookup-combo__empty">Aucun résultat</li>`;
      } else {
        list.innerHTML = rows + createRow;
      }
      setOpen(true);
    }

    async function fetchItems(query) {
      const api = ApiService();
      if (!api || !api.isAvailable()) {
        items = [];
        renderList(query);
        return;
      }
      try {
        items = await api.searchLookup(kind, query);
      } catch {
        items = [];
      }
      renderList(query);
    }

    const runSearch = debounce((value) => {
      fetchItems(value);
    }, 180);

    async function choose(name, { create } = {}) {
      const value = String(name || '').trim();
      if (!value) return;
      input.value = value;
      if (typeof onChange === 'function') onChange(value);

      const api = ApiService();
      if (create && api && api.isAvailable() && api.isAuthenticated()) {
        try {
          const item = await api.createLookup(kind, value);
          if (item && item.name) input.value = item.name;
        } catch {
          // La création définitive se fera aussi à l'enregistrement de la carte.
        }
      }
      setOpen(false);
    }

    input.addEventListener('focus', () => {
      fetchItems(input.value);
    });

    input.addEventListener('input', () => {
      if (typeof onChange === 'function') onChange(input.value);
      runSearch(input.value);
    });

    input.addEventListener('keydown', (e) => {
      const options = Array.from(list.querySelectorAll('[data-name]'));
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) {
          fetchItems(input.value);
          return;
        }
        activeIndex = Math.min(activeIndex + 1, options.length - 1);
        renderList(input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderList(input.value);
      } else if (e.key === 'Enter') {
        if (!open) return;
        e.preventDefault();
        const current = options[activeIndex] || options.find((o) => o.dataset.create === '1');
        if (current) {
          choose(current.dataset.name, { create: current.dataset.create === '1' });
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    });

    list.addEventListener('mousedown', (e) => {
      const option = e.target.closest('[data-name]');
      if (!option) return;
      e.preventDefault();
      choose(option.dataset.name, { create: option.dataset.create === '1' });
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) setOpen(false);
    });

    return {
      setValue(value) {
        input.value = value || '';
      },
      refresh() {
        fetchItems(input.value);
      }
    };
  }

  return { mount };
})();
