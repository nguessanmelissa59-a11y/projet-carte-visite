---
name: domain-and-data-modeling
description: >-
  Expertise methodologique en modelisation logicielle, metier et donnees.
  Couvre Merise (MCD, MLD, MPD), Domain-Driven Design (DDD : Aggregats, Entites,
  Value Objects), UML (classes, etats, sequences), normalisation relationnelle
  (1NF a BCNF), modeles SQL/SQLite/PostgreSQL, NoSQL et flux d'evenements. A utiliser
  pour concevoir une nouvelle fonctionnalite, structurer une base de donnees,
  refactoriser un schema, valider l'integrite referentielle ou formaliser un domaine.
---

# Expert en Modelisation Logicielle & Donnees

Ce skill fournit un cadre methodologique rigoureux pour modeliser les systemes d'information, les domaines metier et les bases de donnees, de la phase conceptuelle a l'implementation physique.

---

## 1. Quand activer ce skill

Activer ce skill des lors qu'une tâche implique :
* La creation, refonte ou extension d'une table, entite, schema ou base de donnees (SQLite, PostgreSQL, MySQL, etc.).
* La formalisation d'un domaine complexe (DDD, entites, agregats, objets-valeurs, invariants).
* L'arbitrage d'architecture de persistance (relationnel normalise vs denormalisation vs document NoSQL).
* La conception de diagrammes techniques (Merise E/R, diagrammes de classes UML, machines a etats, diagrammes de sequence).
* La resolution d'anomalies de redondance, d'incoherence de donnees ou de performances de requêtes dues au schema.
* La mise en place de migrations de schema ou de gestion du cycle de vie des enregistrements (audit, soft delete, versionnement).

---

## 2. Protocole de modelisation (5 etapes)

Toute modelisation doit suivre l'ordre logique suivant pour eviter de calquer prematurement le schema sur un cas d'usage IHM passager :

```text
[Phase 1 : Vocabulaire & Regles Metier]
                   ↓
[Phase 2 : Modele Conceptuel (MCD / DDD / Invariants)]
                   ↓
[Phase 3 : Modele Logique & Normalisation (MLD / 3NF)]
                   ↓
[Phase 4 : Modele Physique & Contraintes SGBD (MPD / DDL)]
                   ↓
[Phase 5 : Indexation, Performance & Plan de Migration]
```

### Phase 1 : Extraction du vocabulaire et invariants metier
1. Dresser le lexique unifie (*Ubiquitous Language*) : definir chaque terme sans ambiguïte.
2. Lister les regles d'invariance absolues (ex: *"Une carte de visite appartient a un utilisateur unique"*, *"Le slug doit être immuable une fois publie"*).
3. Etablir la liste des evenements et operations declencheuses du cycle de vie.

### Phase 2 : Modelisation Conceptuelle
1. Identifier les **Entites** (possedant une identite perenne dans le temps) et les **Value Objects** (caracterises uniquement par leurs attributs et immuables).
2. Definir les frontieres d'**Agregats** et l'entite racine (*Aggregate Root*) garante de la coherence transactionnelle.
3. Poser les cardinalites conceptuelles : (0,1), (1,1), (0,N), (1,N).

### Phase 3 : Modelisation Logique & Normalisation
1. Traduire les associations conceptuelles :
   * Association (1,N) $\rightarrow$ cle etrangere cote N.
   * Association (N,N) $\rightarrow$ table de jointure avec cle primaire composite.
   * Association (1,1) $\rightarrow$ cle etrangere avec contrainte UNIQUE ou fusion logique.
2. Appliquer les formes normales systematiquement jusqu'a la **3NF** minimum (1NF : atomicite, 2NF : dependance complete a la cle, 3NF : absence de dependance transitive).
3. Ne denormaliser qu'avec justification explicite de volumetrie ou de chemin de lecture critique (voir [reference.md](reference.md)).

### Phase 4 : Implementation Physique (MPD & DDL)
1. Choisir les types de donnees les plus stricts possibles (ex: `TEXT` format ISO pour dates, types numeriques exacts, booleens stricts).
2. Activer et verifier les contraintes natives : `NOT NULL`, `DEFAULT`, `CHECK (...)`, `UNIQUE`.
3. Configurer les cles etrangeres avec clause de maintien de l'integrite referentielle explicite : `ON DELETE RESTRICT` par defaut, `ON DELETE CASCADE` uniquement pour les sous-entites composantes de l'agregat.

### Phase 5 : Verification et Indexation
1. Indexer chaque cle etrangere et chaque colonne de recherche frequente / filtrage / tri.
2. Eviter la sur-indexation : chaque index a un coût d'ecriture et de stockage.
3. Valider le plan de migration et la retro-compatibilite des donnees existantes.

