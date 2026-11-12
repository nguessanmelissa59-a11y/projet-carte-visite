# Technologies Utilisées — vCard Studio

Ce document présente la stack technique, les librairies, les standards web et les APIs navigateur utilisés pour faire fonctionner **vCard Studio** sans base de données (*Zero-Backend*).

---

## 1. Technologies Cœur (Frontend)

| Technologie | Version / Standard | Rôle dans le projet |
| :--- | :--- | :--- |
| **HTML5** | Standard W3C | Structure sémantique de l'éditeur, du formulaire et de la vue publique mobile. |
| **CSS3** | Standard W3C | Animations personnalisées (`@keyframes`), barres de défilement sur mesure et variables de style. |
| **Tailwind CSS** | v3.x (via CDN JIT) | Design system utilitaire, responsive design (*mobile-first*), thèmes de couleurs et mode sombre (`dark:`). |
| **JavaScript (ES6+)** | ECMAScript 2022+ | Logique applicative complète : gestion d'état, routage par paramètres d'URL (`?data=`), génération du fichier `.vcf` et rendu temps réel. |

---

## 2. Librairies Externes (CDN)

### `qrcode.js` (`node-qrcode` v1.5.3)
* **Source :** `https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js`
* **Utilisation :**
  * Génère en temps réel le QR Code sur un élément `<canvas>` HTML5.
  * Ajuste automatiquement le niveau de correction d'erreur (`L` ou `M`) selon la taille des données encodées.
  * Permet l'export en **PNG Haute Définition (1024×1024 px)** via un canvas hors-écran.

### `lz-string` (v1.5.0)
* **Source :** `https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js`
* **Utilisation :**
  * Compresse l'objet JSON contenant les informations du profil dans une chaîne compatible URL (`compressToEncodedURIComponent`).
  * Réduit la taille de l'URL de 40 % à 60 % par rapport à un encodage Base64 classique, ce qui garantit un QR Code moins dense et scannable rapidement.

### `Lucide Icons`
* **Source :** `https://unpkg.com/lucide@latest`
* **Utilisation :**
  * Icônes vectorielles SVG pour l'interface utilisateur (Appel, Email, WhatsApp, LinkedIn, Portfolio, Téléchargement).

### `Google Fonts` (`Plus Jakarta Sans` & `Inter`)
* **Source :** `https://fonts.googleapis.com`
* **Utilisation :**
  * **Plus Jakarta Sans :** Titres, noms de profil et boutons d'action principaux.
  * **Inter :** Texte courant, champs de formulaire et métadonnées.

---

## 3. Standards & Protocoles Implémentés

### Norme vCard 3.0 (RFC 2426)
Le générateur produit dynamiquement un fichier `.vcf` encodé en **UTF-8** respectant la norme **RFC 2426** :
* **Séparateurs de lignes :** Utilisation de `\r\n` (`CRLF`) à chaque fin de ligne.
* **Champs standards :** `N`, `FN`, `ORG`, `TITLE`, `TEL;TYPE=CELL,VOICE`, `EMAIL;TYPE=PREF,INTERNET`, `ADR`, `NOTE`, `PHOTO`.
* **Extensions Apple iOS (`X-ABLabel`) :** Utilisation des groupes `ITEM1.URL` / `ITEM1.X-ABLabel:LinkedIn` et `ITEM2.URL` / `ITEM2.X-ABLabel:Portfolio` pour que Safari sur iPhone affiche les libellés personnalisés dans l'application Contacts tout en restant compatible avec Android.

---

## 4. APIs Navigateur Natives (Web APIs)

* **HTML5 `<canvas>` API (`2D Context` & `FileReader`) :**
  * Redimensionne, recadre au centre en carré (`160×160 px`) et compresse en JPEG (`qualité 0.75`) toute photo importée côté client avant conversion en Base64.
* **URL & History API (`URLSearchParams`, `window.history.replaceState`) :**
  * Lit et décode le paramètre `?data=...` ou `#data=...` à l'ouverture de la page pour basculer automatiquement entre le mode éditeur et la vue publique.
* **Blob & Data URI API (`Blob`, `URL.createObjectURL`) :**
  * Génère le fichier `.vcf` en mémoire avec le type MIME `text/vcard;charset=utf-8`.
* **Web Share API (`navigator.share`) :**
  * Ouvre le menu de partage natif d'iOS et d'Android depuis la page de profil publique.
* **Clipboard API (`navigator.clipboard.writeText`) :**
  * Copie le lien du profil dans le presse-papiers.
* **Web Storage API (`localStorage`) :**
  * Sauvegarde le brouillon de la carte et la préférence de thème sur l'appareil.

---

## 5. Hébergement Statique

L'application ne nécessite ni serveur backend ni base de données et peut être déployée sur :
* GitHub Pages
* Vercel
* Netlify
* Cloudflare Pages
