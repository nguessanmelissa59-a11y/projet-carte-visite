# PRD — EVC Melissa

Générateur de carte de visite numérique (vCard 3.0) et QR Code dynamique.

**Version document :** 2.0  
**Aligné sur :** codebase actuelle (`backend/` + `src/` + `index.html` / `auth.html`)  
**Dernière mise à jour :** 2026-11-12

---

## 1. Vision & objectif produit

EVC Melissa permet de :

1. **Créer** une carte de visite numérique avec aperçu en direct (page profil + carte image).
2. **Enregistrer** la fiche sur un backend léger (SQLite) sous une URL courte `/c/:slug`.
3. **Partager** via QR Code (lien court ou vCard directe), lien copiable, partage natif mobile.
4. **Afficher** une page publique élégante au scan (`/?id=:slug&scan=1`).
5. **Enregistrer le contact** en 1 clic (fichier `.vcf` vCard 3.0, iOS Safari et Android).
6. **Imprimer** une planche PDF format carte de visite réelle **85 × 55 mm**.
7. **Gérer son compte** (e-mail + code OTP, mot de passe facultatif) pour retrouver et modifier ses cartes.

### Critère de réussite

Un utilisateur remplit le formulaire, s’enregistre (ou se connecte), obtient un QR scannable depuis un téléphone sur le même réseau, ouvre la fiche, enregistre le contact, et peut imprimer une carte 85 × 55 mm à l’échelle réelle.

---

## 2. Utilisateurs & parcours

| Persona | Besoin principal |
| :--- | :--- |
| Créateur (pro / indépendant) | Remplir, enregistrer, partager QR / lien, imprimer |
| Visiteur (scan) | Voir le profil, appeler / WhatsApp / e-mail, sauver le contact |
| Compte connecté | Retrouver ses cartes, les modifier sans perdre le slug |

### Parcours créateur (happy path)

1. Ouvrir l’éditeur (`/`).
2. Remplir identité + coordonnées (+ photo optionnelle).
3. Choisir une couleur d’accent.
4. (Recommandé) Se connecter via `/auth` pour conserver la fiche.
5. Cliquer **Enregistrer ma carte** → slug `/c/:slug` persisté en SQLite.
6. Copier le lien ou télécharger le QR ; optionnellement exporter le PDF 85 × 55 mm.

### Parcours visiteur (scan)

1. Scanner le QR → `http(s)://hôte/c/:slug` → redirection `/?id=:slug&scan=1`.
2. Compteur de scans incrémenté côté serveur.
3. Page profil : CTA contact, actions rapides, liens, PDF / partage.
4. Si `autoDownload` est actif : proposition d’enregistrement du `.vcf` après ouverture.

---

## 3. Architecture technique

### 3.1 Stack réelle

| Couche | Choix |
| :--- | :--- |
| Frontend | HTML5, CSS (`assets/css/styles.css`), Tailwind CDN, JS ES modules via scripts `src/` |
| Typo | Figtree (UI), Fraunces (display), IBM Plex Mono |
| Icônes | Lucide |
| QR | `qrcode` (canvas), export PNG HD |
| Compression fallback | `lz-string` (`?data=` / `#data=`) si mode hors serveur |
| Backend | Node.js ≥ 22.5 (`node:http`), SQLite natif (`node:sqlite` / `DatabaseSync`) |
| Persistance | `backend/data/cards.sqlite` (cartes, users, OTP, sessions) |

### 3.2 Pourquoi un backend (et plus « Zero-Backend »)

Les URLs courtes `/c/:slug` gardent le QR **peu dense** et **modifiable après impression**. Les photos et métadonnées vivent en base ; le QR ne transporte plus le JSON compressé en usage nominal.

Le mode `lz-string` reste un **repli** pour ouverture statique sans Node.

### 3.3 Routes serveur

| Méthode | Route | Rôle |
| :--- | :--- | :--- |
| `GET` | `/api/info` | Infos serveur (dont IP LAN pour QR scannable) |
| `GET` | `/api/cards` | Liste récente des cartes |
| `POST` | `/api/cards` | Création / mise à jour (upsert par slug) |
| `GET` | `/api/cards/:slug` | Lecture fiche (`?scan=1` incrémente les vues) |
| `GET` | `/api/cards/:slug/vcf` | Téléchargement `.vcf` |
| `GET` | `/c/:slug` | Redirection 302 vers `/?id=:slug&scan=1` |
| `GET` | `/v/:slug` | `.vcf` court (ouverture Contacts) |
| `POST` | `/api/auth/register` | Inscription + émission OTP |
| `POST` | `/api/auth/login` | Connexion + émission OTP |
| `POST` | `/api/auth/login/password` | Connexion par mot de passe (sans OTP) → session cookie |
| `POST` | `/api/auth/verify` | Vérification OTP → session cookie (mot de passe facultatif à définir) |
| `POST` | `/api/auth/password` | Définir / changer le mot de passe (session requise) |
| `GET` | `/api/auth/me` | Utilisateur courant |
| `POST` | `/api/auth/logout` | Fin de session |
| `PATCH` | `/api/auth/profile` | Mise à jour profil compte |
| `GET` | `/api/me/cards` | Cartes du compte connecté |
| `GET` | `/auth` | Redirection vers `auth.html` |

