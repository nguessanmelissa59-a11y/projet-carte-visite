# EVC — Charte graphique

Document de reference issu de l'analyse de la maquette « Refonte de la plateforme » (landing, formulaire de creation, apercu carte, parcours mobile).

**Intention** : une plateforme de cartes de visite digitales premium, chaleureuse et structuree — papier creme, vert foret, typographie serif editoriale. Pas de look corporate froid, pas de degradés violet/indigo.

---

## 1. Positionnement visuel

| Axe | Direction |
|---|---|
| Ton | Boutique / editorial premium, accessible |
| Atmosphere | Papier, lumiere douce, espace blanc genereux |
| Structure | Parcours numerote, sections claires, hierarchie forte |
| Contraste | Fonds clairs chauds + accents verts profonds |
| Interdit | Neon, glow, violet/indigo cliche, cards empilees flottantes, emojis UI |

---

## 2. Couleurs

Valeurs extraites / normalisees a partir de la maquette.

### 2.1 Surfaces

| Token | Hex | Usage |
|---|---|---|
| `--surface` | `#F5F0E6` | Fond de page (creme papier) |
| `--surface-warm` | `#F2ECE0` | Zones secondaires, bandes douces |
| `--surface-elevated` | `#FFFDF9` | Panneaux, champs, cartes blanches |
| `--surface-muted` | `#EDEDED` | Zones neutres (bandeaux collage, filets) |

### 2.2 Encre et texte

| Token | Hex | Usage |
|---|---|---|
| `--ink` | `#14201A` | Titres, texte principal (vert-charbon) |
| `--ink-strong` | `#171717` | Boutons secondaires sombres, nav |
| `--ink-muted` | `#5B616C` | Sous-titres, labels, hints |
| `--ink-on-accent` | `#FFFFFF` | Texte sur boutons / bandeaux verts |

### 2.3 Accent principal (marque)

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#0F5C3F` | CTA primaire, header carte, etapes actives |
| `--accent-hover` | `#0C4A33` | Survol bouton primaire |
| `--accent-soft` | `#D8F4E1` | Badges, puces d'etape, fonds status |
| `--accent-mid` | `#156044` | Variante moyenne (icones, focus) |

### 2.4 Accents secondaires (UI systeme)

| Token | Hex | Usage |
|---|---|---|
| `--info-warm` | `#FFEFD0` | Bannieres info / tips |
| `--info-warm-border` | `#FFE098` | Contour banniere |
| `--terracotta` | `#B66A2C` | Alerte douce, accent optionnel |
| `--line` | `rgba(20, 32, 26, 0.12)` | Bordures et separateurs |
| `--shadow-card` | `0 12px 40px rgba(20, 32, 26, 0.10)` | Ombre carte / panneau |

### 2.5 Themes de carte (swatches utilisateur)

Couleurs d'en-tete de carte proposees dans la maquette :

| Nom | Hex | Role |
|---|---|---|
| Forest | `#0F5C3F` | Defaut marque |
| Navy | `#1E3A5F` | Professionnel froid |
| Terracotta | `#9C542F` | Chaleureux |
| Bordeaux | `#763221` | Premium sombre |
| Charcoal | `#2A2D34` | Neutre / Obsidian |

> En code actuel, les themes vivent sous `html[data-card-theme='…']` dans `assets/css/styles.css`. Lors de l'alignement maquette, prioriser **Forest `#0F5C3F`** comme accent produit (au lieu du gris encre actuel).

### 2.6 Regles d'usage couleur

1. Un seul accent fort par ecran (vert foret pour les CTA).
2. Le creme `#F5F0E6` reste le fond global ; le blanc `#FFFDF9` est reserve aux surfaces interactives.
3. Jamais de texte `#FFFFFF` sur fond creme (contraste insuffisant).
4. Les themes de carte colorent **l'en-tete de la carte** et l'accent local, pas tout le chrome de l'app.
5. Mode sombre : hors perimetre de cette maquette ; conserver le mapping existant si active, sans l'imposer a la landing.

---

## 3. Typographie

### 3.1 Familles (deja chargees dans le projet)

