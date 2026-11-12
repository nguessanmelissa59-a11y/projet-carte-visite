# EVC — Charte graphique

Source officielle : [`EVC-Refonte-maquettes.pdf`](./EVC-Refonte-maquettes.pdf) (5 ecrans).  
Previews rendues : `docs/maquette-pages/page-01.png` … `page-05.png`.

**Intention** : plateforme de cartes de visite digitales premium, chaleureuse et structuree — papier creme, vert foret, typographie serif editoriale. Pas de look corporate froid, pas de degrades violet/indigo.

---

## 1. Inventaire des ecrans (maquette)

| Page | Format | Ecran | Contenu cle |
|---|---|---|---|
| 01 | Desktop A4 | Creation + apercu | Nav, hero, stepper 1–3, formulaire sections 1–4, apercu mobile live |
| 02 | Mobile | Fiche publique | Header theme raye, avatar initiales, CTA contacts, liste coords, footer EVC |
| 03 | Print | Recto / verso 85×55 mm | Identite + contacts ; verso QR + URL `evc.app/c/…` ; fond perdu 3 mm, marge 4 mm |
| 04 | Mobile | Formulaire etape 1/3 | Hero compact, qui etes-vous, joindre, couleur, CTA enregistrer |
| 05 | Desktop | Partage etape 3/3 | QR court, lien, actions export (QR, PDF, vcf, WhatsApp), perso QR, banner compte |

Parcours produit : **Vos infos → Enregistrer → Partager le QR**.

---

## 2. Positionnement visuel

| Axe | Direction |
|---|---|
| Ton | Boutique / editorial premium, accessible |
| Atmosphere | Papier, lumiere douce, espace genereux |
| Structure | Parcours numerote, sections claires, hierarchie forte |
| Contraste | Fonds creme chauds + accent vert profond |
| Interdit | Neon, glow, violet/indigo cliche, cards empilees flottantes, emojis UI |

---

## 3. Couleurs

Valeurs echantillonnees sur les pages PDF (`#0C543C`, `#F0F0E4`, `#FCFCF0`, peches `#FCE4D8`).

### 3.1 Surfaces

| Token | Hex | Usage |
|---|---|---|
| `--surface` | `#F3EFE4` | Fond de page (creme papier) |
| `--surface-warm` | `#F0E8D8` | Zones secondaires |
| `--surface-elevated` | `#FCFCF8` | Panneaux blancs, champs |
| `--surface-panel` | `#FFFFFF` | Cartes / conteneurs principaux |

### 3.2 Encre

| Token | Hex | Usage |
|---|---|---|
| `--ink` | `#0C1818` | Titres, texte principal |
| `--ink-strong` | `#171717` | Bouton « Se connecter » |
| `--ink-muted` | `#5B616C` | Labels, hints, meta |
| `--ink-on-accent` | `#FFFFFF` | Texte sur vert / noir |

### 3.3 Accent marque

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#0C543C` | CTA, logo mark, steps actifs, header carte |
| `--accent-mid` | `#186048` | Motif rayures header, hover leger |
| `--accent-deep` | `#005430` | Survol CTA / etat presse |
| `--accent-soft` | `#E6F0EB` | Steps termines, badge entreprise |

### 3.4 Accents systeme

| Token | Hex | Usage |
|---|---|---|
| `--beta` / info warm | `#FCE4D8` | Badge « Beta », bannieres conseil |
| `--line` | `rgba(12, 24, 24, 0.12)` | Bordures, separateurs fiche |
| `--shadow-panel` | `0 12px 40px rgba(12, 24, 24, 0.08)` | Ombre panneaux / apercu |

### 3.5 Themes de carte (swatches page 01)

Pastilles dans « Couleur de la carte » (ordre maquette) :

| Ordre | Orientation | Hex cible |
|---|---|---|
| 1 | Forest (defaut) | `#0C543C` |
| 2 | Orange | `#C45A1A` |
| 3 | Obsidian | `#2A2D34` |
| 4 | Cobalt | `#2F5B8A` |
| 5 | Bronze / terre | `#9C542F` |
| 6 | Bordeaux | `#763221` |
| 7 | Teal | `#1F6B5C` |

> Les themes colorent surtout le **bandeau de la fiche** (et l’accent local), pas tout le chrome de l’app.

### 3.6 Regles

1. Un seul accent fort par ecran (vert pour les CTA produit).
2. Creme = fond global ; blanc = surfaces interactives.
3. Badge Beta / bannieres = peche `#FCE4D8`, jamais rouge alerte agressif.
4. Texte blanc uniquement sur accent ou encre forte.
5. Mode sombre : toggle present en nav maquette ; hors detail de ce PDF — ne pas inventer la palette sombre sans spec.

