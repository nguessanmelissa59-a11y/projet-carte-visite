# EVC Melissa

Application web avec backend Node.js et SQLite permettant de generer et gerer des cartes de visite numeriques (vCard 3.0 RFC 2426) via des QR Codes dynamiques courts (`/c/:slug`).

## Architecture du projet

```text
projet_carte_visite/
├── .agents/
│   └── skills/
│       ├── clean-architecture-standards/
│       │   └── SKILL.md
│       └── frontend-editorial-design/
│           └── SKILL.md
├── assets/
│   └── css/
│       └── styles.css
├── backend/
│   ├── config/
│   │   └── env.js
│   ├── controllers/
│   │   └── card.controller.js
│   ├── db/
│   │   └── repository.js
│   ├── services/
│   │   └── vcard-builder.js
│   └── server.js
├── docs/
│   ├── git-et-automatisation.md
│   ├── prd.md
│   └── technologies.md
├── scripts/
│   ├── auto-push.ps1
│   └── push.ps1
├── src/
│   ├── config/
│   │   └── constants.js
│   ├── services/
│   │   ├── api.js
│   │   ├── storage.js
│   │   ├── url-codec.js
│   │   └── vcard.js
│   ├── ui/
│   │   ├── profile-card.js
│   │   └── qr-view.js
│   └── main.js
├── AGENTS.md
├── README.md
├── index.html
└── package.json
```

## Demarrage du serveur (Backend + Frontend)

```powershell
npm start
```

Le serveur demarre sur `http://localhost:3000` et affiche egalement l'adresse IP reseau locale (`http://192.168.x.x:3000`) utilisee automatiquement dans le QR Code pour permettre le scan direct depuis un smartphone connecte au meme Wi-Fi.

## Configuration (`.env`)

Copier `.env.example` en `.env` a la racine du projet, renseigner les valeurs, puis relancer `npm start`. Le fichier `.env` est lu au demarrage, ignore par Git et jamais servi par le serveur. Une variable deja definie dans le terminal garde la priorite.

Apres un `git pull` ou sur une nouvelle machine : `npm install` (une dependance : `nodemailer`, pour l'envoi SMTP).

### Envoi des codes par e-mail

Sans configuration, le code est affiche dans la console du serveur et dans la page (mode local). Pour l'envoyer reellement depuis une adresse Gmail :

1. Activer la validation en deux etapes sur le compte Google expediteur.
2. Creer un mot de passe d'application : <https://myaccount.google.com/apppasswords>.
3. Dans `.env` :

```text
SMTP_USER=votre.adresse@gmail.com
SMTP_PASS=mot de passe d'application (16 lettres)
```

Des que ces deux valeurs sont presentes, le code n'apparait plus ni dans la page ni dans la console.

### Connexion avec Google

1. Google Cloud Console > API et services > Ecran de consentement OAuth : type « Externe », puis publier l'application (ou ajouter les adresses de test).
2. Identifiants > Creer des identifiants > ID client OAuth > « Application Web ».
3. URI de redirection autorisee : `http://localhost:3000/api/auth/google/callback`.
4. Dans `.env` :

```text
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

Le bouton « Continuer avec Google » apparait alors sur `/auth` et `/register`. Il n'est affiche que sur l'adresse declaree chez Google : `http://localhost:3000` en local, pas l'adresse IP du Wi-Fi (Google refuse les adresses IP privees). En ligne, declarer l'URI `https://votre-domaine/api/auth/google/callback` et la reporter dans `GOOGLE_REDIRECT_URI`.

## Tests

```powershell
npm test
node tests/test-ui-contract.mjs
```

## Admin React (`/admin`)

Interface d'administration (stats, cartes, utilisateurs / roles) reservee aux comptes `admin`.

1. Definir les e-mails bootstrap (obligatoire pour le premier admin) :

```powershell
$env:ADMIN_EMAILS="toi@exemple.com"
```

Ou renseigner `ADMIN_EMAILS` dans le fichier `.env` (voir Configuration).

2. Construire le front admin :

```powershell
npm run admin:install
npm run admin:build
```

3. Ouvrir `http://localhost:3000/admin` apres connexion (code OTP ou mot de passe) avec un e-mail listé dans `ADMIN_EMAILS`.

Dev hot-reload admin (proxy API vers le port 3000) :

```powershell
npm run admin:dev
```

## Synchronisation Git

* Envoi ponctuel : `.\scripts\push.ps1 "description"`
* Surveillance continue : `.\scripts\auto-push.ps1`
