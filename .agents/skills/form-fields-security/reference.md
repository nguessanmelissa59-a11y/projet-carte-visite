# Reference — validation, auth, rendu, transport

Lire apres le protocole de `SKILL.md`, pour le volet concerne uniquement.
Valeurs = cibles recommandees EVC Melissa ; documenter tout ecart PRD.

## A. Champs carte

### Constantes recommandees

Deriver les enums depuis `src/config/constants.js` (`THEME_PALETTES`,
`CARD_TEMPLATES`) — ne pas figer une liste obsolete dans le code serveur.

```js
const FIELD_LIMITS = {
  slug: 48,
  firstName: 80,
  lastName: 80,
  jobTitle: 120,
  organization: 120,
  phone: 32,
  whatsapp: 32,
  email: 254,
  location: 120,
  linkedinUrl: 500,
  portfolioUrl: 500,
  photoUrl: 500,
  qrLogoUrl: 500,
  bio: 160,
  photoBase64: 1_500_000, // ~1 Mo image en data-URI
  qrLogoBase64: 500_000
};

const ALLOWED_URL_SCHEMES = new Set(['https:']);
// Dev LAN uniquement : ajouter http: explicitement et documenter.
```

```js
const ALLOWED_THEMES = new Set(Object.keys(THEME_PALETTES));
const ALLOWED_CARD_TEMPLATES = new Set(Object.keys(CARD_TEMPLATES));
```

### Helpers minimaux (modele)

Placer dans `backend/services/validation.js`. Ne pas dupliquer dans
controller et repository.

```js
function asString(value, max) {
  const s = String(value ?? '').trim();
  if (s.length > max) throw new Error('Champ trop long');
  return s;
}

function assertSlug(raw) {
  const slug = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, FIELD_LIMITS.slug);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug invalide');
  }
  return slug;
}

function assertEmail(raw) {
  const email = asString(raw, FIELD_LIMITS.email);
  if (!email) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email invalide');
  }
  return email.toLowerCase();
}

function assertPhone(raw, max = FIELD_LIMITS.phone) {
  const phone = asString(raw, max);
  if (!phone) return '';
  if (!/^\+?[0-9\s().-]{6,}$/.test(phone)) {
    throw new Error('Telephone invalide');
  }
  return phone;
}

function assertHttpUrl(raw, max) {
  const value = asString(raw, max);
  if (!value) return '';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('URL invalide');
  }
  if (!ALLOWED_URL_SCHEMES.has(url.protocol)) {
    throw new Error('Scheme URL non autorise');
  }
  if (url.username || url.password) {
    throw new Error('URL invalide');
  }
  return url.toString();
}

function assertTheme(raw) {
  const theme = String(raw || 'obsidian');
  if (!ALLOWED_THEMES.has(theme)) throw new Error('Theme invalide');
  return theme;
}

function assertCardTemplate(raw) {
  const tpl = String(raw || 'editorial');
  if (!ALLOWED_CARD_TEMPLATES.has(tpl)) {
    throw new Error('Template invalide');
  }
  return tpl;
}

function assertPhotoBase64(raw, max = FIELD_LIMITS.photoBase64) {
  const value = String(raw || '');
  if (!value) return '';
  if (value.length > max) throw new Error('Image trop volumineuse');
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
    throw new Error('Image invalide');
  }
  return value;
}

function assertAutoDownload(raw) {
  if (raw === true || raw === false) return raw;
  if (raw === 1 || raw === '1') return true;
  if (raw === 0 || raw === '0') return false;
  throw new Error('autoDownload invalide');
}
```

Messages : generiques cote API publique, plus precis cote UX front.

### Regles par champ

#### slug

