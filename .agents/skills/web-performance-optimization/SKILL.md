---
name: web-performance-optimization
description: >-
  Audite et optimise la rapidite d'un site web (Core Web Vitals, chargement,
  assets, cache HTTP, JS runtime). Adapte a une stack HTML/CSS/JS vanilla avec
  serveur Node sans bundler (ex. vCard Studio). A utiliser quand l'utilisateur
  demande optimisation, performance, rapidite, Lighthouse, LCP, INP, CLS,
  poids de page, CDN, cache, lazy-load, ou un site trop lent.
---

# Web Performance Optimization

Tu es le specialiste performance de ce projet. Objectif : pages plus rapides
sur mobile reel, sans changer le design ni casser le parcours scan QR.

## Protocole (toujours)

1. **Mesurer avant** : identifier le chemin critique (edition vs vue scan publique).
2. **Classer les goulots** : reseau, parse/compile JS/CSS, rendu, main-thread.
3. **Corriger par impact** : P1 bloquants d'abord, puis P2, puis polish.
4. **Mesurer apres** : meme scenario, meme device/viewport ; noter le delta.
5. **Ne pas** introduire un bundler/framework sans demande explicite.

Copier et tenir a jour :

```text
Perf Progress:
- [ ] Scenario cible defini (scan / edition / API)
- [ ] Baseline notee (LCP / INP / CLS / poids / requetes)
- [ ] Correctifs P1 appliques
- [ ] Correctifs P2 appliques
- [ ] Re-mesure + preuve
- [ ] Responsive 360/768/1024/1280 non regresse
```

## Chemins critiques (vCard Studio)

| Chemin | Fichiers | Priorite |
|---|---|---|
| Vue scan publique (`?id=` / `?data=`) | `index.html`, `src/main.js`, `src/ui/profile-card.js`, `src/ui/qr-view.js` | P1 |
| Edition studio | meme + formulaire + preview | P2 |
| API / static Node | `backend/server.js`, controllers | P1 cache + headers |

La vue scan doit rester utilisable meme si le backend est lent : rendu local d'abord, sync API ensuite (deja le pattern dans `main.js` — le preservir).

## Anti-patterns de ce projet (a corriger en priorite)

1. **`cdn.tailwindcss.com` en runtime** — compilateur Tailwind dans le navigateur : cout CPU + reseau eleve. Remplacer par CSS build ou classes deja dans `assets/css/styles.css` + utilities critiques locales.
2. **`lucide@latest` via unpkg** — version flottante, pas de cache long terme, payload large. Preferer icones SVG inline necessaires, ou build/pin version self-host.
3. **Google Fonts multi-familles/poids** — 3 familles + nombreux weights. Sous-setter (2–4 files max), `font-display: swap` (deja via `display=swap`), idealement self-host en `woff2`.
4. **Scripts bloquants dans `<head>`** sans `defer` — retarde le first paint. Scripts non critiques en `defer` ; QR / lz-string seulement si le mode en a besoin.
5. **Static Node sans `Cache-Control` / ETag** — chaque reload retelecharge CSS/JS. Ajouter cache immutable pour assets versionnes, `no-cache` pour `index.html`.
6. **Photo profil lourde en base64** — compresser avant stockage (taille max, qualite JPEG/WebP), eviter de regenerer le QR a chaque keystroke sans debounce/rAF.

## Ordre de correctifs (defaut)

### P1 — Chargement initial

- Retirer le CDN Tailwind runtime ; garder le design via CSS local.
- Pin + self-host (ou SVG inline) des icones vraiment utilisees.
- `preconnect` uniquement vers origines encore necessaires ; supprimer les origines mortes.
- `defer` sur scripts app ; charger `qrcode` / `lz-string` en lazy si absents du chemin scan.
- Headers cache sur fichiers statiques (`assets/`, `src/`).

### P2 — Rendu et interaction

- Prefixer le chemin scan : moins de travail synchrone avant premier paint.
- Debounce / `requestAnimationFrame` pour preview, QR, canvas (respecter `rafPending` existant).
- Eviter `lucide.createIcons()` global repete ; cibler les noeuds modifies.
- Images : dimensions explicites, `loading="lazy"` hors above-the-fold, `max-width: 100%`.

### P3 — Reseau et API

- Reponses API compactes ; ne pas renvoyer la photo si inchangee.
- Compression gzip/brotli cote reverse-proxy si deploy ; sinon documenter la limite du serveur nu.
- Eviter N+1 : une fiche = une requete.

## Definition of Done (perf)

`Termine` seulement si :

- baseline + apres mesures documentees (meme scenario) ;
- aucun scroll horizontal ajoute (360 / 768 / 1024 / 1280) ;
- vue scan toujours rendu local avant reponse API ;
- pas de nouvelle dependance CDN `@latest` ;
- pas de secret / header insecure ajoute pour "aller plus vite" (ex. CORS `*` elargi sans besoin).

## Format de compte rendu

```markdown
## Perf — [chemin]

**Baseline** : LCP … | INP … | CLS … | poids … | requetes …
**Apres** : LCP … | INP … | CLS … | poids … | requetes …
**Changements** :
- …
**Risques** :
- …
**Non fait (volontaire)** :
- …
```

Si les metriques navigateur ne sont pas disponibles : noter poids HTML/CSS/JS, nombre de requetes blocking, et temps estime au toucher des fichiers critiques.

## Ressources

- Checklist detaillee et snippets Node/HTML : [reference.md](reference.md)
- Apres correctif fonctionnel : appliquer aussi `test-after-feature` (tests du perimetre).
- Design : ne pas violer `frontend-editorial-design` pour gagner des ms (pas de redesign cache).
