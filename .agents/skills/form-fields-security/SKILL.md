---
name: form-fields-security
description: >-
  Audit et durcissement defensif de la securite applicative EVC Melissa :
  validation/sanitization des champs formulaire et auth, XSS au rendu,
  schemes URL, upload photo/logo, slug, enum theme/template, sessions OTP
  et cookies, controle d'acces cartes, CORS, secrets, logs. A utiliser
  quand on ajoute ou modifie des inputs, payloads API, rendu fiche,
  auth/OTP/session, upload, ou quand l'utilisateur parle de securite
  formulaire, XSS, sanitize, CSRF/CORS, hardening, ou validation champs.
---

# Securite des champs et surface applicative

Skill **defensif uniquement**. Pas d'exploits, pas de PoC offensifs, pas de
payloads d'attaque. Objectif : valider a l'entree, controler l'acces,
echapper a la sortie, limiter le transport.

Stack cible : HTML/CSS/JS vanilla + API Node (`backend/`) + SQLite.

## Quand charger ce skill

- Ajout / modification d'un champ (`index.html`, `FORM_FIELDS`, payload API)
- Auth (email, nom, OTP), cookie de session, endpoints proteges
- Affichage de donnees utilisateur (`innerHTML`, attributs, `.vcf`, canvas)
- Upload `photo*` / `qrLogo*`, URLs (`linkedinUrl`, `portfolioUrl`, `photoUrl`)
- CORS, headers, secrets, logs, audit avant merge

## Volets couverts

