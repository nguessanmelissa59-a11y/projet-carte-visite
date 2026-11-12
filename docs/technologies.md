# 🛠️ Technologies Utilisées — vCard Studio

Ce document présente l'ensemble de la stack technique, des librairies, des standards web et des APIs navigateur utilisés pour faire fonctionner **vCard Studio** sans aucune base de données (*Zero-Backend*).

---

## 1. Technologies Cœur (Frontend)

| Technologie | Version / Standard | Rôle dans le projet |
| :--- | :--- | :--- |
| **HTML5** | Standard W3C | Structure sémantique de l'éditeur, du formulaire et de la vue publique mobile. |
| **CSS3** | Standard W3C | Animations personnalisées (`@keyframes`), barres de défilement sur mesure et variables de style. |
| **Tailwind CSS** | v3.x (via CDN JIT) | Design system utilitaire, responsive design (*mobile-first*), thèmes de couleurs et **Mode Sombre** (`dark:` class strategy). |
| **JavaScript (Vanilla ES6+)** | ECMAScript 2022+ | Logique applicative complète : gestion d'état réactive, routage par paramètres d'URL (`?data=`), génération du fichier `.vcf` et rendu temps réel. |

---

## 2. Librairies Externes (CDN Légers)

### 📦 `qrcode.js` (`node-qrcode` v1.5.3)
* **Source :** `https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js`
* **Utilisation :**
  * Génère en temps réel le QR Code sur un élément `<canvas>` HTML5.
  * Ajuste automatiquement le niveau de correction d'erreur (`L` ou `M`) selon la taille des données encodées.
  * Permet l'export en **PNG Haute Définition (1024×1024 px)** via un canvas hors-écran (*offscreen canvas*).

### 🗜️ `lz-string` (v1.5.0)
* **Source :** `https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js`
* **Utilisation :**
  * Compresse l'objet JSON contenant les informations du profil directement dans une chaîne compatible URL (`compressToEncodedURIComponent`).
  * **Pourquoi c'est indispensable :** Réduit la taille de l'URL de **40 % à 60 %** par rapport à un encodage Base64 classique, ce qui garantit un QR Code beaucoup moins dense et scannable instantanément par tous les appareils photo mobiles.

### 🎨 `Lucide Icons`
* **Source :** `https://unpkg.com/lucide@latest`
* **Utilisation :**
  * Icônes vectorielles SVG modernes et légères pour les boutons d'action (Appel, Email, WhatsApp, LinkedIn, Portfolio, Téléchargement, Thème clair/sombre).

### 🔤 `Google Fonts` (`Plus Jakarta Sans` & `Inter`)
* **Source :** `https://fonts.googleapis.com`
* **Utilisation :**
  * **Plus Jakarta Sans :** Titres, noms de profil et boutons d'appel à l'action (*Hero CTA*).
  * **Inter :** Texte courant, champs de formulaire et métadonnées pour une lisibilité optimale sur mobile.

---

## 3. Standards & Protocoles Implémentés

### 📇 Norme **vCard 3.0 (RFC 2426)**
Le générateur produit dynamiquement un fichier `.vcf` encodé en **UTF-8** respectant strictement la norme **RFC 2426** pour une compatibilité universelle :
* **Séparateurs de lignes stricts :** Utilisation de `\r\n` (`CRLF`) à chaque fin de ligne.
* **Champs standards :** `N`, `FN`, `ORG`, `TITLE`, `TEL;TYPE=CELL,VOICE`, `EMAIL;TYPE=PREF,INTERNET`, `ADR`, `NOTE`, `PHOTO`.
* **Extensions Apple iOS (`X-ABLabel`) :** Utilisation des groupes `ITEM1.URL` / `ITEM1.X-ABLabel:LinkedIn` et `ITEM2.URL` / `ITEM2.X-ABLabel:Portfolio` pour que **Safari sur iPhone** affiche les libellés personnalisés dans l'application Contacts native tout en restant 100 % compatible avec **Android (Google Contacts / Samsung Contacts)**.

---

## 4. APIs Navigateur Natives (Web APIs)

* **HTML5 `<canvas>` API (`2D Context` & `FileReader`) :**
  * Redimensionne, recadre au centre en carré (`160×160 px`) et compresse en JPEG (`qualité 0.75`) toute photo importée par l'utilisateur côté client avant conversion en Base64.
* **URL & History API (`URLSearchParams`, `window.history.replaceState`) :**
  * Lit et décode le paramètre `?data=...` ou `#data=...` à l'ouverture de la page pour basculer automatiquement entre le **Mode Éditeur** et la **Vue Publique (Scan)** sans serveur backend.
* **Blob & Data URI API (`Blob`, `URL.createObjectURL`) :**
  * Génère le fichier `.vcf` en mémoire avec le type MIME `text/vcard;charset=utf-8` (et `data:text/vcard;charset=utf-8,...` sur iOS Safari pour ouvrir directement la fiche native *"Ajouter aux contacts"*).
* **Web Share API (`navigator.share`) :**
  * Ouvre le menu de partage natif d'iOS et d'Android depuis la page de profil publique.
* **Clipboard API (`navigator.clipboard.writeText`) :**
  * Copie en un clic le lien unique du profil avec retour visuel (*Toast notification*).
* **Web Storage API (`localStorage`) :**
  * Sauvegarde automatiquement le brouillon de la carte et la préférence de thème (Clair / Sombre) sur l'appareil de l'utilisateur.

---

## 5. Hébergement & Déploiement (100 % Statique)

L'application ne nécessitant ni serveur Node.js, ni PHP, ni base de données SQL/NoSQL, elle peut être hébergée gratuitement sur n'importe quel CDN statique :
* **Vercel**
* **Netlify**
* **GitHub Pages**
* **Cloudflare Pages**

