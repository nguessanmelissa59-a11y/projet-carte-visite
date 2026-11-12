# vCard Studio

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

## Synchronisation Git

* Envoi ponctuel : `.\scripts\push.ps1 "description"`
* Surveillance continue : `.\scripts\auto-push.ps1`