Démarrage : `npm start` → `http://localhost:3000` + affichage IP LAN pour scan Wi-Fi.

---

## 4. Fonctionnalités détaillées

### 4.1 Éditeur (`index.html` / vue création)

Interface **mobile-first** : formulaire + bandeau d’étapes (infos → enregistrer → partager) ; sur desktop, grille 2 colonnes (formulaire / aperçu sticky).

#### Identité

| Champ | Obligatoire | Notes |
| :--- | :---: | :--- |
| `firstName` | oui | |
| `lastName` | oui | |
| `jobTitle` | non | |
| `organization` | non | |
| `bio` | non | max **160** caractères |
| Photo | non | upload redimensionné (Base64) **ou** URL |

#### Coordonnées

| Champ | Notes |
| :--- | :--- |
| `phone` | `tel:` |
| `whatsapp` | `https://wa.me/...` |
| `email` | `mailto:` |
| `location` | ville / lieu |

#### Liens

| Champ | Notes |
| :--- | :--- |
| `linkedinUrl` | normalisé `https://` si omis |
| `portfolioUrl` | idem |

#### Personnalisation

- **Thèmes couleur (accent)** : `obsidian`, `forest`, `cobalt`, `bronze`, `bordeaux`, `teal`, `gold`, `navy`, `plum`, `indigo`.
- **Mode clair / sombre** : bascule UI (`THEME_STORAGE_KEY`).
- **Slug** (avancé) : préfixe `/c/` ; auto-généré depuis prénom-nom si vide.
- **`autoDownload`** : proposer le `.vcf` après scan.
- Brouillon local : `localStorage` (`STORAGE_KEY`).

#### Aperçu

- Onglet **Aperçu page** : mockup téléphone + rendu profil live.
- Onglet **Carte image** : choix de **modèle** (`CARD_TEMPLATES`) + canvas + export PDF 85 × 55 mm.
- Modèles disponibles : `editorial`, `minimal`, `corporate`, `creative`, `eco`, `prestige`, `nocturne`, `atelier`, `lagoon`, `slate`, `sunset`, `sumi`, `arctic`, `metro`.

#### Partage / export

- QR temps réel (statut « Prêt »).
- **Copier mon lien**.
- **Télécharger le QR Code** (PNG HD).
- **PDF imprimable 85 × 55 mm** (planche A4, traits de coupe, impression à 100 %).
- **Fichier contact téléphone** (test `.vcf` depuis l’éditeur).
- Options QR avancées :
  - Mode **Lien** (`/c/:slug` ou fallback compressé) vs **Contact** (payload vCard dans le QR).
  - Logo au centre (upload ou URL).

### 4.2 Page profil publique (scan / visiteur)

Déclenchée par `?id=:slug`, `/?id=:slug&scan=1`, ou fallback `?data=` / `#data=`.

- Bannière selon thème d’accent, avatar (photo ou initiales), nom, poste, entreprise, ville, bio.
- CTA **Enregistrer dans les contacts** (`UserPlus`).
- CTA secondaire **PDF imprimable 85 × 55 mm**.
- Actions : Appeler, WhatsApp, E-mail, Partager (`navigator.share` si dispo).
- Liens LinkedIn / site web.
- Pied de page : mention EVC Melissa ; retour éditeur possible depuis la barre d’actions.

### 4.3 Compte & auth (`auth.html`)

Connexion **avec ou sans OTP** : code reçu par e-mail, ou mot de passe (facultatif).
Modules **séparés** : `/auth` (connexion) et `/register` (inscription), avec liens croisés.

1. Inscription seule (`/register` : prénom, nom, e-mail), toujours confirmée par un code OTP.
2. Connexion seule (`/auth` : mot de passe ou code e-mail) ; lien « Créer un compte » si besoin.
3. Réception OTP (e-mail ; en local, code aussi en console serveur / `devOtp`).
4. Vérification → cookie de session. Un mot de passe peut être défini à cette étape.
5. Connexions suivantes : mot de passe (sans code) ou code OTP, au choix.
6. Mot de passe oublié : connexion par code, en saisissant un nouveau mot de passe à l’étape du code.
7. Accès profil compte, mot de passe et liste des cartes (`/api/me/cards`).
8. Dans l’éditeur : hint « connectez-vous pour garder et modifier », lien compte dans le header.

