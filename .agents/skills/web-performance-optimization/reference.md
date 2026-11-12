# Reference — Web Performance (vCard Studio)

Lire ce fichier seulement pendant l'audit ou l'implementation des correctifs.

## 1. Checklist d'audit rapide

### Reseau / HTML

- [ ] Combien de requetes avant first paint ?
- [ ] Scripts dans `<head>` : blocking, `defer`, ou `type="module"` ?
- [ ] CDN runtime (Tailwind Play CDN, `@latest`) presents ?
- [ ] Fonts : combien de fichiers woff2 reels telecharges ?
- [ ] `preconnect` / `dns-prefetch` alignes sur origines encore utilisees ?

### Rendu

- [ ] LCP element identifie (titre, photo, carte) ?
- [ ] CLS : images/icones sans dimensions ?
- [ ] Animations continues hors interaction (cout INP/batterie) ?

### JS

- [ ] Travail synchrone avant premier `renderAll` ?
- [ ] QR / canvas regenere a chaque input sans debounce ?
- [ ] `lucide.createIcons()` appele trop souvent ?
- [ ] Listeners non retires sur vues recreees ?

### Serveur

- [ ] `Cache-Control` sur `.css` / `.js` / images ?
- [ ] `index.html` revalidable (`no-cache` ou `max-age=0, must-revalidate`) ?
- [ ] MIME types corrects (deja dans `MIME_TYPES`) ?
- [ ] Pas de path traversal (deja garde via `PUBLIC_ROOT`) ?

## 2. Snippets recommandees

### Cache static Node (`backend/server.js`)

Pattern a adapter dans `serveStaticFile` apres `fs.stat` OK :

```js
const ext = path.extname(fullPath).toLowerCase();
const contentType = MIME_TYPES[ext] || 'application/octet-stream';
const isHtml = ext === '.html' || relativePath === 'index.html';
const headers = {
  'Content-Type': contentType,
  'X-Content-Type-Options': 'nosniff'
};

if (isHtml) {
  headers['Cache-Control'] = 'no-cache';
} else if (['.css', '.js', '.woff2', '.png', '.jpg', '.jpeg', '.svg', '.ico'].includes(ext)) {
  // Assets stables : cache navigateur 7 jours. Monter a immutable si fingerprint dans le nom.
  headers['Cache-Control'] = 'public, max-age=604800';
}

res.writeHead(200, headers);
fs.createReadStream(fullPath).pipe(res);
```

Ne pas mettre `Access-Control-Allow-Origin: *` sur les statics sans besoin CORS reel.

### Scripts non bloquants

```html
<script src="assets/vendor/qrcode.min.js" defer></script>
<script src="src/config/constants.js" defer></script>
<script src="src/main.js" defer></script>
```

Ordre : dependances avant `main.js`. Eviter `async` si l'ordre d'execution compte.

### Fonts allégees

- Garder 1 display + 1 body (+ mono seulement si vraiment affiche).
- Limiter aux weights utilises (ex. Syne 700, DM Sans 400/600).
- Preferer fichiers `woff2` locaux sous `assets/fonts/` + `@font-face` dans `styles.css`.

### Tailwind sans Play CDN

Options (choisir la plus simple acceptee par l'utilisateur) :

1. **CSS local only** : migrer les classes critiques vers `assets/css/styles.css` (zero build).
2. **CLI Tailwind one-shot** : generer un `assets/css/tailwind.built.css` committe ; retirer le script CDN.

Ne jamais laisser `cdn.tailwindcss.com` en production.

### Lucide

- Extraire les icones utilisees (`qr-code`, `smartphone`, `moon`, `sun`, …) en SVG inline ou sprite.
- Si CDN conserve temporairement : pin une version fixe (`lucide@0.x.y`), jamais `@latest`.

### Debounce rendu (rappel)

Pattern deja present via `rafPending` / timeouts : toute regeneration QR ou canvas doit :

1. coalescer via `requestAnimationFrame` pour le paint ;
2. debounce 150–300 ms pour les operations coutueuses (QR, export).

## 3. Budgets cibles (mobile 4G lente, vue scan)

| Metrique | Cible | Alerte |
|---|---|---|
| LCP | <= 2.5 s | > 4 s |
| INP | <= 200 ms | > 500 ms |
| CLS | <= 0.1 | > 0.25 |
| Poids transfer (hors photo user) | <= 300 KB | > 600 KB |
| Requetes blocking dans `<head>` | 0 JS blocking | >= 1 |

La photo utilisateur est hors budget transfer initial si chargee apres le shell.

## 4. Mesure sans Lighthouse UI

En DevTools > Network : noter poids total, blocking, waterfall.

En console (apres load) :

```js
performance.getEntriesByType('navigation')[0]
performance.getEntriesByType('resource').map((r) => [r.name, Math.round(r.transferSize / 1024) + 'kb'])
```

Pour LCP (si web-vitals non installe) : PerformanceObserver `largest-contentful-paint` une seule session de test, puis retirer le code de debug.

## 5. Interdits securite sous pretexte perf

- Pas de desactivation CSP / CORS large "pour que ca charge".
- Pas de `eval` / `innerHTML` non escape pour "aller plus vite".
- Pas de logger de payloads carte (PII) dans la console perf.
- Uploads photo : toujours valider type MIME + taille max cote client et serveur.
