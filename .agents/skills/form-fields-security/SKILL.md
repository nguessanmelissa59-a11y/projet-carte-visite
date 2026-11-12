---
name: form-fields-security
description: >-
  Audit and harden form field security (validation, sanitization, XSS, URL
  schemes, file upload, slug, length limits, CSRF/CORS). Use when adding or
  changing form inputs, validating payloads, reviewing card/profile fields,
  photo upload/URL, email/tel/url inputs, or when the user mentions securite
  formulaire, validation champs, XSS, sanitize, or input hardening.
---

# Securite des champs de formulaire

Skill defensif uniquement. Pas d'exploits, pas de PoC offensifs, pas de payloads
d'attaque. Objectif : valider, sanitizer, limiter et echapper correctement.

Contexte projet type : formulaire vCard (`#vcardForm`), API JSON
(`handleSaveCard` / `upsertCard`), rendu DOM (`profile-card.js`), export `.vcf`.

## Quand charger ce skill

- Ajout / modification d'un champ dans `index.html`, `FORM_FIELDS`, payload API
- Validation front ou back manquante / incomplete
- Affichage de donnees utilisateur (`innerHTML`, attributs HTML, `.vcf`)
- Upload photo, `photoUrl`, `photoBase64`, liens (`linkedinUrl`, `portfolioUrl`)
- Audit securite du formulaire ou revue avant merge

## Protocole (ordre fixe)

1. **Inventorier** les champs (HTML + payload JSON + colonnes DB).
2. **Classer** chaque champ (voir table ci-dessous).
3. **Verifier les 4 couches** : HTML / JS client / API serveur / rendu / export.
4. **Corriger** couche serveur d'abord (jamais se fier au seul front).
5. **Tester** rejet des entrees invalides + absence de XSS au rendu.
6. **Rapporter** findings avec severite et preuve courte.

Details par type de champ : [reference.md](reference.md).

## Classification des champs (vCard Studio)

| Champ | Classe | Risques principaux |
|---|---|---|
| `slug` | identifiant | path/open redirect, collision, injection URL |
| `firstName`, `lastName`, `jobTitle`, `organization`, `location` | texte libre | XSS, injection vCard, longueur |
| `bio` | texte long borne | XSS, longueur, note vCard |
| `email` | email | XSS via `mailto:`, format |
| `phone`, `whatsapp` | telephone | XSS via `tel:` / `wa.me`, caracteres |
| `linkedinUrl`, `portfolioUrl`, `photoUrl` | URL | `javascript:`, XSS attribut, SSRF si fetch serveur |
| `photoUpload` / `photoBase64` | binaire / data-URI | type MIME, taille, XSS via data URI |
| `theme` | enum | valeurs hors liste |
| `autoDownload` | booleen | type confusion |

## Regles non negociables

1. **Validation serveur obligatoire** sur tout champ persiste. Le HTML
   (`type`, `maxlength`, `required`) est une aide UX, pas une barriere.
2. **Whitelist** plutot que blacklist pour : slug, theme, schemes URL, MIME image.
3. **Echapper au point de sortie** :
   - HTML / attributs : `escapeHtml` (ou equivalent) avant `innerHTML`
   - vCard : `escapeValue` (`;`, `,`, `\`, newlines)
   - Noms de fichiers telecharges : caracteres alphanumeriques uniquement
4. **URL** : n'autoriser que `https:` (et `http:` en local si justifie). Rejeter
   `javascript:`, `data:` (sauf photo data-URI controlee), `vbscript:`, `file:`.
5. **Upload / base64** : limiter taille, verifier prefixe MIME image, ne jamais
   injecter un data-URI non valide dans le DOM sans controle.
6. **Longueurs max** explicites cote serveur (alignées sur le HTML).
7. **Pas de confiance** dans `Access-Control-Allow-Origin: *` pour des ecritures
   sensibles en prod : documenter le risque et durcir (origine, auth) si expose.
8. **Ne jamais** loguer le contenu brut de `photoBase64` ni de donnees perso
   completes dans les logs.

## Checklist d'audit (copier et cocher)

```text
Form fields security
- [ ] Inventaire champs HTML = FORM_FIELDS = colonnes / payload
- [ ] Chaque champ a une regle serveur (type, longueur, format)
- [ ] Slug : whitelist [a-z0-9-], longueur borne, slugify unique
- [ ] URLs : scheme https (http local documente), pas de javascript:
- [ ] Email / tel : format + normalisation, pas d'HTML brut dans href
- [ ] Bio / textes : maxlength serveur + escape au rendu
- [ ] Theme : enum fermee
- [ ] Photo : taille max + MIME image + escape attributs
- [ ] Payload JSON : limite de taille (deja ~2 Mo) coherente avec photo
- [ ] Rendu : aucun innerHTML avec donnee brute
- [ ] Export vcf : escapeValue sur tous les champs texte
- [ ] Messages d'erreur generiques (pas de fuite interne)
```

## Severites

| Severite | Exemple |
|---|---|
| CRITICAL | XSS stocke rendu dans la fiche publique ; `javascript:` en lien |
| HIGH | Pas de validation serveur ; upload sans limite / MIME |
| MEDIUM | Longueur non bornee ; CORS `*` sur POST ; enum theme ouverte |
| LOW | `maxlength` HTML seul ; messages d'erreur trop verbeux |

Format de finding :

```text
[SEVERITE] Champ `<id>` — <impact court>
Fichier:ligne — <preuve>
Correctif: <action concrete>
```

## Workflow de correction

1. Ajouter / renforcer la validation dans le module serveur
   (`repository.js` / futur `validators.js` ou `services/validation.js`).
2. Aligner le front (attributs HTML + feedback UX) sans remplacer le serveur.
3. Garantir l'escape au rendu (`profile-card.js`, canvas, toasts).
4. Garantir l'escape vCard (`vcard.js` / `vcard-builder.js`).
5. Ajouter ou mettre a jour des tests de rejet (entrees invalides) et de
   non-regression XSS (caracteres `<`, `"`, `javascript:`).

## Definition of Done

`Termine` seulement si :

- chaque champ du perimetre a une regle serveur verifiable ;
- les sorties HTML et vCard sont echappees ;
- URLs et upload respectent whitelist + limites ;
- tests du perimetre executes (ou checklist manuelle documentee si pas encore
  de harness) ;
- aucun payload offensif livre dans le depot (fixtures de test = chaines inertes
  type `<script>` en assertion de rejet uniquement).

## Interdits

- Fournir des exploits, PoC d'attaque, ou guides de contournement.
- Desactiver l'escape "parce que ca casse le design".
- Valider uniquement cote client.
- Utiliser `innerHTML` avec des champs utilisateur non echappes.
- Accepter un scheme URL hors whitelist "pour plus de flexibilite".

## Ressources

- Regles detaillees par type : [reference.md](reference.md)
- Design UI des champs : skill `frontend-editorial-design` (hors securite)
- Architecture dossiers : skill `clean-architecture-standards`