Règles mot de passe :

- 8 à 128 caractères, stocké haché (scrypt), jamais renvoyé par l’API.
- Défini uniquement par le détenteur d’un code OTP valide ou d’une session ouverte.
- 5 échecs par e-mail → connexion par mot de passe bloquée 15 min (`LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_WINDOW_MS`) ; le code OTP reste utilisable.
- Changer un mot de passe existant exige l’actuel et ferme les autres sessions.

### 4.4 Photo & QR density

- Upload : redimensionnement canvas (miniature compressée) pour stockage / vCard.
- QR mode lien : payload court (`/c/:slug`) — pas de Base64 photo dans le QR.
- QR mode contact : vCard directe (hors-ligne) ; densité plus élevée, usage volontaire.

---

## 5. Spécification vCard 3.0 (iOS & Android)

Conformité **RFC 2426** :

1. Fin de ligne `\r\n` (CRLF).
2. Champs : `N`, `FN`, `ORG`, `TITLE`, `TEL`, `EMAIL`, `ADR`, `NOTE`, `PHOTO`, URLs.
3. Labels Apple : `ITEM1.URL` + `ITEM1.X-ABLabel:LinkedIn`, `ITEM2.URL` + `ITEM2.X-ABLabel:Portfolio`.
4. Photo : `PHOTO;ENCODING=b;TYPE=JPEG:` (Base64 sans préfixe data-URI) ou `PHOTO;VALUE=URI:`.

Génération serveur : `backend/services/vcard-builder.js`.  
Génération client (éditeur / mode offline) : `src/services/vcard.js`.

Livraison HTTP : `Content-Type: text/vcard; charset=utf-8` via `/v/:slug` ou `/api/cards/:slug/vcf`.

---

## 6. Modèle de données (SQLite)

### `cards`

slug (PK), identité, coordonnées, liens, bio, `photo_url`, `photo_base64`, `theme`, `auto_download`, `scans`, `user_id` (nullable), `created_at`, `updated_at`.

### `users`

id, email (unique, NOCASE), prénom, nom, `email_verified`, `role`, `password_hash` (vide si aucun mot de passe), timestamps.

### `otp_challenges`

id, email, purpose, `code_hash`, attempts, expires / consumed, meta JSON.

### `sessions`

id, `user_id`, `token_hash`, expires_at, created_at.

---

## 7. UX / UI & design system

- Direction visuelle éditoriale (pas glassmorphism générique ni thème violet cliché).
- Tokens CSS (`--ink`, `--line`, `--accent`, surfaces) + thèmes carte via `data-card-theme`.
- Responsive obligatoire : contrôles ~360 / 768 / 1024 / 1280 ; boutons ≥ ~44 px ; texte corps ≥ 16 px mobile ; pas de scroll horizontal parasite.
- Viewport : `width=device-width, initial-scale=1`.
- Feedback : toasts (copie, enregistrement, PDF, erreurs).
- Accessibilité de base : labels, `aria-label` sur actions icône, focus visibles.

---

## 8. Hors périmètre (v2.0)

Non couverts / non promis dans cette version :

- Multi-tenant SaaS, facturation, rôles admin riches.
- Envoi e-mail OTP production via provider dédié (aujourd’hui : flux local / console acceptable en dev).
- App native iOS/Android.
- Édition collaborative temps réel.
- Réseaux sociaux au-delà de LinkedIn + site (GitHub / X / Instagram non dans le formulaire actuel).
- Export SVG du QR (PNG HD uniquement aujourd’hui).

---

## 9. Risques & contraintes

| Risque | Mitigation |
| :--- | :--- |
| QR trop dense | Mode lien `/c/:slug` par défaut ; photo hors payload QR |
| Scan depuis téléphone en `localhost` | Détection IP LAN dans `/api/info` et QR |
| Perte de brouillon | `localStorage` + compte OTP pour ownership |
| XSS profil | échappement HTML côté `profile-card.js` ; validation auth côté serveur |
| Hijack de slug | upsert lié au compte quand session présente ; à durcir selon besoins prod |

---

## 10. Definition of Done (produit)

Une itération est **Terminée** seulement si :

- critères d’acceptation de la fonctionnalité validés ;
- parcours créateur + scan vérifiés sur mobile réel ou émulation 360 px ;
- vCard ouvrable iOS et/ou Android selon le périmètre touché ;
- pas de régression QR (lien court) ni PDF 85 × 55 mm si concernés ;
- docs (`prd.md`, `technologies.md`, README) cohérents avec le code si le comportement produit change.
