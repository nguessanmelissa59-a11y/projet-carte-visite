const { getLanIpAddress, PORT } = require('../config/env');
const { getCardBySlug, incrementScans, upsertCard, listCards } = require('../db/repository');
const { buildVCard30 } = require('../services/vcard-builder');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload trop volumineux'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function handleGetServerInfo(req, res) {
  const lanIp = getLanIpAddress();
  sendJson(res, 200, {
    status: 'ok',
    lanIp,
    port: PORT,
    lanOrigin: `http://${lanIp}:${PORT}`
  });
}

function handleListCards(req, res) {
  const cards = listCards();
  sendJson(res, 200, { cards });
}

function handleGetCard(req, res, slug, isScanEvent) {
  const card = isScanEvent ? incrementScans(slug) : getCardBySlug(slug);
  if (!card) {
    return sendJson(res, 404, { error: 'Carte introuvable' });
  }
  sendJson(res, 200, { card });
}

async function handleSaveCard(req, res) {
  try {
    const payload = await readJsonBody(req);
    const saved = upsertCard(payload);
    sendJson(res, 200, { card: saved });
  } catch (err) {
    sendJson(res, 400, { error: err.message || 'Requete invalide' });
  }
}

function handleDownloadVcf(req, res, slug, countAsScan = false) {
  const card = countAsScan ? incrementScans(slug) : getCardBySlug(slug);
  if (!card) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Carte introuvable');
    return;
  }

  const vcfContent = buildVCard30(card);
  const safeFirst = (card.firstName || 'Contact').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeLast = (card.lastName || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeFirst}${safeLast ? '_' + safeLast : ''}.vcf`;

  res.writeHead(200, {
    'Content-Type': 'text/vcard; charset=utf-8',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'no-cache'
  });
  res.end(vcfContent);
}

module.exports = {
  sendJson,
  handleGetServerInfo,
  handleListCards,
  handleGetCard,
  handleSaveCard,
  handleDownloadVcf
};