| Role | Famille | Fallback | Usage |
|---|---|---|---|
| Display | **Fraunces** | Georgia, serif | Titres hero, titres de section |
| Body / UI | **Figtree** | system-ui, sans-serif | Labels, boutons, corps, navigation |
| Mono | **IBM Plex Mono** | ui-monospace | Slugs, URLs courtes, donnees techniques |

### 3.2 Hierarchie

| Niveau | Police | Poids | Taille indicative | Tracking | Couleur |
|---|---|---|---|---|---|
| Hero H1 | Fraunces | 600–700 | `clamp(2rem, 4vw, 3.25rem)` | `-0.02em` | `--ink` |
| Section H2 | Fraunces | 600 | `clamp(1.5rem, 2.5vw, 2rem)` | `-0.015em` | `--ink` |
| Sous-titre | Figtree | 400–500 | `1–1.125rem` | `0` | `--ink-muted` |
| Label champ | Figtree | 500 | `0.8125–0.875rem` | `0.01em` | `--ink-muted` |
| Corps | Figtree | 400 | `1rem` (16 px min mobile) | `0` | `--ink` |
| Bouton | Figtree | 600 | `0.9375–1rem` | `0` | selon variante |
| Meta / step | Figtree | 500 | `0.75–0.875rem` | `0.02em` | `--ink-muted` |
| Numero section (`01`) | Figtree ou Mono | 500 | `0.75rem` | `0.06em` | `--accent` |

### 3.3 Style textuel (ton editorial)

- Titres : phrases courtes, affirmation claire (« Votre carte, prete a partager. »).
- Sous-titres : une phrase utile, sans jargon marketing.
- Sections formulaire : questions directes (« Qui etes-vous ? », « Comment vous joindre ? »).
- Pas de TOUT-EN-CAPITALES agressif sur les titres ; les labels restent sentence case.
- Numeros de section (`01` … `04`) en prefixe discret, pas en gros badges flottants.

---

## 4. Mise en page et rythme

### 4.1 Grille

- Conteneur principal : `width: 100%` ; `max-width: 72rem` ; padding horizontal `1–1.5rem`.
- Desktop creation : **deux colonnes** — formulaire a gauche, apercu carte a droite.
- Mobile : **une colonne** ; apercu sous le formulaire ou en sticky leger selon contexte.
- Sections du formulaire empilees verticalement avec numerotation.

### 4.2 Espacements

| Token | Valeur | Usage |
|---|---|---|
| `--space-1` | `0.25rem` | Micro |
| `--space-2` | `0.5rem` | Inter-elements serres |
| `--space-3` | `0.75rem` | Label → champ |
| `--space-4` | `1rem` | Gap champs |
| `--space-6` | `1.5rem` | Entre blocs |
| `--space-8` | `2rem` | Entre sections |
| `--space-12` | `3rem` | Respiration hero / page |

### 4.3 Breakpoints (mobile-first)

| Seuil | Usage |
|---|---|---|
| `< 576px` | Mobile (stack, CTA pleine largeur) |
| `≥ 768px` | Tablette |
| `≥ 992px` | Desktop 2 colonnes formulaire / apercu |
| `≥ 1200px` | Grand desktop, max-width atteint |

Verifier systematiquement **360 / 768 / 1024 / 1280**.

---

## 5. Composants

### 5.1 Boutons

| Variante | Fond | Texte | Forme | Usage |
|---|---|---|---|---|
| Primaire | `#0F5C3F` | blanc | pill (`border-radius: 999px`) | CTA principal |
| Secondaire sombre | `#171717` | blanc | pill ou `0.75rem` | « Se connecter » |
| Secondaire clair | transparent / `#FFFDF9` | `--ink` | bordure `--line` | Actions secondaires |
| Ghost | transparent | `--ink-muted` | — | Liens discrets |

- Hauteur cible : `44–48px` (tactile).
- Transition fond : `150ms ease`.
- Pas d'`animate-pulse` permanent sur le CTA.

### 5.2 Champs de formulaire

- Fond : `#FFFDF9`
- Bordure : `1px solid` `--line`
- Radius : `0.5–0.625rem` (`8–10px`)
- Label au-dessus, Figtree medium
- Focus : anneau fin `1–2px` `--accent` (`#0F5C3F`), pas de halo flou large
- Largeur : 100 % sur mobile ; grille 2 colonnes a partir de `768px` quand pertinent (Prenom / Nom)