- Whitelist apres slugify : `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Max 48 ; jamais espace, slash, `..`, `@`
- Uniquement la version normalisee dans `/c/:slug`, `/v/:slug`, routes API
- Ne pas concatenner le slug brut dans un chemin fichier

#### Textes (firstName, lastName, jobTitle, organization, location)

- Trim + longueur max
- Escape obligatoire au rendu / vCard (pas besoin de strip HTML agressif au stockage si escape garanti)
- `firstName` / `lastName` requis au save metier

#### bio

- `maxlength` HTML 160 **et** controle serveur 160
- Escape HTML + escape vCard (`NOTE`)

#### email

- Format + max 254 + lowercase
- Saisir l'adresse seule (pas une URI `mailto:` complete)
- Echapper dans `href="mailto:..."`

#### phone / whatsapp

- Autoriser `+`, chiffres, espaces, `()`, `.`, `-`
- Pour `wa.me` : digits-only derive au rendu ; jamais la saisie brute dans le path
- Rejeter lettres et markup

#### linkedinUrl / portfolioUrl / photoUrl / qrLogoUrl

- Parser avec `URL` ; scheme whitelist
- Rejeter credentials (`url.username` / `url.password`)
- Pas de fetch serveur de ces URL sans garde SSRF (IP privees, metadata cloud)
- Preferer laisser le navigateur charger, ou proxy durci

#### photoBase64 / qrLogoBase64

- Front : `accept="image/*"` + controle taille avant FileReader
- Serveur : regex data-URI image + plafond
- Interdit : `data:text/html`, GIF anime si politique stricte optionnelle, SVG scriptable
- Prefere png/jpeg/webp ; au rendu preferer `img.src = url` via DOM API

#### theme / cardTemplate

- Enums fermees = cles de `THEME_PALETTES` / `CARD_TEMPLATES`
- Hors liste → erreur au save (pas de fallback silencieux non documente)

#### autoDownload

- Cast strict ; ne jamais `Boolean("false")` (deviendrait `true`)

---

## B. Champs auth

Deja partiellement couvert par `backend/services/auth-validation.js`.

| Champ | Regle | Notes |
|---|---|---|
| email | trim, lower, max 254, regex pragmatique | Alignement avec `assertEmail` carte |
| firstName / lastName | `NAME_RE` Unicode lettres, max 80 | Reutiliser au rendu profil |
| OTP `code` | exactement 6 chiffres | Rate-limit : `OTP_MAX_ATTEMPTS`, `OTP_MAX_PER_WINDOW` ; TOTP fenetre ±1 periode |
| `method` | enum `email` \| `authenticator` | Defaut `email` ; rejeter toute autre valeur |
| `password` | chaine, 8 a 128 caracteres, NFKC | Hash scrypt (`password-service.js`) ; jamais renvoye ni logge ; plafond `LOGIN_MAX_ATTEMPTS` par e-mail ; defini seulement avec un OTP valide ou une session |
| secret TOTP | base32, chiffrement AES-GCM au repos | Jamais logge ; `totp_secret` DB chiffre (`TOTP_ENC_KEY`) ; URI otpauth uniquement pendant l'enrolement |
| Google `code` / `state` (retour OAuth) | `state` compare au cookie `vcard_oauth` (HttpOnly, 10 min), `nonce` et PKCE verifies | `google-oauth.js` ; e-mail accepte seulement si verifie et gere par Google ; `next` limite a un chemin local |
| `?error=` (page auth) | cle d'une liste fixe de messages | Jamais affiche tel quel (`auth-page.js`) |

Regles auth :

1. Ne jamais renvoyer le code OTP en production (`AUTH_EXPOSE_OTP` false si `NODE_ENV=production`).
2. Reponses d'erreur generiques sur verify (eviter "email inconnu" vs "code faux" si enumeration sensible).
3. Invalider / rotation session au logout ; cookie clear avec memes flags.
4. Ne pas logger email + OTP ensemble.

---

## C. Rendu / export

### DOM (`profile-card.js`, `auth-page.js`, toasts)

- Tout texte utilisateur → `escapeHtml`
- Attributs `href`, `src`, `style` : valider scheme **et** echapper
- Liens externes : `rel="noopener noreferrer"` + `target="_blank"` si utilise
- Preferer `textContent` / `createElement` quand un template string n'est pas necessaire
- Canvas (`card-canvas.js`) : ne pas interpreter HTML ; dessiner du texte brut

### vCard (`vcard.js`, `vcard-builder.js`)

- `escapeValue` sur tous les textes (`;`, `,`, `\`, newlines)
- PHOTO URI : seulement si URL deja validee
- PHOTO base64 : strip prefixe data-URI apres validation MIME
- `Content-Disposition` filename : `[a-zA-Z0-9_-]` uniquement

---

## D. Acces / sessions

### Cookie session (`session-service.js`)

Obligatoire :

- `HttpOnly`
- `SameSite=Lax` (passer a `Strict` seulement si tous les flux le supportent)
- `Secure` si `IS_PRODUCTION`
- `Path=/`
- `Max-Age` aligne sur `SESSION_TTL_MS`
- Token opaque stocke cote serveur (table `sessions`), pas de JWT PII dans le cookie

### Ownership cartes

- `POST` save / list / profil : `resolveSessionFromRequest` → 401 si absent
- Si carte existante avec `userId` different → 403
- Lectures publiques (`GET` fiche, scan, vcf) : assumees volontaires ; ne pas y mettre de secrets

### Surface publique volontaire

La fiche partagee et le `.vcf` exposent nom, contacts, bio, photo. Ne pas y
ajouter email de compte, tokens, ou metadonnees internes.

---

## E. Transport / ops

### Body / taille

- Limite JSON alignee avec `photoBase64` (~2 Mo deja cote `readJsonBody` si present)
- Rejeter les corps trop gros avant parse complet si possible

### CORS (`backend/server.js`)

Risque actuel typique : reflechir `req.headers.origin` +
`Access-Control-Allow-Credentials: true`.

Cible :

- Dev LAN : origines locales explicites (`http://localhost:PORT`, `http://<lanIp>:PORT`)
- Prod : whitelist d'origines ; jamais `*` avec credentials
- Headers autorises minimaux (`Content-Type` ; pas d'ouverts inutiles)

### Secrets et env (`backend/config/env.js`)

- Pas de secret en dur dans le repo
- `AUTH_EXPOSE_OTP` desactive en prod
- DB path configurable ; ne pas servir `backend/data/*.sqlite` en static
- Verifier que `PUBLIC_ROOT` ne permet pas de lire hors du front prevu

### Logs et erreurs

- Pas de stack trace en reponse prod
- Pas de dump payload / base64 / cookie / OTP
- Messages courts (`Requete invalide`, `Non authentifie`)

### Headers de securite (cible progressive)

Ajouter quand l'app est servie en prod (Nginx ou Node) :

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY` (ou CSP `frame-ancestors`)
- CSP adaptee (pas de `cdn.tailwind` / scripts inline non maitrises a long terme)

---

## Cas de test minimaux (rejet / escape)

Chaines **inertes** en fixture (assertion de rejet ou d'escape, jamais guide d'attaque) :

| Entree | Attendu |
|---|---|
| slug `../admin` | normalise / rejete |
| nom contenant balises | stocke ; echappe au rendu |
| url `javascript:...` | rejete |
| email `not-an-email` | rejete |
| bio > 160 | rejete |
| theme / template inconnu | rejete |
| photoBase64 `data:text/html;base64,...` | rejete |
| phone avec lettres / markup | rejete |
| OTP non numerique / != 6 | rejete |
| save sans cookie | 401 |
| save slug d'un autre user | 403 |

---

## Ecarts connus a surveiller dans le code actuel

Points frequents a re-verifier lors d'un audit (ne pas assumer "deja OK") :

1. `upsertCard` : trim seul, peu de validation de format / longueur / MIME.
2. `cardTemplate` / `qrLogo*` : presents cote front Config ; confirmer persistance + validation serveur.
3. CORS : reflection d'`Origin` + credentials.
4. `AUTH_EXPOSE_OTP` : comportement hors production.
5. Enums theme/template : doivent suivre `constants.js`, pas une liste hardcodee obsolete.
