---
name: frontend-editorial-design
description: >-
  Use this skill when designing, building, or refactoring frontend interfaces (HTML, CSS, Tailwind, React) to avoid generic AI-generated aesthetics and enforce an editorial, Swiss-inspired, high-craft UI similar to Linear, Stripe, or Apple HIG.
---

# Frontend Editorial Design Standards

Ce skill definit les regles visuelles et ergonomiques pour produire des interfaces web authentiques, sobres et concues comme par un designer produit senior, sans les cliches visuels typiques des generations par IA.

## 1. Interdictions formelles (Anti-cliches IA)

1. **Bannir le degradé Indigo/Violet par defaut** (`from-indigo-500 to-purple-600` ou `to-violet-600`) omnipresent dans les interfaces generees par IA.
2. **Bannir les fausses coches de verification** (`badge-check` bleu a cote du nom) et les points lumineux clignotants (`animate-ping` / `animate-pulse` sur des badges decoratifs).
3. **Bannir les icones "magiques"** (`sparkles`, `wand`, `zap`, `rocket`) sur les boutons standards.
4. **Bannir l'empilement de cartes flottantes sur-arrondies** (`rounded-3xl` avec ombres diffuses `shadow-2xl` partout).
5. **Bannir lesanimations permanentes** sur les boutons d'action (pas de pulsation continue sur le CTA principal).

## 2. Direction Artistique : Precision Editoriale (Style Linear / Swiss Grid / Apple)

1. **Palette de surfaces neutres et contrastees** :
   - Mode clair : fond de page `#F7F7F5` ou `#F8FAFC` tres sobre, surfaces `#FFFFFF`, bordures fines `1px solid #E4E4E7` (`border-zinc-200`).
   - Mode sombre : fond `#09090B` (`bg-zinc-950`), surfaces `#121215` (`bg-zinc-900`), bordures `1px solid #27272A` (`border-zinc-800`).
2. **Couleurs d'accentuation minerales et sobres** :
   - Privilegier le Noir Encre (`#18181B`), Vert Foret (`#065F46`), Bleu Cobalt (`#1E3A8A`), Terre de Sienne / Bronze (`#78350F`), Bordeaux (`#881337`).
   - Utiliser des aplats francs ou de subtils degradés monochromes, jamais d'effet neon.
3. **Typographie et rythme** :
   - Titres : `Plus Jakarta Sans` ou `Inter` avec `letter-spacing: -0.025em` (`tracking-tight`).
   - Donnees techniques (URLs courtes, slugs, compteurs de scans, numeros de telephone, tailles en octets) : police chasse fixe (`font-mono`) ou chiffres alignes (`tabular-nums`).
   - Labels de formulaire : sobres en `12px` (`text-xs font-medium text-zinc-600`), sans majuscules agressives partout.
4. **Geometrie et bordures** :
   - Rayons de courbure maitrises : `rounded-lg` (`8px`) pour les champs et boutons, `rounded-xl` (`12px`) ou `rounded-2xl` (`16px`) pour les conteneurs principaux.
   - Separations par filets (`divide-y divide-zinc-200/70`) plutot que par multiplication de boites imbriquees.

## 3. Composants et Micro-interactions

1. **Boutons** :
   - Hauteur constante (`h-10` ou `h-11`), bordure subtile d'un pixel, transition nette de 150ms sur la couleur de fond.
2. **Champs de saisie** :
   - Fond franc, bordure `zinc-300` (clair) / `zinc-700` (sombre), focus net par anneau fin (`focus:ring-1 focus:ring-zinc-900` ou couleur d'accent) sans halo flou surdimensionne.
3. **Apercu Mobile (Carte de visite)** :
   - Mise en page structurée comme une fiche editoriale : en-tete epure, photo cadree proprement, informations alignees avec rigueur, liste de coordonnees separee par des filets fins.