---

## 3. Matrice de decision de persistance

| Critere | Relationnel (SQL strict) | Document JSON embarque | Table de jonction N:N | Evenements / Append-only |
|---|---|---|---|---|
| **Structure** | Schema rigide, structures stables | Donnees polymorphes ou dynamiques | Relations plusieurs-a-plusieurs | Historique d'actions chronologiques |
| **Integrite** | Forte, verifiee par le moteur (FK, CHECK) | Verifiee par le code applicatif | Forte, cles composites | Immuable, ecriture seule |
| **Requêtage** | Jointures, agrégats, tris composes | Lecture par document complet | Filtrages croises complexes | Rejeu, audit, projection |
| **Cas type** | Utilisateurs, cartes, factures, droits | Metadonnees ouvertes, configs IHM | Tags, categories, roles | Logs de scan, historiques de version |

---

## 4. Regles d'or du modelisateur

1. **L'integrite appartient a la base de donnees** : Ne jamais compter exclusivement sur la validation frontend ou backend pour garantir l'unicite, la validite des types ou les liaisons orphelines.
2. **Expliciter le temps** : Toute entite metier persistee doit comporter `created_at` et `updated_at` (format ISO-8601 UTC).
3. **Cles primaires techniques vs cles metier** :
   * Utiliser une cle technique interne pour les jointures (ex: `INTEGER PRIMARY KEY AUTOINCREMENT`, `UUIDv7`, `ULID`).
   * Placer une contrainte `UNIQUE` sur la cle metier naturelle ou le slug public (ex: `slug TEXT UNIQUE`).
4. **Pas de magie 'NULL' silencieuse** : Privilegier `NOT NULL` avec une valeur par defaut pertinente, ou documenter explicitement ce que signifie la presence d'un `NULL` (valeur inconnue vs non-applicable).
5. **Separation Modèle Metier vs DTO d'API vs Table BD** : Ne pas exposer directement le modele de donnees physique dans les interfaces externes sans passerelle de transformation.

---

## 5. Normes de nommage

| Element | Convention | Exemple |
|---|---|---|
| **Tables relationnelles** | Nom commun, pluriel (ou singulier homogene), `snake_case` | `cards`, `card_tags`, `users` |
| **Colonnes primaires** | `id` ou `<entite>_id` | `id`, `card_id` |
| **Cles etrangeres** | `<entite_cible_singulier>_id` ou `<entite_cible_slug>` | `user_id`, `card_slug` |
| **Booleens** | Prefixe verbe (`is_`, `has_`, `can_`) ou adjectif clair | `is_active`, `auto_download` |
| **Horodatages** | Suffixe `_at` ou `_date` | `created_at`, `expires_at` |
| **Compteurs & Metriques** | Suffixe descriptif au pluriel ou `_count` | `scans`, `view_count` |
| **Index** | `idx_<table>_<colonnes>` | `idx_cards_slug`, `idx_cards_user_updated` |
| **Contraintes** | `chk_<table>_<regle>`, `uq_<table>_<col>` | `chk_cards_phone_format`, `uq_cards_slug` |

---

## 6. Anti-patterns a bannir

* **La table 'Fourre-Tout' (God Table)** : Une table unique contenant 60 colonnes dont la moitie est `NULL` selon le type d'usage. $\rightarrow$ Eclater selon les agregats metier.
* **Le 'JSON dumping' abusif** : Stocker un objet complet en JSON texte pour eviter de modeliser les colonnes, rendant le filtrage et les contraintes impossibles.
* **Suppression physique d'historique critique** : Supprimer directement des enregistrements financiers, de facturation ou d'audit sans historique ni marquage temporel.
* **Cles etrangeres desactivees** : Oublier d'activer `PRAGMA foreign_keys = ON;` dans SQLite ou laisser des relations sans contrainte SGBD.
* **IDs previsibles exposes sans verification d'acces** : Exposer des identifiants incrementaux `id=1, 2, 3` dans les URL publiques permettant l'enumeration directe (utiliser des slugs aleatoires ou UUID).

---

## 7. Fichier compagnon de reference

Consulter **[reference.md](reference.md)** pour :
* La syntaxe des diagrammes Mermaid (ERD, Classes, Etats).
* Les formulaires complets de normalisation (1NF, 2NF, 3NF, BCNF) illustres.
* Les modeles DDL SQL types (SQLite et PostgreSQL) avec indexation et triggers.
* Les patrons DDD (Agregats, Objets-Valeurs, Repositories).

