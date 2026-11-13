const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PORT, HOST, PUBLIC_ROOT, getLanIpAddress } = require('./config/env');
const { resolveSessionFromRequest } = require('./services/session-service');
const {
  handleGetServerInfo,
  handleListCards,
  handleGetCard,
  handleSaveCard,
  handleDownloadVcf
} = require('./controllers/card.controller');
const {
  handleRegister,
  handleLogin,
  handlePasswordLogin,
  handleVerifyOtp,
  handleSetPassword,
  handleMe,
  handleLogout,
  handleUpdateProfile,
  handleMyCards
} = require('./controllers/auth.controller');
const {
  handleAuthProviders,
  handleGoogleStart,
  handleGoogleCallback
} = require('./controllers/google-auth.controller');
const { isPublicStaticPath } = require('./http/static-policy');
const {
  handleAdminStats,
  handleAdminListCards,
  handleAdminDeleteCard,
  handleAdminListUsers,
  handleAdminUpdateUserRole
} = require('./controllers/admin.controller');
const {
  handleSearchJobTitles,
  handleCreateJobTitle,
  handleSearchOrganizations,
  handleCreateOrganization
} = require('./controllers/lookup.controller');

const ADMIN_DIST = path.join(PUBLIC_ROOT, 'admin', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.vcf': 'text/vcard; charset=utf-8'
};

function sendFile(res, fullPath, extraHeaders = {}) {
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, ...extraHeaders });
  fs.createReadStream(fullPath).pipe(res);
}

function isPublicCardView(parsedUrl) {
  return parsedUrl.searchParams.has('id') || parsedUrl.searchParams.has('data');
}

function redirectToAuth(res, nextPath) {
  const safeNext =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
  const location =
    safeNext === '/' ? '/auth' : `/auth?next=${encodeURIComponent(safeNext)}`;
  res.writeHead(302, {
    Location: location,
    'Cache-Control': 'no-store'
  });
  res.end();
}

function requireEditorSession(req, res, parsedUrl) {
  if (isPublicCardView(parsedUrl)) return true;
  if (resolveSessionFromRequest(req)) return true;
  const nextPath =
    parsedUrl.pathname === '/index.html'
      ? `/${parsedUrl.search || ''}`
      : `${parsedUrl.pathname}${parsedUrl.search || ''}`;
  redirectToAuth(res, nextPath === '/?' ? '/' : nextPath);
  return false;
}

function serveStaticFile(req, res, pathname, parsedUrl) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(PUBLIC_ROOT, safePath);

  if (!fullPath.startsWith(PUBLIC_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!isPublicStaticPath(safePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Fichier introuvable');
    return;
  }

  if (
    (safePath === 'index.html' || pathname === '/') &&
    parsedUrl &&
    !requireEditorSession(req, res, parsedUrl)
  ) {
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Fichier introuvable');
      return;
    }
    const headers =
      safePath === 'index.html' || safePath === 'auth.html'
        ? { 'Cache-Control': 'no-store' }
        : {};
    sendFile(res, fullPath, headers);
  });
}

