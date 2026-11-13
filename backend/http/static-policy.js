// Le serveur statique part de la racine du projet : seuls ces chemins sont publics.
// Tout le reste (base SQLite, .env, code serveur, .git, docs) reste prive.
const PUBLIC_ROOT_FILES = new Set(['index.html', 'auth.html']);
const PUBLIC_DIRECTORIES = new Set(['assets', 'src']);

function isPublicStaticPath(relativePath) {
  const segments = String(relativePath || '')
    .split(/[\\/]+/)
    .filter(Boolean);
  if (!segments.length) return false;
  if (segments.some((segment) => segment.startsWith('.') || segment.includes(':'))) {
    return false;
  }
  if (segments.length === 1) return PUBLIC_ROOT_FILES.has(segments[0]);
  return PUBLIC_DIRECTORIES.has(segments[0]);
}

module.exports = {
  isPublicStaticPath
};