---

## 4. Typographie

### 4.1 Familles (projet)

| Role | Famille | Fallback | Usage |
|---|---|---|---|
| Display | **Fraunces** | Georgia, serif | Hero, titres de section, nom sur fiche |
| Body / UI | **Figtree** | system-ui, sans-serif | Labels, boutons, nav, corps |
| Mono | **IBM Plex Mono** | ui-monospace | URLs, slugs |

Logo wordmark « EVC » : sans gras dans un carre accent + texte adjacent.

### 4.2 Hierarchie

| Niveau | Police | Poids | Taille | Notes |
|---|---|---|---|---|
| Hero H1 | Fraunces | 600–700 | `clamp(2rem, 4vw, 3.25rem)` | tracking serre |
| Section H2 | Fraunces | 600 | `clamp(1.35rem, 2.2vw, 1.75rem)` | « Qui etes-vous ? » |
| Nom fiche | Fraunces | 600–700 | ~1.5–1.75rem | page 02 |
| Eyebrow | Figtree | 500–600 | 0.75rem | `ÉTAPE X SUR 3`, `CARTE NUMÉRIQUE`, `VOTRE LIEN` — small caps / uppercase leger |
| Label | Figtree | 500 | 0.8125–0.875rem | au-dessus des champs |
| Corps | Figtree | 400 | ≥ 16 px mobile | |
| Bouton | Figtree | 600 | 0.9375–1rem | |
| Meta liste fiche | Figtree | 500 | 0.7–0.75rem | `TÉLÉPHONE`, `E-MAIL` uppercase + tracking |

### 4.3 Ton editorial (textes maquette)

- Hero : « Votre carte, prete a partager. »
- Sous-titre : « Renseignez vos infos, enregistrez, puis partagez le QR. Trois minutes suffisent. »
- Sections : questions (« Qui etes-vous ? », « Comment vous joindre ? »).
- CTA : verbe + objet (« Enregistrer ma carte », « Copier mon lien », « Enregistrer dans les contacts »).
- Sentence case partout sauf eyebrows / labels techniques uppercase.

---

## 5. Layout et rythme

### 5.1 Structure

- **Desktop creation (p01)** : header sticky ; hero + stepper ; **2 colonnes** — formulaire (gauche) / apercu mobile (droite).
- **Desktop partage (p05)** : panneau blanc ; **2 colonnes** — QR | actions lien + exports.
- **Mobile form (p04)** : 1 colonne, sections empilees, CTA bas de flux.
- **Fiche publique (p02)** : colonne unique type telephone.
- Conteneur : `max-width: 72rem`, padding horizontal `1–1.5rem`.

### 5.2 Espacements

| Token | Valeur |
|---|---|
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-6` | `1.5rem` |
| `--space-8` | `2rem` |
| `--space-12` | `3rem` |

### 5.3 Breakpoints

| Seuil | Usage |
|---|---|
| `< 576px` | Mobile (stack) |
| `≥ 768px` | Tablette / grilles 2 champs |
| `≥ 992px` | Desktop 2 colonnes form + apercu |
| `≥ 1200px` | Grand desktop |

Controle obligatoire : **360 / 768 / 1024 / 1280**.

---

## 6. Composants

### 6.1 Navigation

- Gauche : mark carre vert + « EVC » + badge **Beta** peche.
- Droite : « Apercu » (outline), toggle theme, « Se connecter » (pill noir).
- Page partage : « Voir ma carte » outline + « Se connecter ».

### 6.2 Boutons

| Variante | Style | Exemples |
|---|---|---|
| Primaire | Fond `#0C543C`, texte blanc, radius eleve (pill ou ~12–999px) | Enregistrer ma carte, Copier mon lien |
| Secondaire sombre | Fond `#171717`, texte blanc, pill | Se connecter |
| Outline | Bordure fine, fond clair | Apercu, Choisir une photo, Voir ma carte |
| Tile action | Carre arrondi + icone + label | Telecharger QR, PDF, vcf, WhatsApp |

Hauteur tactile ≥ 44 px. Transition couleur ~150 ms. Pas de pulse permanent.

### 6.3 Formulaire

- Sections numerotees **1–4** (identite, contact, liens, couleur).
- Champs : fond elevé, border `--line`, radius ~8–10 px, label au-dessus.
- Photo : avatar initiales + bouton outline « Choisir une photo » (JPG/PNG, carre).
- Focus : anneau fin accent, pas de halo flou.
- Banniere peche sous le stepper : invitation a se connecter.