### 5.3 Stepper (parcours)

1. Cercles numerotes relies par un filet.
2. Etape complete : fond `--accent-soft` ou coche verte sobre (icone outline, pas emoji).
3. Etape active : fond `--accent`, texte blanc.
4. Labels : « Vos infos », « Enregistrer », « Partager le QR ».

### 5.4 Carte de visite (apercu)

- Format de reference : **85 × 55 mm** (ratio ~1.545).
- Structure : bandeau superieur colore (initiales / logo) + corps clair (identite + contacts).
- Ombre : `--shadow-card` sur fond creme.
- Icones contact : **stroke fin**, monochrome, une seule librairie (pas d'emojis).
- Photo / logo : `max-width: 100%`, cadre net, pas de collage flottant.

### 5.5 Navigation

- Logo / wordmark « EVC » a gauche, sobre.
- Actions a droite : lien ou bouton secondaire (« Se connecter »).
- Sur mobile : meme hierarchie, actions wrap ou menu compact sans casser le hero.

### 5.6 Bannieres info

- Fond `--info-warm`, texte `--ink`, radius doux.
- Une seule idee par banniere ; pas de stickers flottants sur le hero.

---

## 6. Iconographie

- Style : **outline**, trait fin, coherents avec le set du projet.
- Couleur : `currentColor` ou `--ink` / `--accent`.
- Interdit : sparkles, fusées, robots, orbes degradés, emojis fonctionnels.
- Domaines : telephone, email, WhatsApp, LinkedIn, partage QR, upload photo.

---

## 7. Motion

Motions intentionnelles (2–3 max par ecran) :

1. Apparition douce du panneau / hero (`opacity` + leger `translateY`, 200–300 ms).
2. Transition de theme de carte (couleur header, 150–200 ms).
3. Feedback focus / hover boutons (couleur uniquement).

Pas d'animations continues decoratives.

---

## 8. Accessibilite et qualite

- Contraste texte / fond conforme AA (vert `#0F5C3F` sur blanc OK pour gros CTA ; verifier labels muted).
- Corps ≥ 16 px sur mobile.
- Cibles tactiles ≥ ~44 × 44 px.
- `prefers-reduced-motion` : desactiver les translations non essentielles.
- Viewport : `width=device-width, initial-scale=1`.

---

## 9. Mapping CSS recommande

Alignement cible avec les variables de `assets/css/styles.css` :

```css
:root {
  --surface: #f5f0e6;
  --surface-elevated: #fffdf9;
  --ink: #14201a;
  --ink-muted: #5b616c;
  --line: rgba(20, 32, 26, 0.12);
  --accent: #0f5c3f;
  --accent-soft: rgba(15, 92, 63, 0.12);
  --ambient-a: rgba(15, 92, 63, 0.06);
  --ambient-b: rgba(182, 106, 44, 0.05);
  --radius-panel: 0.625rem;
  --shadow-panel: 0 12px 40px rgba(20, 32, 26, 0.1);
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Figtree', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}
```

Theme carte defaut :

```css
html[data-card-theme='forest'] {
  --accent: #0f5c3f;
  --accent-soft: rgba(15, 92, 63, 0.12);
}
```

---

## 10. Criteres d'acceptation visuelle

Une ecran est conforme a la charte si :

1. Fond page = creme papier, pas gris froid `#f3f4f1` seul.
2. CTA primaire = vert foret pill, pas noir encre seul.
3. Titres = Fraunces ; UI = Figtree.
4. Formulaire structure en sections numerotees, labels au-dessus.
5. Apercu carte avec bandeau theme + ombre douce.
6. Responsive OK a 360 / 768 / 1024 / 1280, sans scroll horizontal.
7. Aucune icone / motif « IA generique ».

---

## 11. Source

- Maquette de reference : collage « EVC — Refonte de la plateforme » (landing, form desktop, themes, apercu 85×55, parcours mobile).
- Couleurs dominantees echantillonnees sur le fichier source (`#0F5C3F`, `#F5F0E6`, `#14201A`, `#D8F4E1`, `#FFEFD0`).
- Stack typographique projet : Fraunces + Figtree + IBM Plex Mono (`index.html`).
