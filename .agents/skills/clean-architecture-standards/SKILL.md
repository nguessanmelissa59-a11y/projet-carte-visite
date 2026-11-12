---
name: clean-architecture-standards
description: >-
  Use this skill when creating, structuring, refactoring, or reviewing a project to enforce software engineering standards, modular directory organization, separation of concerns, and sober human-written code and documentation without AI artifacts or emojis.
---

# Clean Architecture & Developer Standards

Ce skill definit la structure de projet, le decoupage modulaire et les conventions d'ecriture a appliquer lors de la creation ou de la refonte d'une application.

## 1. Organisation des dossiers

Ne jamais laisser les scripts utilitaires, les feuilles de style, la logique metier et la documentation melanges a la racine du depot. Appliquer l'arborescence suivante :

```text
racine_du_projet/
├── assets/
│   ├── css/             # Feuilles de style
│   └── images/          # Ressources statiques
├── docs/                # Specifications (PRD), architecture et guides techniques
├── scripts/             # Scripts d'automatisation (Git, build, deploiement)
├── src/
│   ├── config/          # Constantes, themes et configuration par defaut
│   ├── services/        # Logique metier pure (encodage, generation de fichiers, stockage)
│   ├── ui/              # Rendu des composants et manipulation du DOM
│   └── main.js          # Point d'entree et orchestration des evenements
├── .gitignore
├── AGENTS.md            # Regles permanentes du depot
├── README.md            # Presentation concise et technique du projet
└── index.html           # Point d'entree HTML (a la racine pour compatibilite GitHub Pages)
```

## 2. Principes de code (Separation of Concerns)

1. **Un fichier = une responsabilite claire** :
   - Ne pas creer de fichier monolithique de plus de 300 lignes melangeant constantes, manipulation DOM, encodage reseau et stockage local.
   - Isoler les fonctions pures (ex: generation RFC 2426 `.vcf`, compression d'URL) dans `src/services/`.
   - Isoler le rendu HTML et les composants visuels dans `src/ui/`.
2. **Nommage et lisibilite** :
   - Variables et fonctions en `camelCase` explicite.
   - Constantes globales en `UPPER_SNAKE_CASE`.
   - Fichiers en `kebab-case.js`.
3. **Commentaires sobres** :
   - Commenter uniquement le *pourquoi* (ex: contrainte RFC 2426 ou compatibilite Safari iOS), jamais l'evidence.
   - Aucun bandeau decoratif superflu ni emoji dans le code ou les logs.

## 3. Conventions Git et Documentation

1. **Messages de commit (Conventional Commits)** :
   - Format : `<type>: <description courte sans emoji>`
   - Types autorises : `feat`, `fix`, `refactor`, `docs`, `chore`, `style`.
2. **Documentation Markdown** :
   - Titres sobres sans icones ni emojis.
   - Explications directes, orientees developpeur.

## 4. Verification de conformite

Avant de finaliser une refonte :
1. Verifier qu'aucun fichier `.js`, `.css` ou `.ps1` ne traine a la racine.
2. Verifier que tous les chemins relatifs dans `index.html`, `.vscode/tasks.json` et `docs/` pointent vers les nouveaux sous-dossiers (`assets/`, `src/`, `scripts/`).
3. Verifier l'absence totale d'emojis dans le code, les scripts et la documentation.
