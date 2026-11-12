const { sendJson } = require('../http/json');
const { resolveSessionFromRequest } = require('./session-service');
const { ensureAdminBootstrap, ROLES } = require('../db/auth-repository');

/**
 * Résout la session et exige le rôle admin.
 * @returns {{ session: object, user: object } | null}
 */
function requireAdmin(req, res) {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    sendJson(res, 401, { error: 'Non authentifié' });
    return null;
  }

  const user = ensureAdminBootstrap(session.user);
  if (!user || user.role !== ROLES.ADMIN) {
    sendJson(res, 403, { error: 'Accès réservé aux administrateurs' });
    return null;
  }

  return { session, user };
}

module.exports = {
  requireAdmin
};
