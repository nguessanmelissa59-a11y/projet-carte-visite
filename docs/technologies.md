# Technologies Utilisées — vCard Studio

Ce document présente la stack technique Frontend et Backend, les librairies, les standards web et les APIs utilisés dans **vCard Studio**.

---

## 1. Stack Backend (Node.js & SQLite)

Le backend garantit des **URLs courtes** (`/c/:slug`) pour des QR Codes peu denses, **modifiables après impression**, avec suivi du nombre de scans et génération serveur du fichier `.vcf`.

| Technologie | Version / Module | Rôle dans le projet |
| :--- | :--- | :--- |
| **Node.js** | v22.5+ / v24 (`node:http`) | Serveur HTTP léger servant l'API REST, les redirections courtes (`/c/:slug`, `/v/:slug`) et les fichiers statiques. |
| **SQLite natif** | `node:sqlite` (`DatabaseSync`) | Base de données embarquée (`backend/data/cards.sqlite`) stockant les profils, les photos compressées et le compteur de scans sans dépendance externe. |
| **Détection IP LAN** | `node:os` (`networkInterfaces`) | Détecte automatiquement l'adresse IP locale Wi-Fi du poste pour que les QR Codes générés sur `localhost` soient immédiatement scannables par un téléphone sur le même réseau. |

### Routes principales du serveur (`backend/server.js`)
* `GET /c/:slug` : Route courte encodée dans le QR Code. Incrémente le compteur de scans dans SQLite et affiche la page de profil.
* `GET /v/:slug` et `GET /api/cards/:slug/vcf` : Génère et sert le fichier `.vcf` avec l'en-tête HTTP `Content-Type: text/vcard; charset=utf-8` pour déclencher l'ouverture directe de l'application Contacts sur iOS (Safari) et Android.
* `GET /api/cards/:slug` & `POST /api/cards` : Lecture et sauvegarde en temps réel des fiches.

---

## 2. Stack Frontend

| Technologie | Standard | Rôle dans le projet |
| :--- | :--- | :--- |
| **HTML5 & CSS3** | Standard W3C | Structure sémantique et contrôles de formulaire sobres. |
| **Tailwind CSS** | v3.x (CDN) | Grille éditoriale, typographie (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`) et mode clair/sombre. |
| **JavaScript (ES6+)** | Architecture modulaire (`src/`) | Découpage strict entre configuration (`src/config`), services (`src/services`) et rendu (`src/ui`). |
| **`qrcode.js`** | v1.5.3 | Génération du QR Code sur `<canvas>` et export PNG haute résolution (`1024×1024 px`). |
| **`lz-string`** | v1.5.0 | Compression d'URL en mode de repli statique (`?data=...`) lorsque l'application est ouverte sans serveur Node. |

---

## 3. Norme vCard 3.0 (RFC 2426)

* **Séparateurs de lignes :** `\r\n` (`CRLF`) obligatoire selon la norme RFC 2426.
* **Champs standards :** `N`, `FN`, `ORG`, `TITLE`, `TEL;TYPE=CELL,VOICE`, `EMAIL;TYPE=PREF,INTERNET`, `ADR`, `NOTE`, `PHOTO`.
* **Compatibilité iOS (`X-ABLabel`) :** Groupes `ITEM1.URL` / `ITEM1.X-ABLabel:LinkedIn` et `ITEM2.URL` / `ITEM2.X-ABLabel:Portfolio` pour afficher les libellés exacts dans Contacts sur iPhone et Android.
