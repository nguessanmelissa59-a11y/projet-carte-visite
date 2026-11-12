const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PORT, HOST, PUBLIC_ROOT, getLanIpAddress } = require('./config/env');
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
  handleVerifyOtp,
  handleMe,
  handleLogout,
  handleUpdateProfile,
  handleMyCards
} = require('./controllers/auth.controller');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.vcf': 'text/vcard; charset=utf-8'
};

function serveStaticFile(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(PUBLIC_ROOT, safePath);

  if (!fullPath.startsWith(PUBLIC_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Fichier introuvable');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': req.headers.origin || '',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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
  if (req.method === 'PATCH' && pathname === '/api/auth/profile') {
    return handleUpdateProfile(req, res);
  }
  if (req.method === 'GET' && pathname === '/api/me/cards') {
    return handleMyCards(req, res);
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

  if (req.method === 'GET' && (pathname === '/auth' || pathname === '/auth/')) {
    res.writeHead(302, { Location: '/auth.html' });
    res.end();
    return;
  }

  serveStaticFile(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  const lanIp = getLanIpAddress();
  console.log(`Serveur vCard Studio actif :`);
  console.log(`- Local (PC)      : http://localhost:${PORT}`);
  console.log(`- Reseau (Mobile) : http://${lanIp}:${PORT}`);
  console.log(`- Auth OTP        : http://localhost:${PORT}/auth`);
});
