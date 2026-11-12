const { getLanIpAddress, PORT } = require('../config/env');
const {
  getCardBySlug,
  incrementScans,
  upsertCard,
  listCardsByUserId
} = require('../db/repository');
const { buildVCard30 } = require('../services/vcard-builder');
const { sendJson, readJsonBody } = require('../http/json');
const { resolveSessionFromRequest } = require('../services/session-service');

function handleGetServerInfo(req, res) {
  const lanIp = getLanIpAddress();
  sendJson(res, 200, {
    status: 'ok',
    lanIp,
    port: PORT,
    lanOrigin: `http://${lanIp}:${PORT}`,
    auth: {
      otp: true,
      sessionCookie: true
    }
  });
}

function handleListCards(req, res) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    return sendJson(res, 401, { error: 'Authentification requise' });
  }
  // Liste personnelle uniquement — la liste globale est /api/admin/cards.
  const cards = listCardsByUserId(session.userId);
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
    const session = resolveSessionFromRequest(req);
    if (!session) {
      return sendJson(res, 401, { error: 'Connectez-vous pour enregistrer votre carte' });
    }

    const payload = await readJsonBody(req);
    const existing = getCardBySlug(payload.slug || `${payload.firstName}-${payload.lastName}`);

    if (existing && existing.userId && existing.userId !== session.userId) {
      return sendJson(res, 403, {
        error: 'Cette carte appartient à un autre compte'
      });
    }

    const saved = upsertCard(payload, { userId: session.userId });
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
