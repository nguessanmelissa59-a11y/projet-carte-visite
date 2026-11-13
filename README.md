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

## Admin React (`/admin`)

Interface d'administration (stats, cartes, utilisateurs / roles) reservee aux comptes `admin`.

1. Definir les e-mails bootstrap (obligatoire pour le premier admin) :

```powershell
$env:ADMIN_EMAILS="toi@exemple.com"
```

Ou copier `.env.example` et exporter les variables avant `npm start`.

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