### 6.4 Stepper

1. Actif : pastille `#0C543C` + numero blanc.
2. Termine : pastille `#E6F0EB` + coche outline.
3. Inactif : cercle bordure grise.
4. Labels : Vos infos / Enregistrer / Partager le QR.
5. Eyebrow mobile : `ÉTAPE 1 SUR 3`, `ÉTAPE 3 SUR 3`.

### 6.5 Apercu / fiche publique

- Header theme plein + **rayures diagonales** legerement plus claires.
- Avatar coins arrondis (initiales) a cheval header / corps.
- Badge entreprise pill soft green.
- Nom serif ; poste / ville muted ; bio courte.
- CTA pleine largeur « Enregistrer dans les contacts ».
- Grille 3 actions outline : Appeler / E-mail / WhatsApp.
- Liste contacts separee par filets ; labels uppercase.
- Footer : « Carte creee avec EVC » (EVC en accent serif).

### 6.6 Carte imprimee 85×55 mm (p03)

- Recto : bandeau theme + identite + contacts.
- Verso : message scan + QR + URL courte.
- Export : fond perdu **3 mm**, marges de securite **4 mm**.

### 6.7 Ecran partage (p05)

- QR dans cadre clair, mention « QR court · lien raccourci ».
- Champ lien + CTA copier.
- Grille 2×2 exports + « Personnaliser le QR ».
- Banniere peche : connexion pour garder le lien actif.

---

## 7. Iconographie

- Outline, trait fin, `currentColor`.
- Une seule librairie coherente (pas d’emojis fonctionnels).
- Usages : telephone, email, chat, user-plus, download, print, link, chevron, share.
- Interdit : sparkles, fusees, robots, orbes degradees.

---

## 8. Motion

1. Mise a jour live de l’apercu a la saisie (instantanee, sans animation lourde).
2. Fade / leger slide des panneaux (200–300 ms).
3. Hover / focus boutons (couleur uniquement).

Respecter `prefers-reduced-motion`.

---

## 9. Accessibilite

- Corps ≥ 16 px mobile ; cibles ≥ ~44×44 px.
- Contraste AA sur CTA vert / texte encre.
- Viewport meta present.
- Pas d’action critique uniquement au `:hover`.

---

## 10. Mapping CSS cible

```css
:root {
  --surface: #f6f0e2;
  --surface-elevated: #fffdf7;
  --ink: #0a1714;
  --ink-muted: #4f5a55;
  --line: rgba(10, 23, 20, 0.14);
  --accent: #0a6b45;
  --accent-soft: rgba(10, 107, 69, 0.16);
  --ambient-a: rgba(10, 107, 69, 0.1);
  --ambient-b: rgba(255, 215, 194, 0.55);
  --radius-panel: 1rem;
  --shadow-panel: 0 12px 40px rgba(10, 23, 20, 0.1);
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'Figtree', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}

html[data-card-theme='forest'] {
  --accent: #0a6b45;
  --accent-soft: rgba(10, 107, 69, 0.16);
}
```

---

## 11. Criteres d’acceptation

1. Fond page = creme papier (pas gris froid seul).
2. CTA primaire = vert `#0C543C`.
3. Titres = Fraunces ; UI = Figtree.
4. Formulaire en sections numerotees ; labels au-dessus.
5. Fiche : bandeau raye + avatar + CTA contacts + liste filetee.
6. Partage : QR + lien + exports + banner compte.
7. Print : 85×55, fond perdu 3 mm / marge 4 mm.
8. Responsive OK a 360 / 768 / 1024 / 1280, sans scroll horizontal.
9. Aucune icone « IA generique ».

---

## 12. Ecarts vs code (applique)

| Sujet | Avant | Apres (maquette) |
|---|---|---|
| `--surface` | `#f3f4f1` | `#f3efe4` |
| `--accent` defaut | `#12141a` | `#0c543c` |
| Theme forest | `#5a7d6c` | `#0c543c` |
| Header fiche | uni | rayures diagonales |
| Badge Beta / banners | absent / neutre | peche `#FCE4D8` |

---

## 13. Sources

- PDF : `docs/EVC-Refonte-maquettes.pdf`
- Rendu pages : `docs/maquette-pages/`
- Fonts chargees : `index.html` (Fraunces, Figtree, IBM Plex Mono)
- Tokens live : `assets/css/styles.css`
