# Reference — validation par type de champ

Lire ce fichier seulement apres le protocole de `SKILL.md`, pour appliquer les
regles concretes. Valeurs indiquees = cibles recommandees pour vCard Studio ;
ajuster si le PRD impose autrement, mais documenter l'ecart.

## Constantes recommandees

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
  bio: 160,
  photoBase64: 1_500_000, // caracteres data-URI approx. (~1 Mo image)
};

const ALLOWED_THEMES = new Set([
  'obsidian',
  'forest',
  'cobalt',
  'bronze',
  'bordeaux',
]);

const ALLOWED_URL_SCHEMES = new Set(['https:']);
// En dev LAN uniquement, http: peut etre ajoute explicitement.
```

## Helpers minimaux (modele)

Placer dans `backend/services/validation.js` (ou equivalent). Ne pas dupliquer
la logique dans le controller et le repository.

```js
function asString(value, max) {
  const s = String(value ?? '').trim();
  if (s.length > max) {
    throw new Error('Champ trop long');
  }
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
  // Format pragmatique ; pas de RFC complete.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email invalide');
  }
  return email;
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
  return url.toString();
}

function assertTheme(raw) {
  const theme = String(raw || 'obsidian');
  if (!ALLOWED_THEMES.has(theme)) {
    throw new Error('Theme invalide');
  }
  return theme;
}

function assertPhotoBase64(raw) {
  const value = String(raw || '');
  if (!value) return '';
  if (value.length > FIELD_LIMITS.photoBase64) {
    throw new Error('Image trop volumineuse');
  }
  if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(value)) {
    throw new Error('Image invalide');
  }
  return value;
}
```

Adapter les messages : generiques cote API publique, plus precis cote UX front.

## Regles par champ

### slug

- Whitelist apres `slugify` : `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Max 48 ; jamais d'espace, slash, `..`, `@`
- Utiliser uniquement la version normalisee dans les routes `/c/:slug`, `/v/:slug`
- Ne pas concatenner le slug brut dans un header ou un chemin fichier

### Textes (firstName, lastName, jobTitle, organization, location)

- Trim + longueur max
- Pas de strip HTML agressif cote stockage si l'escape sortie est garanti ;
  l'escape au rendu / vCard est obligatoire
- `firstName` / `lastName` : rejet si vides au save metier (deja `required` HTML)

### bio

- `maxlength` HTML 160 **et** controle serveur 160
- Escape HTML + escape vCard (`NOTE`)

### email

- Validation format + max 254
- Dans `mailto:` : echapper l'attribut ; ne pas accepter d'URI `mailto:` complete
  saisie par l'utilisateur (saisir l'adresse seule)

### phone / whatsapp

- Autoriser `+`, chiffres, espaces, `()`, `.`, `-`
- Pour `wa.me` : deriver un digits-only cote rendu ; ne jamais injecter la saisie
  brute dans le path sans normalisation
- Rejeter lettres et caracteres de markup

### linkedinUrl / portfolioUrl / photoUrl

- Parser avec `URL`
- Scheme whitelist (`https:` ; `http:` seulement si env de dev documentee)
- Rejeter credentials dans l'URL si possible (`url.username` / `url.password`)
- Ne pas faire de fetch serveur de `photoUrl` sans controle SSRF (IP privees,
  metadata cloud). Preferer stocker l'URL et laisser le navigateur charger, ou
  telecharger via un proxy durci.

### photoUpload / photoBase64

- Front : `accept="image/*"` + controle taille avant lecture FileReader
- Serveur : regex data-URI image + plafond longueur
- Interdit : `data:text/html`, SVG scriptable si politique stricte (option :
  n'autoriser que png/jpeg/webp)
- Au rendu : `escapeHtml` sur `src` ; preferer `img.src = url` via DOM API plutot
  que concatener dans un template si le flux le permet

### theme

- Enum fermee (`ALLOWED_THEMES`)
- Valeur hors liste → erreur ou fallback explicite documente (preferer erreur
  au save)

### autoDownload

- Cast strict en booleen (`=== true` / `=== false` ou `1` / `0`)
- Ne pas faire `Boolean("false")` (deviendrait `true`)

## Couche rendu (DOM)

Checklist cible `src/ui/profile-card.js` et tout `innerHTML` :

- Tout texte utilisateur passe par `escapeHtml`
- Attributs `href`, `src`, `style` : echapper **et** valider le scheme avant
- Liens externes : `rel="noopener noreferrer"` + `target="_blank"` si utilise
- Preferer `textContent` / `createElement` quand un template string n'est pas
  necessaire

## Couche export vCard

- `escapeValue` sur tous les champs texte (`;`, `,`, `\`, `\n`)
- PHOTO URI : uniquement si URL deja validee
- PHOTO base64 : strip du prefixe data-URI apres validation MIME
- `Content-Disposition` filename : caracteres `[a-zA-Z0-9_-]` uniquement

## Couche API / transport

- Limite body JSON (deja ~2 Mo) : garder alignee avec `photoBase64`
- Reponses d'erreur : message court, pas de stack en prod
- CORS : restreindre l'origine en exposition reseau non locale
- Pas d'auth aujourd'hui : traiter toute ecriture comme publique ; ne pas y
  stocker de secrets

## Cas de test minimaux (assertions de rejet)

Utiliser des chaines **inertes** en fixture (elles doivent etre rejetees ou
echappees, jamais executees comme guide d'attaque) :

| Entree | Attendu |
|---|---|
| slug `../admin` | normalise / rejete, pas de path traversal |
| nom `<img src=x onerror=alert(1)>` | stocke echappe au rendu (pas d'execution) |
| url `javascript:alert(1)` | rejete |
| email `not-an-email` | rejete |
| bio 200 caracteres | rejete ou tronque selon regle choisie (preferer rejet) |
| theme `neon` | rejete |
| photoBase64 `data:text/html;base64,...` | rejete |
| phone `abc<script>` | rejete |

## Mapping fichiers projet

| Couche | Fichiers typiques |
|---|---|
| HTML | `index.html` (`#vcardForm`) |
| Config champs | `src/config/constants.js` (`FORM_FIELDS`) |
| Client | `src/main.js`, `src/services/api.js` |
| Rendu | `src/ui/profile-card.js` |
| vCard client | `src/services/vcard.js` |
| API | `backend/controllers/card.controller.js` |
| Persistance | `backend/db/repository.js` |
| vCard serveur | `backend/services/vcard-builder.js` |
| Validation (cible) | `backend/services/validation.js` |
