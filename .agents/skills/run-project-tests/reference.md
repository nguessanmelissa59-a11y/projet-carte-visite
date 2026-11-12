# Reference — conventions de test EVC Melissa

## Auth / API (`tests/test-auth.js`)

Stack : CommonJS + `node:test` + `node:assert/strict`.

Pattern etabli :

1. Creer un repertoire temporaire (`fs.mkdtempSync`) et setter
   `process.env.DB_DIR`, `process.env.DB_PATH`, `NODE_ENV=test`
   **avant** le `require` des controllers.
2. Option `AUTH_EXPOSE_OTP=1` pour lire l'OTP en test sans inbox.
3. `createMockReq` / `createMockRes` pour appeler les handlers directement.
4. Serveur `http.createServer` minimal dans `before`, ferme dans `after`.
5. Extraire le cookie session via `Set-Cookie` + `SESSION_COOKIE_NAME`.

Assertions typiques : `assert.equal(res.statusCode, 200)`,
`assert.ok(body.ok)`, corps JSON via `res.json()`.

Nouveau test auth : l'ajouter dans le meme fichier sauf si le fichier
depasse ~400 lignes — alors scinder en `tests/test-auth-<domaine>.js`
et l'inclure dans le script `npm test`.

## Contrats UI (`tests/test-ui-contract.mjs`)

Stack : ESM + assert, sans `node:test` (boucle manuelle + `process.exitCode`).

Pattern etabli :

1. Lire les sources avec `readFileSync` depuis la racine projet.
2. Verifier IDs HTML critiques, fonts, chemins CSS/vendor.
3. Pour le vendor QR : charger dans `vm` et assert sur `QRCode.toCanvas`.
4. Pour le JS UI : `assert.match` / `assert.doesNotMatch` sur le source
   (gardes, constantes, fonctions publiques).

Nouveau contrat UI : ajouter une fonction `testXxx()` + une entree dans
le tableau `tests` en bas du fichier.

Quand ajouter un ID dans `requiredIds` : seulement s'il est necessaire
au parcours (formulaire, preview, QR, theme). Pas chaque span decoratif.

## Commandes utiles (PowerShell)

```powershell
# Suite npm (auth)
npm test

# Contrats UI seuls
node tests/test-ui-contract.mjs

# Fichier API precis
node --test tests/test-auth.js

# Tous les .js sous tests/ (si plusieurs fichiers node:test)
node --test tests/
```

## Mise a jour de `package.json`

Si plusieurs fichiers `node:test` existent :

```json
"test": "node --test tests/test-*.js"
```

Les `.mjs` a boucle manuelle restent lances a part, ou ajoutes en script :

```json
"test:ui": "node tests/test-ui-contract.mjs",
"test:all": "npm test && npm run test:ui"
```

Ne les ajouter que si l'utilisateur le demande ou si le skill les rend
necessaires pour un bilan complet recurrent.

## Definition of Done (tests)

- Commande(s) du perimetre executee(s)
- Sortie lue (pass/fail)
- Nouveau comportement couvert (nominal + refus si endpoint)
- Aucune assertion affaiblie
- Bilan poste dans la reponse
