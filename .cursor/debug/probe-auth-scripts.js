const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');

const root = path.join(__dirname, '..', '..');
const logPath = path.join(__dirname, 'debug-auth-buttons.log');

function log(entry) {
  fs.appendFileSync(logPath, `${JSON.stringify({ ts: Date.now(), ...entry })}\n`);
}

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:3000${urlPath}`, (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
      })
      .on('error', reject);
  });
}

async function main() {
  fs.writeFileSync(logPath, '');
  for (const p of ['/auth', '/auth/', '/auth.html']) {
    try {
      const res = await get(p);
      log({ step: 'http', path: p, status: res.status, sample: res.body.slice(0, 120) });
    } catch (err) {
      log({ step: 'http', path: p, error: err.message });
    }
  }

  const files = [
    'src/config/constants.js',
    'src/services/storage.js',
    'src/services/api.js',
    'src/ui/auth-page.js'
  ];

  const document = {
    documentElement: {
      classList: {
        add() {},
        remove() {},
        toggle() {
          return false;
        }
      }
    },
    body: {},
    getElementById() {
      return {
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener() {},
        textContent: '',
        value: '',
        focus() {},
        className: ''
      };
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type, fn) {
      if (type === 'DOMContentLoaded') {
        this._ready = fn;
      }
    },
    async runReady() {
      if (this._ready) await this._ready();
    }
  };

  const ctx = {
    window: {
      location: {
        origin: 'http://localhost:3000',
        protocol: 'http:',
        hostname: 'localhost',
        href: 'http://localhost:3000/auth.html'
      },
      matchMedia() {
        return { matches: false };
      },
      localStorage: {
        getItem() {
          return null;
        },
        setItem() {},
        removeItem() {}
      },
      document,
      fetch: async (url, opts = {}) => {
        log({ step: 'fetch', url, method: opts.method || 'GET' });
        if (String(url).includes('/api/info')) {
          return {
            ok: true,
            json: async () => ({ status: 'ok', lanOrigin: 'http://192.168.1.76:3000' })
          };
        }
        if (String(url).includes('/api/auth/me')) {
          return { ok: false, status: 401, json: async () => ({ error: 'Non authentifié' }) };
        }
        return { ok: true, json: async () => ({}) };
      },
      lucide: null,
      VCardApp: {}
    },
    document,
    console
  };
  ctx.window.window = ctx.window;

  for (const rel of files) {
    try {
      const code = fs.readFileSync(path.join(root, rel), 'utf8');
      vm.runInNewContext(code, ctx, { filename: rel });
      log({ step: 'load', file: rel, ok: true });
    } catch (err) {
      log({ step: 'load', file: rel, ok: false, error: err.message, stack: err.stack });
    }
  }

  try {
    await document.runReady();
    log({
      step: 'ready',
      hasApi: Boolean(ctx.window.VCardApp.ApiService),
      hasStorage: Boolean(ctx.window.VCardApp.StorageService)
    });
  } catch (err) {
    log({ step: 'ready', ok: false, error: err.message, stack: err.stack });
  }

  console.log('wrote', logPath);
}

main().catch((err) => {
  log({ step: 'fatal', error: err.message });
  console.error(err);
  process.exit(1);
});
