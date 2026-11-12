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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // 1. Server Info API
  if (req.method === 'GET' && pathname === '/api/info') {
    return handleGetServerInfo(req, res);
  }

  // 2. Cards REST API
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

  // 3. Short QR Code Routes:
  // /c/:slug -> Opens public profile page for this card & increments scan counter
  const shortProfileMatch = pathname.match(/^\/c\/([a-zA-Z0-9_-]+)$/);
  if (req.method === 'GET' && shortProfileMatch) {
    const slug = shortProfileMatch[1];
    res.writeHead(302, { Location: `/?id=${encodeURIComponent(slug)}&scan=1` });
    res.end();
    return;
  }

  // /v/:slug -> Directly serves the .vcf file & increments scan counter
  const shortVcfMatch = pathname.match(/^\/v\/([a-zA-Z0-9_-]+)$/);
  if (req.method === 'GET' && shortVcfMatch) {
    return handleDownloadVcf(req, res, shortVcfMatch[1], true);
  }

  // 4. Static Assets & Frontend SPA
  serveStaticFile(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  const lanIp = getLanIpAddress();
  console.log(`Serveur vCard Studio actif :`);
  console.log(`- Local (PC)      : http://localhost:${PORT}`);
  console.log(`- Reseau (Mobile) : http://${lanIp}:${PORT}`);
});

