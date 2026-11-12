---
name: run-project-tests
description: >-
  Ecrit et execute les tests du projet EVC Melissa (Node.js node:test,
  contrats UI .mjs, auth API, vCard/QR). A utiliser quand l'utilisateur
  demande de tester, lancer les tests, npm test, non-regression, couverture,
  verifier un correctif, ou apres une fonctionnalite/backend/frontend.
---

# Tests EVC Melissa

Tu es le specialiste tests de ce depot. Aucune fonctionnalite ou correctif
n'est termine tant que les tests du perimetre n'ont pas ete ecrits (si le
comportement change) et executes avec une sortie lue.

Ne pas installer de framework de test. Runner impose : `node:test` et/ou
scripts manuels `.mjs` deja presents dans `tests/`.

## Quand charger ce skill

- Demande : tests, `npm test`, non-regression, couverture, « verifie »
- Apres auth, cartes, QR, formulaire, UI, ou API
- Apres un bug : ajouter un test qui echouait avant le correctif

Sauter seulement si l'utilisateur l'interdit explicitement.

## Inventaire actuel

| Fichier | Role | Lancement |
|---|---|---|
| `tests/test-auth.js` | Auth, session, OTP, cartes API (HTTP mock) | `npm test` ou `node --test tests/test-auth.js` |
| `tests/test-ui-contract.mjs` | Contrats HTML/CSS/JS (IDs, fonts, QR vendor) | `node tests/test-ui-contract.mjs` |

`package.json` → `"test"` ne lance que `test-auth.js`. Pour un bilan complet,
executer les deux commandes.

Details de style et helpers : [reference.md](reference.md).

## Boucle obligatoire

```text
Tests:
- [ ] Perimetre identifie (fichiers / comportement)
- [ ] Fichier de test existant relu (ne pas reinventer)
- [ ] Tests ajoutes ou mis a jour
- [ ] Commande(s) ciblee(s) executee(s)
- [ ] Echec → cause lue → correctif → meme commande
- [ ] Bilan rapporte
```

Maximum **3** correctifs sur le meme echec. Au-dela, s'arreter et rapporter.
Ne jamais affaiblir une assertion pour obtenir un vert.
Ne jamais supprimer un test existant pour faire passer la suite.

## 1. Choisir quoi lancer

| Changement | Commande |
|---|---|
| Auth, session, OTP, `/api/cards`, profil | `npm test` |
| `index.html`, CSS, `src/ui/*`, QR, templates | `node tests/test-ui-contract.mjs` |
| Les deux / livraison large | les deux, dans cet ordre |
| Nouveau module de test | `node --test tests/<fichier>.js` ou `node tests/<fichier>.mjs` |

Repertoire de travail : racine du projet (`projet_carte_visite/`).

Isoler la base en test : `DB_DIR` / `DB_PATH` dans un repertoire temporaire
(voir `tests/test-auth.js`). `NODE_ENV=test`. Ne jamais pointer vers la DB
de developpement.

## 2. Ou ecrire

- Reutiliser le fichier du domaine touche.
- Nouveau domaine → `tests/test-<domaine>.js` (API / logique) ou
  `tests/test-<domaine>.mjs` (contrats UI / lecture de sources).
- Un comportement = un `test('...', async () => { ... })` (ou une fonction
  nommee dans le tableau du `.mjs`).
- Nom : `test_<comportement_attendu>` ou titre clair en francais/anglais
  coherent avec les voisins.

Lire un test voisin avant d'ecrire. Copier imports, mocks `req`/`res`,
helpers cookie, et style d'assertions (`node:assert/strict`).

## 3. Quoi couvrir (minimum)

1. Chemin nominal.
2. Refus (auth manquante, validation, 4xx) pour tout endpoint ou champ persiste.
3. Cas limite du correctif (non-regression).

Regles projet :

- Pas d'appel reseau externe ; mock HTTP local uniquement.
- Pas de dependance a un serveur deja lance sur `:3000` pour les tests unitaires.
- Donnees perso / OTP : jamais logges en clair dans les assertions verboses.
- UI : les contrats `.mjs` ne remplacent pas un parcours navigateur si le
  rendu visible change ; le dire dans le bilan si pas de navigateur.

## 4. Executer et corriger

1. Lancer uniquement le(s) fichier(s) du perimetre.
2. Lire la sortie complete (echec + stack).
3. Corriger le code si le test exprime le besoin ; corriger le test s'il est faux
   (mauvais ID HTML, mauvaise URL, fixture incomplete).
4. Relancer **la meme** commande.

Si un nouveau fichier de test API doit entrer dans `npm test`, mettre a jour
`package.json` → `"test"` pour l'inclure (ex. `node --test tests/test-*.js`)
et le signaler dans le bilan.

## 5. Bilan (obligatoire)

```text
Tests:
- Fichiers: <chemins>
- Commande: <commande exacte>
- Resultat: <N passes, M echoues>
- Reste: <rien | cause + blocage>
```

## Interdits

- Conclure « termine » sans commande lancee et sans resultat lu.
- Installer Jest, Vitest, Mocha, Playwright, Cypress sans demande explicite.
- Utiliser la DB prod/dev reelle (`backend/data` ou chemin utilisateur).
- Commit sauf demande explicite.
- Emojis dans le code, les logs de test ou le bilan.
