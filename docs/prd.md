# PRD — Générateur de Carte de Visite Numérique Interactive (vCard & QR Code)

## 1. Vision & Objectif du Produit
Concevoir une application web moderne, **mobile-first**, **Zero-Backend** (sans base de données) et prête pour la production permettant de :
1. **Créer** une carte de visite numérique personnalisée avec aperçu en direct.
2. **Partager** cette carte via un **QR Code dynamique haute résolution**, un lien court/compressé ou le partage natif mobile (`Web Share API`).
3. **Afficher** une page de profil élégante au scan du QR Code (style Apple Wallet / Linktree Pro).
4. **Enregistrer** le contact en 1 clic sur **iOS (Safari)** et **Android (Chrome / Samsung Internet)** via un fichier `.vcf` (vCard 3.0) 100 % conforme et compatible avec les fiches natives.

---

## 2. Architecture Technique & Contraintes "Zero-Backend"

### 2.1 Stack Recommandée
* **Frontend :** HTML5 / CSS3 (Tailwind CSS) / JavaScript ES6+ (ou React + Vite + Tailwind CSS).
* **Compression d'URL :** `lz-string` (indispensable pour compresser le JSON dans le hash `#data=...` afin de garder un QR Code peu dense et très facile à scanner).
* **Génération QR Code :** `qrcode` / `qr-code-styling` (support SVG/PNG haute définition, niveau de correction d'erreur `M` ou `Q`).
* **Icônes :** Lucide Icons ou Heroicons.

### 2.2 Gestion Critique de la Photo de Profil (Limite de taille d'URL & QR Code)
> [!IMPORTANT]
> Un QR Code standard ne peut contenir qu'environ **2 000 à 2 900 caractères** maximum (et devient difficile à scanner au-delà de 800 caractères). Une photo en Base64 ne doit **jamais** être injectée brute dans le QR Code si elle dépasse quelques centaines d'octets.

* **Option A (Recommandée pour le QR Code) :** Saisie d'une URL d'image externe (LinkedIn, Gravatar, Imgur, GitHub, etc.).
* **Option B (Upload local optimisé) :** Si l'utilisateur téléverse une photo :
  * Redimensionnement automatique via `<canvas>` en miniature ultra-compressée (WebP/JPEG) pour le stockage local (`localStorage`) et l'export `.vcf` direct.
  * Dans le lien du QR Code (`#data=...`), n'inclure que les métadonnées textuelles + URL d'avatar public afin de garantir un QR Code léger et scannable instantanément.

---

## 3. Fonctionnalités Détaillées

### 3.1 Vue 1 : Éditeur de Carte (Mode Création)
Interface divisée en deux colonnes sur Desktop (Formulaire à gauche, Aperçu iPhone en direct + QR Code à droite) et empilée avec onglets sur Mobile :

* **Identité :**
  * Prénom (`firstName`) — *obligatoire*
  * Nom (`lastName`) — *obligatoire*
  * Fonction / Titre professionnel (`jobTitle`)
  * Entreprise / Organisation (`organization`)
  * Bio courte / Accroche (`bio`, max 120 caractères)
* **Coordonnées :**
  * Téléphone principal (`phone`, avec formatage international ex: `+225 ...` ou `+33 ...`)
  * WhatsApp (`whatsapp`, optionnel — ouvre `https://wa.me/...`)
  * Email professionnel (`email`)
  * Localisation / Ville (`location`, optionnel)
* **Liens & Réseaux :**
  * LinkedIn (`linkedinUrl`)
  * Portfolio / Site Web (`portfolioUrl`)
  * GitHub / X / Instagram (optionnels)
* **Personnalisation Visuelle :**
  * Photo de profil (URL ou Upload redimensionné)
  * Thème de couleur (Couleur d'accentuation : Bleu Royal, Émeraude, Violet, Or/Noir, Minimaliste)
  * Mode Clair / Sombre automatique ou forcé
* **Outils d'Export & Partage :**
  * Aperçu du QR Code mis à jour en temps réel.
  * Bouton **"Télécharger le QR Code (PNG HD & SVG)"**.
  * Bouton **"Copier le lien du profil"** (avec feedback visuel "Copié !").
  * Bouton **"Tester le fichier .vcf"** directement depuis l'éditeur.
  * Sauvegarde automatique du brouillon dans `localStorage`.

---

### 3.2 Vue 2 : Page de Profil Publique (Mode Scan / Visiteur)
Déclenchée automatiquement lorsque l'URL contient `?data=...` ou `#data=...` :

* **En-tête (Header) :**
  * Bannière dégradée selon la couleur d'accentuation choisie.
  * Avatar circulaire avec bordure et badge de vérification/statut.
  * Nom complet (`Prénom Nom`), Fonction, Entreprise et Ville.
  * Bio courte.
* **Action Principale (CTA Hero) :**
  * Bouton proéminent **"Enregistrer dans mes contacts"** (avec icône `UserPlus` et animation subtile).
  * Option activable par le créateur (`autoDownload=1`) : déclenche le téléchargement du `.vcf` automatiquement **800 ms** après l'ouverture de la page, tout en gardant le bouton visible en fallback.
* **Grille d'Actions Rapides :**
  * **Appeler** (`tel:...`)
  * **WhatsApp** (`https://wa.me/...`)
  * **Email** (`mailto:...`)
  * **Partager la carte** (via `navigator.share` sur mobile)
* **Liste des Liens Externes (Style Linktree / Apple Wallet) :**
  * Carte cliquable **LinkedIn** avec aperçu du domaine.
  * Carte cliquable **Portfolio / Site Web**.
* **Pied de page discret :**
  * Bouton *"Créer ma propre carte de visite gratuitement"* (ramène à l'éditeur vierge).

---

## 4. Spécification Technique vCard 3.0 (Compatibilité iOS & Android)

Pour que **Safari (iOS)** ouvre directement la fiche native *"Ajouter aux contacts"* avec les bons libellés de liens (LinkedIn, Portfolio) et que **Android** gère parfaitement les accents et caractères spéciaux :

1. **Fin de ligne obligatoire :** Utiliser impérativement `\r\n` (CRLF) conformément à la RFC 2426.
2. **Encodage UTF-8 & Syntaxe Apple (`ITEM1`, `ITEM2`) :** Sur iOS, `URL;TYPE=LinkedIn:` ignore souvent le label. L'utilisation de la syntaxe groupée `ITEM1.URL` + `ITEM1.X-ABLabel` affiche proprement **"LinkedIn"** et **"Portfolio"** dans l'application Contacts d'Apple tout en restant 100 % compatible Android.

### Format `.vcf` exact à générer :
```text
BEGIN:VCARD
VERSION:3.0
N;CHARSET=UTF-8:[Nom];[Prénom];;;
FN;CHARSET=UTF-8:[Prénom] [Nom]
ORG;CHARSET=UTF-8:[Entreprise]
TITLE;CHARSET=UTF-8:[Fonction]
TEL;TYPE=CELL,VOICE,PREF:[Téléphone]
EMAIL;TYPE=WORK,INTERNET,PREF:[Email]
ADR;TYPE=WORK;CHARSET=UTF-8:;;[Ville];;;;
NOTE;CHARSET=UTF-8:[Bio]
ITEM1.URL:[Lien LinkedIn]
ITEM1.X-ABLabel:LinkedIn
ITEM2.URL:[Lien Portfolio]
ITEM2.X-ABLabel:Portfolio
PHOTO;ENCODING=b;TYPE=JPEG:[Base64_Sans_Prefixe_Optionnel]
END:VCARD
```

### Déclenchement du téléchargement cross-platform :
* Créer un `Blob` avec le type MIME `text/vcard;charset=utf-8`.
* Sur iOS Safari, utiliser une URL de données (`data:text/vcard;charset=utf-8,` + `encodeURIComponent(vcardString)`) ou un lien `<a download="Prenom_Nom.vcf">` déclenché au clic pour ouvrir nativement la feuille de contact iOS sans blocage popup.

---

## 5. Expérience Utilisateur (UX/UI) & Design System
* **Esthétique :** Glassmorphism subtil (`backdrop-blur`), ombres douces, typographie moderne (`Inter` ou `Plus Jakarta Sans`), coins arrondis (`rounded-2xl` / `rounded-3xl`).
* **Responsive :**
  * Sur mobile (vue scan) : Conteneur centré `max-w-md` plein écran, boutons larges (`min-h-[48px]`) adaptés à l'utilisation au pouce.
  * Sur ordinateur (vue éditeur) : Maquette interactive d'un smartphone en temps réel à droite du formulaire.
* **Validation & Feedback :**
  * Validation en temps réel du format email, des URLs (`https://` ajouté automatiquement si omis) et du numéro de téléphone.
  * Toast notifications lors de la copie du lien ou du téléchargement du QR Code.
