---
name: scan-path-performance
description: >-
  Optimise le parcours public de scan QR (vue fiche /c/:slug, ?id=, ?data=)
  pour un first paint rapide sur mobile. A utiliser quand l'utilisateur parle
  de scan, QR, vue publique, fiche partagee, cold start mobile, ou lenteur
  apres flash du QR Code.
---

# Scan Path Performance

Specialiste du chemin **scan → fiche lisible**. Ce chemin prime sur l'editeur
studio : un contact qui scanne ne doit pas attendre Tailwind CDN, Lucide
complet, ni la reponse API.

## Objectif

Sur telephone (reseau moyen) : contenu identite visible rapidement, actions
(appeler, email, telecharger vCard) utilisables, QR secondaire non bloquant.

## Protocole

1. Reproduire en mode scan : `/?id=<slug>&scan=1` ou payload `?data=`.
2. Noter ce qui bloque avant le premier texte/photo utile.
3. Appliquer les regles ci-dessous sans casser le sync backend.
4. Verifier 360 px : pas de scroll horizontal, CTA >= ~44 px.
5. Relire `web-performance-optimization` pour cache HTTP et budgets globaux.

```text
Scan Path Progress:
- [ ] URL de repro notee
- [ ] Shell visible sans attendre API
- [ ] Scripts non critiques ajournes
- [ ] Photo / QR non bloquants
- [ ] Actions contact OK hors-ligne partiel
- [ ] Controle 360/768
```

## Regles dures

1. **Rendu local d'abord** — garder le flux `populateForm` → `setViewMode` →
   `renderAll` avant `initBackendConnection`. Ne jamais inverser.
2. **Masquer l'editeur tot** en vue scan — CSS/classe sur `body` ou `#editorView`
   des le premier script critique, pas apres un round-trip reseau.
3. **API en arriere-plan** — statut backend, fetch slug, increment scan : async,
   sans vider l'UI deja peinte (remplacer les champs quand les donnees arrivent).
4. **Pas de dependance CDN pour peindre la fiche** — texte, layout, theme doivent
   vivre en CSS/JS locaux. QR lib et canvas export peuvent charger apres.
5. **Auto-download vcf** — ne declencher qu'apres donnees stables ; ne pas
   bloquer le paint pour ca.
6. **Photo** — si absente ou lourde : placeholder fixe (dimensions reservees)
   pour eviter le CLS ; compression avant save cote editeur.

## Decoupage charge utile (ordre)

| Phase | Contenu | Timing |
|---|---|---|
| 0 | HTML + CSS local + theme | immediat |
| 1 | Identite (nom, titre, org, actions tel/mail) | sync local |
| 2 | Icônes / polish | apres paint ou SVG inline |
| 3 | QR canvas / libs | idle ou interaction |
| 4 | Hydration API (slug serveur) | async |

## Interdits

- Attendre `/api/info` ou `/api/cards/:slug` pour afficher le nom.
- Appeler `lucide.createIcons()` sur tout le document a chaque refresh scan.
- Regenerer le QR haute resolution pendant le first paint scan.
- Ajouter des animations d'entree longues sur la vue publique.

## Definition of Done

- Fiche lisible avec backend coupe (mode `?data=` ou draft local).
- Avec backend : mise a jour sans flash blanc ni layout jump majeur.
- Preuve courte : ordre reseau (CSS local avant vendors) + test 360 px.
- Compatibilite avec `frontend-editorial-design` et
  `web-performance-optimization`.

## Lien

Details budgets / cache / snippets : skill
`web-performance-optimization` → [reference.md](../web-performance-optimization/reference.md)
