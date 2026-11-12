const { sendJson, readJsonBody } = require('../http/json');
const { requireAdmin } = require('../services/require-admin');
const {
  ROLES,
  normalizeRole,
  getUserById,
  setUserRole,
  countAdmins,
  listUsersForAdmin
} = require('../db/auth-repository');
const {
  listCardsForAdmin,
  deleteCardBySlug,
  getAdminStats,
  slugify
} = require('../db/repository');

function handleAdminStats(req, res) {
  if (!requireAdmin(req, res)) return;
  const cardStats = getAdminStats();
  const users = listUsersForAdmin();
  sendJson(res, 200, {
    stats: {
      usersTotal: users.length,
      adminsTotal: users.filter((u) => u.role === ROLES.ADMIN).length,
      cardsTotal: cardStats.cardsTotal,
      scansTotal: cardStats.scansTotal,
      latestCardUpdate: cardStats.latestCardUpdate
    }
  });
}

function handleAdminListCards(req, res) {
  if (!requireAdmin(req, res)) return;
  const url = new URL(req.url, 'http://localhost');
  const limit = Number(url.searchParams.get('limit')) || 50;
  const offset = Number(url.searchParams.get('offset')) || 0;
  const cards = listCardsForAdmin({ limit, offset });
  sendJson(res, 200, { cards });
}

function handleAdminDeleteCard(req, res, slug) {
  if (!requireAdmin(req, res)) return;
  const clean = slugify(slug);
  const deleted = deleteCardBySlug(clean);
  if (!deleted) {
    return sendJson(res, 404, { error: 'Carte introuvable' });
  }
  return sendJson(res, 200, { ok: true, slug: deleted.slug });
}

function handleAdminListUsers(req, res) {
  if (!requireAdmin(req, res)) return;
  const users = listUsersForAdmin();
  sendJson(res, 200, { users });
}

async function handleAdminUpdateUserRole(req, res, userId) {
  const auth = requireAdmin(req, res);
  if (!auth) return;

  try {
    const body = await readJsonBody(req, 64 * 1024);
    const nextRole = normalizeRole(body.role);
    const target = getUserById(userId);
    if (!target) {
      return sendJson(res, 404, { error: 'Utilisateur introuvable' });
    }

    if (target.role === ROLES.ADMIN && nextRole !== ROLES.ADMIN) {
      if (countAdmins() <= 1) {
        return sendJson(res, 400, {
          error: 'Impossible de retirer le dernier administrateur'
        });
      }
    }

    const user = setUserRole(target.id, nextRole);
    return sendJson(res, 200, { user });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide' });
  }
}

module.exports = {
  handleAdminStats,
  handleAdminListCards,
  handleAdminDeleteCard,
  handleAdminListUsers,
  handleAdminUpdateUserRole
};