function serveAdminSpa(req, res, pathname) {
  const relative = pathname === '/admin' || pathname === '/admin/'
    ? 'index.html'
    : pathname.replace(/^\/admin\/?/, '');
  const safeRel = path.normalize(relative).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = path.join(ADMIN_DIST, safeRel);

  if (!candidate.startsWith(ADMIN_DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(candidate, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, candidate);
      return;
    }

    const indexPath = path.join(ADMIN_DIST, 'index.html');
    fs.stat(indexPath, (indexErr, indexStats) => {
      if (indexErr || !indexStats.isFile()) {
        res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(
          'Admin non construit. Lancez : cd admin && npm install && npm run build'
        );
        return;
      }
      sendFile(res, indexPath);
    });
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname === '/api/info') {
    return handleGetServerInfo(req, res);
  }

  if (req.method === 'POST' && pathname === '/api/auth/register') {
    return handleRegister(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    return handleLogin(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/auth/verify') {
    return handleVerifyOtp(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    return handleMe(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    return handleLogout(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/auth/providers') {
    return handleAuthProviders(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/auth/google/start') {
    return handleGoogleStart(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/auth/google/callback') {
    return handleGoogleCallback(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/auth/login/password') {
    return handlePasswordLogin(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/auth/password') {
    return handleSetPassword(req, res);
  }
  if (req.method === 'PATCH' && pathname === '/api/auth/profile') {
    return handleUpdateProfile(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/me/cards') {
    return handleMyCards(req, res);
  }

  if (req.method === 'GET' && pathname === '/api/admin/stats') {
    return handleAdminStats(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/admin/cards') {
    return handleAdminListCards(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/admin/users') {
    return handleAdminListUsers(req, res);
  }

  const adminCardDelete = pathname.match(/^\/api\/admin\/cards\/([a-zA-Z0-9_-]+)$/);
  if (req.method === 'DELETE' && adminCardDelete) {
    return handleAdminDeleteCard(req, res, adminCardDelete[1]);
  }

  const adminUserRole = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_:-]+)\/role$/);
  if (req.method === 'PATCH' && adminUserRole) {
    return handleAdminUpdateUserRole(req, res, adminUserRole[1]);
  }

  if (req.method === 'GET' && pathname === '/api/lookups/job-titles') {
    return handleSearchJobTitles(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/lookups/job-titles') {
    return handleCreateJobTitle(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/lookups/organizations') {
    return handleSearchOrganizations(req, res);
  }
  if (req.method === 'POST' && pathname === '/api/lookups/organizations') {
    return handleCreateOrganization(req, res);
  }

  if (req.method === 'GET' && pathname === '/api/cards') {
    return handleListCards(req, res);
  }

  if (req.method === 'POST' && pathname === '/api/cards') {
    return handleSaveCard(req, res);
  }

  const vcfMatch = pathname.match(/^\/api\/cards\/([a-zA-Z0-9_-]+)\/vcf$/);
  if (req.method === 'GET' && vcfMatch) {
    return handleDownloadVcf(req, res, vcfMatch[1], false);
  }

  const cardMatch = pathname.match(/^\/api\/cards\/([a-zA-Z0-9_-]+)$/);
  if (req.method === 'GET' && cardMatch) {
    const isScan = parsedUrl.searchParams.get('scan') === '1';
    return handleGetCard(req, res, cardMatch[1], isScan);
  }

  const shortProfileMatch = pathname.match(/^\/c\/([a-zA-Z0-9_-]+)$/);
  if (req.method === 'GET' && shortProfileMatch) {
    const slug = shortProfileMatch[1];
    res.writeHead(302, { Location: `/?id=${encodeURIComponent(slug)}&scan=1` });
    res.end();
    return;
  }

  const shortVcfMatch = pathname.match(/^\/v\/([a-zA-Z0-9_-]+)$/);
  if (req.method === 'GET' && shortVcfMatch) {
    return handleDownloadVcf(req, res, shortVcfMatch[1], true);
  }

  if (
    req.method === 'GET' &&
    (pathname === '/auth' ||
      pathname === '/auth/' ||
      pathname === '/register' ||
      pathname === '/register/')
  ) {
    const next = parsedUrl.searchParams.get('next');
    const isRegister = pathname === '/register' || pathname === '/register/';
    const params = new URLSearchParams();
    if (isRegister) params.set('mode', 'register');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      params.set('next', next);
    }
    const query = params.toString();
    const location = query ? `/auth.html?${query}` : '/auth.html';
    res.writeHead(302, { Location: location });
    res.end();
    return;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return serveAdminSpa(req, res, pathname);
  }

  serveStaticFile(req, res, pathname, parsedUrl);
});

server.listen(PORT, HOST, () => {
  const lanIp = getLanIpAddress();
  console.log(`Serveur vCard Studio actif :`);
  console.log(`- Local (PC)      : http://localhost:${PORT}`);
  console.log(`- Reseau (Mobile) : http://${lanIp}:${PORT}`);
  console.log(`- Auth OTP        : http://localhost:${PORT}/auth`);
  console.log(`- Inscription     : http://localhost:${PORT}/register`);
  console.log(`- Admin           : http://localhost:${PORT}/admin`);
});