| Volet | Perimetre | Detail |
|---|---|---|
| A. Champs carte | `FORM_FIELDS` + `photoBase64` / `qrLogo*` / `theme` / `cardTemplate` / `autoDownload` | [reference.md](reference.md#a-champs-carte) |
| B. Champs auth | email, prenom/nom, OTP | [reference.md](reference.md#b-champs-auth) |
| C. Rendu / export | DOM, toasts, canvas, vCard | [reference.md](reference.md#c-rendu--export) |
| D. Acces / sessions | cookie `HttpOnly`, ownership carte, lectures publiques | [reference.md](reference.md#d-acces--sessions) |
| E. Transport / ops | CORS, body size, secrets, logs, erreurs | [reference.md](reference.md#e-transport--ops) |

Lire `reference.md` **apres** le protocole, uniquement pour le volet touche.

## Protocole (ordre fixe)

1. **Inventorier** : HTML + `FORM_FIELDS` / auth forms + payload JSON + colonnes DB.
2. **Classer** chaque champ (table ci-dessous) et chaque endpoint (public / session).
3. **Verifier les couches** : HTML UX → JS client → API serveur → persistance → rendu / export.
4. **Corriger serveur d'abord** (jamais se fier au seul front).
5. **Durcir acces** : ecritures et listes = session + ownership ; lectures scan/vcf = public volontaire.
6. **Tester** : rejet des entrees invalides, XSS non executable au rendu, 401/403 corrects.
7. **Rapporter** findings avec severite et preuve courte.

```text
Security Progress:
- [ ] Inventaire champs / endpoints
- [ ] Validation serveur complete (carte + auth)
- [ ] Escape HTML + vCard verifies
- [ ] URL / upload whitelist + limites
- [ ] Session cookie + ownership verifies
- [ ] CORS / secrets / logs evalues
- [ ] Tests rejet + non-regression XSS / 401-403
```

## Classification rapide — carte

| Champ | Classe | Risques |
|---|---|---|
| `slug` | identifiant | path, collision, injection URL |
| `firstName`, `lastName`, `jobTitle`, `organization`, `location` | texte | XSS, injection vCard, longueur |
| `bio` | texte borne | XSS, longueur |
| `email` | email | XSS `mailto:`, format |
| `phone`, `whatsapp` | telephone | XSS `tel:` / `wa.me` |
| `linkedinUrl`, `portfolioUrl`, `photoUrl`, `qrLogoUrl` | URL | `javascript:`, XSS attribut, SSRF si fetch serveur |
| `photoBase64`, `qrLogoBase64` | data-URI | MIME, taille, XSS |
| `theme`, `cardTemplate` | enum | valeur hors liste |
| `autoDownload` | booleen | type confusion |

## Classification rapide — auth

| Champ | Classe | Risques |
|---|---|---|
| `email` | email | enumeration, format, longueur |
| `firstName`, `lastName` | texte borne | XSS si rendu profil, injection |
| `code` (OTP) | OTP 6 chiffres | brute-force, fuite via `AUTH_EXPOSE_OTP` |

## Endpoints — posture attendue

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/cards/:slug`, scan, `.vcf` | public | Donnees de fiche volontairement partagees |
| `GET /api/cards`, `POST` save, profil | session | Ownership obligatoire sur ecriture |
| Auth request/verify/logout/me | mixte | Rate-limit OTP ; ne jamais exposer OTP en prod |

## Regles non negociables

1. **Validation serveur** sur tout champ persiste. HTML (`type`, `maxlength`) = UX seule.
2. **Whitelist** pour slug, theme, cardTemplate, schemes URL, MIME image.
3. **Echapper a la sortie** : `escapeHtml` avant `innerHTML` ; `escapeValue` vCard ; filename alphanumerique.
4. **URL** : `https:` seul ( `http:` local documente ). Rejeter `javascript:`, `data:` (sauf data-URI image controlee), `vbscript:`, `file:`.
5. **Upload / base64** : plafond taille + prefixe MIME image ; pas de `data:text/html` ni SVG scriptable si politique stricte.
6. **Session** : cookie `HttpOnly` + `SameSite=Lax` + `Secure` en prod ; token opaque ; TTL borne.
7. **Ownership** : refuse d'ecraser une carte d'un autre `userId` (403).
8. **CORS** : ne pas reflechir n'importe quelle `Origin` avec credentials en exposition non locale ; whitelist explicite.
9. **Secrets / PII** : jamais logger OTP, token session, `photoBase64` brut, ni dump profil complet.
10. **Erreurs** : messages generiques cote API publique ; pas de stack en prod.

## Checklist d'audit (copier)

```text
Form + app security
- [ ] Inventaire HTML = FORM_FIELDS / auth = colonnes / payload
- [ ] Chaque champ persiste a une regle serveur (type, longueur, format)
- [ ] Slug : [a-z0-9-], longueur borne, slugify unique
- [ ] URLs : scheme https, pas de javascript:
- [ ] Email / tel / OTP : format + bornes
- [ ] Theme + cardTemplate : enums fermees (cles de Config)
- [ ] Photo / logo : taille + MIME image
- [ ] Rendu : aucun innerHTML avec donnee brute
- [ ] Export vcf : escapeValue partout
- [ ] Ecritures / listes : session + ownership
- [ ] Cookie session : HttpOnly, SameSite, Secure prod
- [ ] OTP : rate-limit + pas d'exposition en prod
- [ ] CORS credentials : origines explicites hors LAN
- [ ] Logs sans secrets / base64 / PII complete
```

## Severites

| Severite | Exemple |
|---|---|
| CRITICAL | XSS stocke sur fiche publique ; `javascript:` en lien ; vol de session |
| HIGH | Pas de validation serveur ; upload sans limite/MIME ; ecrasement carte sans ownership |
| MEDIUM | Enum ouverte ; CORS permissif + credentials ; OTP expose hors dev ; longueur non bornee |
| LOW | `maxlength` HTML seul ; messages trop verbeux ; Secure cookie manque en staging |

Format finding :

```text
[SEVERITE] <surface> — <impact court>
Fichier:ligne — <preuve>
Correctif: <action concrete>
```

## Workflow de correction

1. Validation centrale : `backend/services/validation.js` (carte) et
   `backend/services/auth-validation.js` (auth) — pas de logique dupliquee
   dans controller / repository.
2. Brancher validation dans `handleSaveCard` / auth controllers **avant** upsert.
3. Aligner front (attributs HTML + feedback) sans remplacer le serveur.
4. Garantir escape rendu (`profile-card.js`, `auth-page.js`, canvas, toasts).
5. Garantir escape vCard (`vcard.js` / `vcard-builder.js`).
6. Revoir cookie / CORS / ownership si le perimetre touche auth ou API.
7. Tests de rejet (entrees invalides) + non-regression XSS / 401 / 403.

## Definition of Done

`Termine` seulement si :

- chaque champ du perimetre a une regle serveur verifiable ;
- sorties HTML et vCard echappees ;
- URLs / upload en whitelist + limites ;
- endpoints d'ecriture / liste proteges session + ownership ;
- cookie et CORS evalues pour le mode de deploiement vise ;
- tests du perimetre executes (ou checklist manuelle documentee) ;
- aucun payload offensif livre (fixtures = chaines inertes en assertion de rejet).

## Interdits

- Fournir exploits, PoC d'attaque, guides de contournement.
- Desactiver l'escape "parce que ca casse le design".
- Valider uniquement cote client.
- `innerHTML` avec champs utilisateur non echappes.
- Accepter un scheme URL hors whitelist.
- Logger OTP, tokens, ou data-URI completes.
- Reflechir `Access-Control-Allow-Origin: <Origin>` + credentials sans whitelist.

## Mapping fichiers

| Couche | Fichiers |
|---|---|
| HTML | `index.html` |
| Config | `src/config/constants.js` |
| Client | `src/main.js`, `src/services/api.js`, `src/ui/auth-page.js` |
| Rendu | `src/ui/profile-card.js`, `src/ui/card-canvas.js` |
| vCard client | `src/services/vcard.js` |
| API | `backend/server.js`, `backend/controllers/*.js` |
| Auth | `backend/services/auth-validation.js`, `otp-service.js`, `session-service.js` |
| Persistance | `backend/db/repository.js`, `auth-repository.js` |
| vCard serveur | `backend/services/vcard-builder.js` |
| Validation carte (cible) | `backend/services/validation.js` |
| Env | `backend/config/env.js` |

## Ressources

- Regles detaillees : [reference.md](reference.md)
- UI des champs : skill `frontend-editorial-design` (hors securite)
- Architecture : skill `clean-architecture-standards`
- Cloture tests : skill `test-after-feature` / `run-project-tests`
